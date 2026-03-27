import { z } from "zod";
import type { Ctx } from "../api.js";

export function register(ctx: Ctx): void {
  const { server, api, fmt, ids, json } = ctx;

  // ==================== KEYWORDS ====================

  server.registerTool("keywords_get", {
    description: "Get keywords with filtering by campaign, ad group, or keyword IDs",
    inputSchema: {
      campaignIds: z.array(z.number()).optional().describe("Filter by campaign IDs"),
      adGroupIds: z.array(z.number()).optional().describe("Filter by ad group IDs"),
      ids: z.array(z.number()).optional().describe("Filter by keyword IDs"),
      fieldNames: z.array(z.string()).default(["Id", "Keyword", "AdGroupId", "CampaignId", "Bid", "State", "Status"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ campaignIds, adGroupIds, ids: filterIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (campaignIds?.length) sc.CampaignIds = campaignIds;
    if (adGroupIds?.length) sc.AdGroupIds = adGroupIds;
    if (filterIds?.length) sc.Ids = filterIds;
    return fmt(await api("keywords", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("keywords_add", "keywords", "add", "Add keywords to ad groups.", "Keywords",
    'JSON array. Example: [{"Keyword":"buy flowers","AdGroupId":123}]');
  json("keywords_update", "keywords", "update", "Update keyword text. Each must have Id.", "Keywords",
    'JSON array. Example: [{"Id":123,"Keyword":"new keyword"}]');
  ids("keywords_delete", "keywords", "delete", "Delete keywords by IDs", "Keyword IDs");
  ids("keywords_suspend", "keywords", "suspend", "Suspend keywords by IDs", "Keyword IDs");
  ids("keywords_resume", "keywords", "resume", "Resume keywords by IDs", "Keyword IDs");

  // ==================== KEYWORD BIDS ====================

  server.registerTool("keyword_bids_get", {
    description: "Get keyword bids for campaigns or ad groups",
    inputSchema: {
      campaignIds: z.array(z.number()).optional().describe("Filter by campaign IDs"),
      adGroupIds: z.array(z.number()).optional().describe("Filter by ad group IDs"),
      keywordIds: z.array(z.number()).optional().describe("Filter by keyword IDs"),
      fieldNames: z.array(z.string()).default(["KeywordId", "AdGroupId", "CampaignId", "Bid", "ContextBid"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ campaignIds, adGroupIds, keywordIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (campaignIds?.length) sc.CampaignIds = campaignIds;
    if (adGroupIds?.length) sc.AdGroupIds = adGroupIds;
    if (keywordIds?.length) sc.KeywordIds = keywordIds;
    return fmt(await api("keywordbids", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("keyword_bids_set", "keywordbids", "set", "Set keyword bids.", "KeywordBids",
    'JSON array. Example: [{"KeywordId":123,"SearchBid":3000000,"NetworkBid":1000000}] (micros: 1 rub = 1000000)');
  json("keyword_bids_set_auto", "keywordbids", "setAuto", "Set auto bidding strategies for keywords.", "KeywordBids",
    'JSON array. Example: [{"CampaignId":123,"Bid":{"SearchBid":5000000}}]');

  // ==================== BIDS (legacy) ====================

  server.registerTool("bids_get", {
    description: "Get current bids for keywords (legacy Bids service)",
    inputSchema: {
      campaignIds: z.array(z.number()).optional().describe("Filter by campaign IDs"),
      adGroupIds: z.array(z.number()).optional().describe("Filter by ad group IDs"),
      keywordIds: z.array(z.number()).optional().describe("Filter by keyword IDs"),
      fieldNames: z.array(z.string()).default(["KeywordId", "AdGroupId", "CampaignId", "Bid", "ContextBid", "CompetitorsBids"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ campaignIds, adGroupIds, keywordIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (campaignIds?.length) sc.CampaignIds = campaignIds;
    if (adGroupIds?.length) sc.AdGroupIds = adGroupIds;
    if (keywordIds?.length) sc.KeywordIds = keywordIds;
    return fmt(await api("bids", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("bids_set", "bids", "set", "Set manual bids (legacy).", "Bids",
    'JSON array. Example: [{"KeywordId":123,"Bid":3000000,"ContextBid":1000000}]');
  json("bids_set_auto", "bids", "setAuto", "Set auto bids (legacy).", "Bids",
    'JSON array. Example: [{"CampaignId":123,"SearchBid":5000000}]');

  // ==================== KEYWORDS RESEARCH ====================

  server.registerTool("keywords_research_deduplicate", {
    description: "Remove duplicate keywords from a list.",
    inputSchema: { keywords: z.array(z.string()).describe("Keywords to deduplicate") },
  }, async ({ keywords }) => fmt(await api("keywordsresearch", "deduplicate", { Keywords: keywords })));

  server.registerTool("keywords_research_has_search_volume", {
    description: "Check if keywords have search volume (impressions forecast).",
    inputSchema: {
      keywords: z.array(z.string()).describe("Keywords to check"),
      regionIds: z.array(z.number()).optional().describe("Region IDs"),
    },
  }, async ({ keywords, regionIds }) => {
    const p: Record<string, unknown> = { Keywords: keywords };
    if (regionIds?.length) p.RegionIds = regionIds;
    return fmt(await api("keywordsresearch", "hasSearchVolume", p));
  });
}
