import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiCall, createReportsCall, formatResult, createCtx } from "./api.js";
import type { Config } from "./config.js";

// --- Mock fetch globally ---
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    token: "test-token-123",
    sandbox: false,
    clientLogin: "",
    language: "ru",
    baseUrl: "https://api.direct.yandex.com/json/v5",
    reportsUrl: "https://api.direct.yandex.com/json/v5/reports",
    ...overrides,
  };
}

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function textResponse(text: string, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
    json: () => Promise.reject(new Error("not json")),
    text: () => Promise.resolve(text),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================
// formatResult
// ===========================

describe("formatResult", () => {
  it("wraps data in MCP response format", () => {
    const result = formatResult({ foo: "bar" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(JSON.parse(result.content[0].text)).toEqual({ foo: "bar" });
  });

  it("handles null", () => {
    const result = formatResult(null);
    expect(JSON.parse(result.content[0].text)).toBeNull();
  });

  it("handles arrays", () => {
    const result = formatResult([1, 2, 3]);
    expect(JSON.parse(result.content[0].text)).toEqual([1, 2, 3]);
  });

  it("handles primitives", () => {
    const result = formatResult("hello");
    expect(JSON.parse(result.content[0].text)).toBe("hello");
  });
});

// ===========================
// createApiCall
// ===========================

describe("createApiCall", () => {
  it("sends POST with correct headers and body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(
      { result: { Campaigns: [] } },
      200,
      { Units: "10/20/30", RequestId: "req-123" },
    ));

    const api = createApiCall(makeConfig());
    await api("campaigns", "get", { FieldNames: ["Id"] });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.direct.yandex.com/json/v5/campaigns");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ method: "get", params: { FieldNames: ["Id"] } });
    expect(opts.headers["Authorization"]).toBe("Bearer test-token-123");
  });

  it("includes Client-Login header when set", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: {} }, 200, { Units: "1/2/3" }));
    const api = createApiCall(makeConfig({ clientLogin: "my-client" }));
    await api("campaigns", "get", {});
    expect(mockFetch.mock.calls[0][1].headers["Client-Login"]).toBe("my-client");
  });

  it("returns object with _meta for object responses", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(
      { Campaigns: [{ Id: 1 }] },
      200,
      { Units: "10/20/30", RequestId: "req-456" },
    ));

    const api = createApiCall(makeConfig());
    const result = await api("campaigns", "get", {}) as Record<string, unknown>;
    expect(result.Campaigns).toEqual([{ Id: 1 }]);
    expect(result._meta).toEqual({ units: "10/20/30", requestId: "req-456", sandbox: false });
  });

  it("uses _directMeta when response already has _meta key", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(
      { _meta: "existing", data: 42 },
      200,
      { Units: "1/2/3", RequestId: "r-1" },
    ));

    const api = createApiCall(makeConfig());
    const result = await api("test", "get", {}) as Record<string, unknown>;
    expect(result._meta).toBe("existing");
    expect(result._directMeta).toEqual({ units: "1/2/3", requestId: "r-1", sandbox: false });
  });

  it("wraps array response in result key", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(
      [1, 2, 3],
      200,
      { Units: "1/2/3" },
    ));

    const api = createApiCall(makeConfig());
    const result = await api("test", "get", {}) as Record<string, unknown>;
    expect(result.result).toEqual([1, 2, 3]);
    expect(result._meta).toBeDefined();
  });

  it("wraps primitive response in result key", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(42, 200, { Units: "1/2/3" }));
    const api = createApiCall(makeConfig());
    const result = await api("test", "get", {}) as Record<string, unknown>;
    expect(result.result).toBe(42);
  });

  it("throws sanitized error on HTTP failure", async () => {
    mockFetch.mockResolvedValueOnce(textResponse("error body here", 400, { RequestId: "err-1" }));
    const api = createApiCall(makeConfig());
    await expect(api("campaigns", "get", {}))
      .rejects.toThrow("API error 400 on campaigns.get (RequestId: err-1)");
  });

  it("truncates long error bodies to 500 chars in stderr", async () => {
    const longBody = "x".repeat(600);
    mockFetch.mockResolvedValueOnce(textResponse(longBody, 500, { RequestId: "err-2" }));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const api = createApiCall(makeConfig());
    await expect(api("test", "method", {})).rejects.toThrow();

    const logged = consoleSpy.mock.calls.find((c) => String(c[0]).includes("[Direct API]"));
    expect(logged).toBeDefined();
    expect(String(logged![0])).toContain("...");
  });

  it("throws on non-JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      headers: { get: () => null },
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
      text: () => Promise.resolve("<html>oops</html>"),
    });
    const api = createApiCall(makeConfig());
    await expect(api("test", "get", {})).rejects.toThrow("Non-JSON response");
  });

  it("uses sandbox URL when configured", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 200, { Units: "1/2/3" }));
    const api = createApiCall(makeConfig({
      sandbox: true,
      baseUrl: "https://api-sandbox.direct.yandex.com/json/v5",
    }));
    await api("campaigns", "get", {});
    expect(mockFetch.mock.calls[0][0]).toContain("api-sandbox");
  });
});

// ===========================
// createReportsCall
// ===========================

describe("createReportsCall", () => {
  const baseParams = {
    reportName: "Test Report",
    reportType: "CAMPAIGN_PERFORMANCE_REPORT",
    dateRangeType: "LAST_7_DAYS",
    fieldNames: ["CampaignName", "Impressions"],
  };

  it("returns TSV on status 200", async () => {
    mockFetch.mockResolvedValueOnce(textResponse("CampaignName\tImpressions\nMy Campaign\t100", 200));
    const reports = createReportsCall(makeConfig());
    const result = await reports(baseParams);
    expect(result).toContain("CampaignName");
    expect(result).toContain("100");
  });

  it("retries on status 201 with retryIn header", async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(textResponse("", 201, { retryIn: "1" }))
      .mockResolvedValueOnce(textResponse("data\t1", 200));

    const reports = createReportsCall(makeConfig());
    const promise = reports(baseParams);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;
    expect(result).toBe("data\t1");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("retries on status 202", async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(textResponse("", 202, {}))
      .mockResolvedValueOnce(textResponse("result", 200));

    const reports = createReportsCall(makeConfig());
    const promise = reports(baseParams);
    await vi.advanceTimersByTimeAsync(10000);
    const result = await promise;
    expect(result).toBe("result");
    vi.useRealTimers();
  });

  it("uses default delay=5 when retryIn header is empty", async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(textResponse("", 201, {}))
      .mockResolvedValueOnce(textResponse("ok", 200));

    const reports = createReportsCall(makeConfig());
    const promise = reports(baseParams);
    await vi.advanceTimersByTimeAsync(10000);
    await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("uses default delay=5 when retryIn is non-numeric", async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(textResponse("", 201, { retryIn: "abc" }))
      .mockResolvedValueOnce(textResponse("ok", 200));

    const reports = createReportsCall(makeConfig());
    const promise = reports(baseParams);
    await vi.advanceTimersByTimeAsync(10000);
    await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("caps retryIn at 300 seconds", async () => {
    vi.useFakeTimers();
    // Pin Date.now so timeout check never fires
    vi.spyOn(Date, "now").mockReturnValue(1000);

    mockFetch
      .mockResolvedValueOnce(textResponse("", 201, { retryIn: "9999" }))
      .mockResolvedValueOnce(textResponse("ok", 200));

    const reports = createReportsCall(makeConfig());
    const promise = reports(baseParams);
    await vi.advanceTimersByTimeAsync(400_000);
    await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("throws sanitized error on non-retryable status", async () => {
    mockFetch.mockResolvedValue(textResponse("bad request details", 400));
    const reports = createReportsCall(makeConfig());
    await expect(reports(baseParams)).rejects.toThrow("Reports API error 400");
  });

  it("throws on overall timeout", async () => {
    let nowVal = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      nowVal += 65_000; // each call jumps 65s, second call > 120s total
      return nowVal;
    });

    mockFetch.mockResolvedValue(textResponse("", 201, { retryIn: "0" }));
    // Override setTimeout to not actually wait
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: any) => { fn(); return 0 as any; });

    const reports = createReportsCall(makeConfig());
    await expect(reports(baseParams)).rejects.toThrow("Report timed out");
  });
});

// ===========================
// createCtx — json helper
// ===========================

describe("createCtx json helper", () => {
  it("returns error for empty JSON input", async () => {
    let handler: (args: { data: string }) => Promise<unknown>;
    const mockServer = {
      registerTool: (_name: string, _schema: unknown, fn: typeof handler) => { handler = fn; },
    };
    const api = vi.fn();
    const reports = vi.fn();
    const ctx = createCtx(mockServer as any, api, reports);
    ctx.json("test", "svc", "method", "desc", "param", "desc");

    const result = await handler!({ data: "" }) as any;
    expect(result.content[0].text).toContain("empty JSON");
  });

  it("returns error for invalid JSON", async () => {
    let handler: (args: { data: string }) => Promise<unknown>;
    const mockServer = {
      registerTool: (_name: string, _schema: unknown, fn: typeof handler) => { handler = fn; },
    };
    const api = vi.fn();
    const reports = vi.fn();
    const ctx = createCtx(mockServer as any, api, reports);
    ctx.json("test", "svc", "method", "desc", "param", "desc");

    const result = await handler!({ data: "not json {" }) as any;
    expect(result.content[0].text).toContain("invalid JSON");
    expect(result.content[0].text).not.toContain("Unexpected");
  });

  it("calls API with parsed JSON on valid input", async () => {
    let handler: (args: { data: string }) => Promise<unknown>;
    const mockServer = {
      registerTool: (_name: string, _schema: unknown, fn: typeof handler) => { handler = fn; },
    };
    const api = vi.fn().mockResolvedValue({ success: true });
    const reports = vi.fn();
    const ctx = createCtx(mockServer as any, api, reports);
    ctx.json("test", "svc", "method", "desc", "MyParam", "desc");

    await handler!({ data: '{"key":"value"}' });
    expect(api).toHaveBeenCalledWith("svc", "method", { MyParam: { key: "value" } });
  });
});
