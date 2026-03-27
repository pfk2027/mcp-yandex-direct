import { z } from "zod";
import type { Ctx } from "../api.js";

export function register(ctx: Ctx): void {
  const { server, api, fmt, ids, json } = ctx;

  server.registerTool("ads_get", {
    description: "Get ads with filtering by campaign, ad group, or ad IDs",
    inputSchema: {
      campaignIds: z.array(z.number()).optional().describe("Filter by campaign IDs"),
      adGroupIds: z.array(z.number()).optional().describe("Filter by ad group IDs"),
      ids: z.array(z.number()).optional().describe("Filter by ad IDs"),
      states: z.array(z.enum(["ARCHIVED", "OFF", "OFF_BY_MONITORING", "ON", "SUSPENDED"])).optional().describe("Filter by states"),
      fieldNames: z.array(z.string()).default(["Id", "AdGroupId", "CampaignId", "State", "Status", "Type"]),
      textAdFieldNames: z.array(z.string()).optional().describe("TextAd fields (Title, Title2, Text, Href, etc.)"),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ campaignIds, adGroupIds, ids: filterIds, states, fieldNames, textAdFieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (campaignIds?.length) sc.CampaignIds = campaignIds;
    if (adGroupIds?.length) sc.AdGroupIds = adGroupIds;
    if (filterIds?.length) sc.Ids = filterIds;
    if (states?.length) sc.States = states;
    const params: Record<string, unknown> = { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } };
    if (textAdFieldNames?.length) params.TextAdFieldNames = textAdFieldNames;
    return fmt(await api("ads", "get", params));
  });

  json("ads_add", "ads", "add", "Create new ads.", "Ads",
    'JSON array. Example: [{"AdGroupId":123,"TextAd":{"Title":"Title","Title2":"Title2","Text":"Text","Href":"https://example.com","Mobile":"NO"}}]');
  json("ads_update", "ads", "update", "Update ad parameters (text, links, extensions).", "Ads",
    'JSON array. Each must have Id. Example: [{"Id":123,"TextAd":{"Title":"New title"}}]');
  ids("ads_delete", "ads", "delete", "Delete ads by IDs", "Ad IDs");
  ids("ads_suspend", "ads", "suspend", "Suspend (pause) ads by IDs", "Ad IDs");
  ids("ads_resume", "ads", "resume", "Resume suspended ads by IDs", "Ad IDs");
  ids("ads_archive", "ads", "archive", "Archive ads by IDs", "Ad IDs");
  ids("ads_unarchive", "ads", "unarchive", "Unarchive ads by IDs", "Ad IDs");
  ids("ads_moderate", "ads", "moderate", "Send ads for moderation by IDs", "Ad IDs");
}
