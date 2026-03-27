/** Validated configuration for the Yandex Direct MCP server. */
export interface Config {
  /** OAuth 2.0 Bearer token for Yandex Direct API. */
  token: string;
  /** Whether to use the sandbox API (api-sandbox.direct.yandex.com). */
  sandbox: boolean;
  /** Client login for agency accounts. Empty string for direct advertisers. */
  clientLogin: string;
  /** Response language: "ru", "en", or "uk". */
  language: string;
  /** Base URL for JSON API v5 endpoints. */
  baseUrl: string;
  /** URL for the Reports API endpoint. */
  reportsUrl: string;
}

/**
 * Loads and validates configuration from environment variables.
 * Exits with error code 1 if YANDEX_DIRECT_TOKEN is missing.
 */
export function loadConfig(): Config {
  const token = process.env.YANDEX_DIRECT_TOKEN ?? "";
  const sandbox = process.env.YANDEX_DIRECT_SANDBOX === "true";
  const clientLogin = process.env.YANDEX_DIRECT_CLIENT_LOGIN ?? "";
  const language = process.env.YANDEX_DIRECT_LANGUAGE ?? "ru";

  if (!token) {
    console.error("ERROR: YANDEX_DIRECT_TOKEN is required. Set it in .mcp.json env or ~/.env.keys");
    process.exit(1);
  }

  const base = sandbox
    ? "https://api-sandbox.direct.yandex.com/json/v5"
    : "https://api.direct.yandex.com/json/v5";

  return {
    token,
    sandbox,
    clientLogin,
    language,
    baseUrl: base,
    reportsUrl: `${base}/reports`,
  };
}
