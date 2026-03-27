#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createApiCall, createReportsCall, createCtx } from "./api.js";
import { register as registerCampaigns } from "./tools/campaigns.js";
import { register as registerAds } from "./tools/ads.js";
import { register as registerKeywords } from "./tools/keywords.js";
import { register as registerTargeting } from "./tools/targeting.js";
import { register as registerContent } from "./tools/content.js";
import { register as registerReporting } from "./tools/reporting.js";

async function main() {
  const config = loadConfig();

  const server = new McpServer({ name: "yandex-direct", version: "2.0.0" });
  const api = createApiCall(config);
  const reports = createReportsCall(config);
  const ctx = createCtx(server, api, reports);

  // Register all 110 tools
  registerCampaigns(ctx);    // campaigns (8) + adgroups (4)
  registerAds(ctx);          // ads (9)
  registerKeywords(ctx);     // keywords (6) + keyword bids (3) + bids (3) + research (2)
  registerTargeting(ctx);    // bid modifiers (4) + audience (6) + retargeting (4) + neg kw (4) + dynamic (12) + smart (7)
  registerContent(ctx);      // feeds (4) + images (3) + videos (2) + creatives (2) + extensions (3) + sitelinks (3) + vcards (3) + strategies (5)
  registerReporting(ctx);    // reports (1) + dicts (1) + changes (3) + clients (2) + agency (3) + businesses (1) + turbo (1) + leads (1)

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Yandex Direct MCP server v2.0.0 running (sandbox: ${config.sandbox}). Listening on stdio.`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
