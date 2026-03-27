import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "./config.js";

// --- Types ---

export type ApiCallFn = (service: string, method: string, params: Record<string, unknown>) => Promise<unknown>;

export interface ReportsParams {
  reportName: string;
  reportType: string;
  dateRangeType: string;
  fieldNames: string[];
  dateFrom?: string;
  dateTo?: string;
  filter?: unknown[];
  goals?: number[];
  page?: { limit: number; offset: number };
}

export type ReportsCallFn = (params: ReportsParams) => Promise<string>;

/** Shared context passed to every tool module. */
export interface Ctx {
  /** MCP server instance for registering tools. */
  server: McpServer;
  /** Calls Yandex Direct API v5: `api(service, method, params)`. */
  api: ApiCallFn;
  /** Generates TSV reports via the Reports API with auto-retry. */
  reports: ReportsCallFn;
  /** Wraps data into MCP-compatible `{ content: [{ type: "text", text }] }` JSON response. */
  fmt: typeof formatResult;
  /** Registers a tool that accepts `ids: number[]` and calls `service.method` with `SelectionCriteria: { Ids }`. */
  ids: (name: string, service: string, method: string, desc: string, label?: string) => void;
  /** Registers a tool that accepts a JSON string `data`, parses it with error handling, and calls `service.method` with `{ [param]: parsed }`. */
  json: (name: string, service: string, method: string, desc: string, param: string, jsonDesc: string) => void;
}

// --- Timeout helper ---

const DEFAULT_TIMEOUT_MS = 30_000;
const REPORT_TIMEOUT_MS = 120_000;

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

// --- API Call ---

/**
 * Creates a function that calls Yandex Direct API v5 JSON endpoints.
 * @param cfg - Validated config with token, base URL, etc.
 * @returns Async function: `(service, method, params) => Promise<response>`
 */
export function createApiCall(cfg: Config): ApiCallFn {
  const baseHeaders: Record<string, string> = {
    "Authorization": `Bearer ${cfg.token}`,
    "Content-Type": "application/json; charset=utf-8",
    "Accept-Language": cfg.language,
  };
  if (cfg.clientLogin) baseHeaders["Client-Login"] = cfg.clientLogin;

  return async (service, method, params) => {
    const response = await fetch(`${cfg.baseUrl}/${service}`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({ method, params }),
      keepalive: true,
      signal: withTimeout(DEFAULT_TIMEOUT_MS),
    });

    const units = response.headers.get("Units") ?? "unknown";
    const requestId = response.headers.get("RequestId") ?? "unknown";

    if (!response.ok) {
      const text = await response.text();
      const truncated = text.length > 500 ? text.slice(0, 500) + "..." : text;
      throw new Error(`API error ${response.status}: ${truncated} (RequestId: ${requestId})`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Non-JSON response for ${service}.${method} (RequestId: ${requestId})`);
    }

    const meta = { _meta: { units, requestId, sandbox: cfg.sandbox } };
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return { ...data, ...meta };
    }
    return { result: data, ...meta };
  };
}

// --- Reports Call ---

/**
 * Creates a function that generates TSV reports via Yandex Direct Reports API.
 * Handles async report building (HTTP 201/202) with retry and overall timeout.
 * @param cfg - Validated config with token, reports URL, etc.
 * @returns Async function: `(params) => Promise<TSV string>`
 */
export function createReportsCall(cfg: Config): ReportsCallFn {
  const baseHeaders: Record<string, string> = {
    "Authorization": `Bearer ${cfg.token}`,
    "Content-Type": "application/json; charset=utf-8",
    "Accept-Language": cfg.language,
    "processingMode": "auto",
    "returnMoneyInMicros": "false",
    "skipReportHeader": "true",
    "skipReportSummary": "true",
  };
  if (cfg.clientLogin) baseHeaders["Client-Login"] = cfg.clientLogin;

  return async (params) => {
    const body = JSON.stringify({
      params: {
        SelectionCriteria: { DateFrom: params.dateFrom, DateTo: params.dateTo, Filter: params.filter },
        Goals: params.goals,
        FieldNames: params.fieldNames,
        ReportName: params.reportName,
        ReportType: params.reportType,
        DateRangeType: params.dateRangeType,
        Format: "TSV",
        IncludeVAT: "YES",
        IncludeDiscount: "NO",
        Page: params.page,
      },
    });

    let attempt = 0;
    const startTime = Date.now();

    while (attempt < 10) {
      if (Date.now() - startTime > REPORT_TIMEOUT_MS) {
        throw new Error(`Report timed out after ${Math.round((Date.now() - startTime) / 1000)}s`);
      }

      const response = await fetch(cfg.reportsUrl, {
        method: "POST",
        headers: baseHeaders,
        body,
        keepalive: true,
      });

      if (response.status === 200) return await response.text();

      if (response.status === 201 || response.status === 202) {
        await response.text(); // consume body to prevent leak
        const raw = parseInt(response.headers.get("retryIn") ?? "5", 10);
        const delay = Number.isNaN(raw) ? 5 : Math.max(1, Math.min(raw, 300));
        await new Promise((r) => setTimeout(r, delay * 1000));
        attempt++;
        continue;
      }

      const text = await response.text();
      const truncated = text.length > 500 ? text.slice(0, 500) + "..." : text;
      throw new Error(`Reports API error ${response.status}: ${truncated}`);
    }

    throw new Error("Report generation timed out after max attempts");
  };
}

// --- Helpers ---

/** Wraps any data into MCP tool response format: `{ content: [{ type: "text", text: JSON }] }`. */
export function formatResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Creates the shared context object (`Ctx`) used by all tool modules.
 * Includes the server, API functions, and shorthand helpers for common tool registration patterns.
 * @param server - MCP server instance
 * @param api - API call function from `createApiCall()`
 * @param reports - Reports call function from `createReportsCall()`
 */
export function createCtx(server: McpServer, api: ApiCallFn, reports: ReportsCallFn): Ctx {
  const ids = (name: string, service: string, method: string, desc: string, label = "IDs") => {
    server.registerTool(name, {
      description: desc,
      inputSchema: { ids: z.array(z.number()).describe(label) },
    }, async ({ ids }) => {
      const result = await api(service, method, { SelectionCriteria: { Ids: ids } });
      return formatResult(result);
    });
  };

  const json = (name: string, service: string, method: string, desc: string, param: string, jsonDesc: string) => {
    server.registerTool(name, {
      description: desc,
      inputSchema: { data: z.string().describe(jsonDesc) },
    }, async ({ data }) => {
      if (!data?.trim()) {
        return { content: [{ type: "text" as const, text: "Error: empty JSON input." }] };
      }
      let parsed: unknown;
      try { parsed = JSON.parse(data); } catch (e) {
        return { content: [{ type: "text" as const, text: `Error: invalid JSON — ${e instanceof Error ? e.message : e}` }] };
      }
      const result = await api(service, method, { [param]: parsed });
      return formatResult(result);
    });
  };

  return { server, api, reports, fmt: formatResult, ids, json };
}
