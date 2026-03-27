import { z } from "zod";
import type { Ctx } from "../api.js";

export function register(ctx: Ctx): void {
  const { server, api, fmt, ids, json } = ctx;

  // ==================== CAMPAIGNS ====================

  server.registerTool("campaigns_get", {
    description: "Get campaigns list with filtering and field selection.",
    inputSchema: {
      ids: z.array(z.number()).optional().describe("Filter by campaign IDs"),
      states: z.array(z.enum(["ARCHIVED", "CONVERTED", "ENDED", "OFF", "ON", "SUSPENDED"])).optional().describe("Filter by states"),
      statuses: z.array(z.enum(["ACCEPTED", "DRAFT", "MODERATION", "REJECTED"])).optional().describe("Filter by statuses"),
      types: z.array(z.enum(["TEXT_CAMPAIGN", "DYNAMIC_TEXT_CAMPAIGN", "MOBILE_APP_CAMPAIGN", "CPM_BANNER_CAMPAIGN", "SMART_CAMPAIGN", "UNIFIED_CAMPAIGN"])).optional().describe("Filter by campaign types"),
      fieldNames: z.array(z.string()).default(["Id", "Name", "State", "Status", "Type", "DailyBudget", "Statistics"]).describe("Fields to return"),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: filterIds, states, statuses, types, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (filterIds?.length) sc.Ids = filterIds;
    if (states?.length) sc.States = states;
    if (statuses?.length) sc.Statuses = statuses;
    if (types?.length) sc.Types = types;
    return fmt(await api("campaigns", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("campaigns_add", "campaigns", "add", "Create new campaigns.", "Campaigns",
    'JSON array. Example: [{"Name":"Campaign","StartDate":"2025-01-01","TextCampaign":{...}}]');
  json("campaigns_update", "campaigns", "update", "Update campaign parameters (name, budget, negative keywords).", "Campaigns",
    'JSON array. Each must have Id. Example: [{"Id":123,"Name":"New name"}]');
  ids("campaigns_delete", "campaigns", "delete", "Delete campaigns by IDs", "Campaign IDs");
  ids("campaigns_suspend", "campaigns", "suspend", "Suspend (pause) campaigns by IDs", "Campaign IDs");
  ids("campaigns_resume", "campaigns", "resume", "Resume suspended campaigns by IDs", "Campaign IDs");
  ids("campaigns_archive", "campaigns", "archive", "Archive campaigns by IDs", "Campaign IDs");
  ids("campaigns_unarchive", "campaigns", "unarchive", "Unarchive campaigns by IDs", "Campaign IDs");

  // ==================== AD GROUPS ====================

  server.registerTool("adgroups_get", {
    description: "Get ad groups with filtering by campaign or group IDs",
    inputSchema: {
      campaignIds: z.array(z.number()).optional().describe("Filter by campaign IDs"),
      ids: z.array(z.number()).optional().describe("Filter by ad group IDs"),
      fieldNames: z.array(z.string()).default(["Id", "Name", "CampaignId", "Status", "Type", "RegionIds"]).describe("Fields to return"),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ campaignIds, ids: filterIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (campaignIds?.length) sc.CampaignIds = campaignIds;
    if (filterIds?.length) sc.Ids = filterIds;
    return fmt(await api("adgroups", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("adgroups_add", "adgroups", "add", "Create new ad groups.", "AdGroups",
    'JSON array. Example: [{"Name":"Group","CampaignId":123,"RegionIds":[225]}]');
  json("adgroups_update", "adgroups", "update", "Update ad group parameters (name, negative keywords, regions).", "AdGroups",
    'JSON array. Each must have Id. Example: [{"Id":123,"NegativeKeywords":{"Items":["minus"]}}]');
  ids("adgroups_delete", "adgroups", "delete", "Delete ad groups by IDs", "Ad group IDs");
}
