import { z } from "zod";
import type { Ctx } from "../api.js";

function stdGet(ctx: Ctx, name: string, service: string, desc: string, defaultFields: string[]) {
  const { server, api, fmt } = ctx;
  server.registerTool(name, {
    description: desc,
    inputSchema: {
      campaignIds: z.array(z.number()).optional().describe("Filter by campaign IDs"),
      adGroupIds: z.array(z.number()).optional().describe("Filter by ad group IDs"),
      ids: z.array(z.number()).optional().describe("Filter by IDs"),
      fieldNames: z.array(z.string()).default(defaultFields),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ campaignIds, adGroupIds, ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (campaignIds?.length) sc.CampaignIds = campaignIds;
    if (adGroupIds?.length) sc.AdGroupIds = adGroupIds;
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api(service, "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });
}

export function register(ctx: Ctx): void {
  const { server, api, fmt, ids, json } = ctx;

  // ==================== BID MODIFIERS ====================

  server.registerTool("bid_modifiers_get", {
    description: "Get bid modifiers (adjustments) for campaigns or ad groups",
    inputSchema: {
      campaignIds: z.array(z.number()).optional(),
      adGroupIds: z.array(z.number()).optional(),
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "CampaignId", "AdGroupId", "Type", "Level"]),
      levels: z.array(z.enum(["CAMPAIGN", "AD_GROUP"])).optional(),
      types: z.array(z.string()).optional(),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ campaignIds, adGroupIds, ids: fIds, fieldNames, levels, types, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (campaignIds?.length) sc.CampaignIds = campaignIds;
    if (adGroupIds?.length) sc.AdGroupIds = adGroupIds;
    if (fIds?.length) sc.Ids = fIds;
    if (levels?.length) sc.Levels = levels;
    if (types?.length) sc.Types = types;
    return fmt(await api("bidmodifiers", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("bid_modifiers_add", "bidmodifiers", "add", "Add bid modifiers.", "BidModifiers",
    'JSON array. Example: [{"CampaignId":123,"DemographicsAdjustment":{"Gender":"FEMALE","Age":"AGE_25_34","BidModifier":120}}]');
  json("bid_modifiers_set", "bidmodifiers", "set", "Update bid modifier coefficients.", "BidModifiers",
    'JSON array. Example: [{"Id":123,"BidModifier":150}]');
  ids("bid_modifiers_delete", "bidmodifiers", "delete", "Delete bid modifiers by IDs", "Modifier IDs");

  // ==================== AUDIENCE TARGETS ====================

  stdGet(ctx, "audience_targets_get", "audiencetargets",
    "Get audience targeting conditions",
    ["Id", "AdGroupId", "CampaignId", "RetargetingListId", "State"]);

  json("audience_targets_add", "audiencetargets", "add", "Add audience targets.", "AudienceTargets",
    'JSON array. Example: [{"AdGroupId":123,"RetargetingListId":456}]');
  ids("audience_targets_delete", "audiencetargets", "delete", "Delete audience targets", "Target IDs");
  ids("audience_targets_suspend", "audiencetargets", "suspend", "Suspend audience targets", "Target IDs");
  ids("audience_targets_resume", "audiencetargets", "resume", "Resume audience targets", "Target IDs");
  json("audience_targets_set_bids", "audiencetargets", "setBids", "Set bids for audience targets.", "Bids",
    'JSON array. Example: [{"Id":123,"SearchBid":5000000}]');

  // ==================== RETARGETING LISTS ====================

  server.registerTool("retargeting_lists_get", {
    description: "Get retargeting/audience lists",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Name", "Type", "IsAvailable", "Description", "Rules"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api("retargetinglists", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("retargeting_lists_add", "retargetinglists", "add", "Create retargeting lists.", "RetargetingLists",
    'JSON array. Example: [{"Name":"List","Rules":[{"Operator":"ALL","Goals":[{"GoalId":123,"GoalType":"GOAL"}]}]}]');
  json("retargeting_lists_update", "retargetinglists", "update", "Update retargeting lists.", "RetargetingLists",
    'JSON array. Each must have Id. Example: [{"Id":123,"Name":"Updated"}]');
  ids("retargeting_lists_delete", "retargetinglists", "delete", "Delete retargeting lists", "List IDs");

  // ==================== NEGATIVE KEYWORD SHARED SETS ====================

  server.registerTool("negative_keywords_get", {
    description: "Get shared negative keyword sets",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Name", "NegativeKeywords"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api("negativekeywordsharedsets", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("negative_keywords_add", "negativekeywordsharedsets", "add", "Create shared negative keyword sets.", "NegativeKeywordSharedSets",
    'JSON array. Example: [{"Name":"Set","NegativeKeywords":["minus"]}]');
  json("negative_keywords_update", "negativekeywordsharedsets", "update", "Update shared negative keyword sets.", "NegativeKeywordSharedSets",
    'JSON array. Each must have Id. Example: [{"Id":123,"NegativeKeywords":["updated"]}]');
  ids("negative_keywords_delete", "negativekeywordsharedsets", "delete", "Delete shared negative keyword sets", "Set IDs");

  // ==================== DYNAMIC TEXT AD TARGETS ====================

  stdGet(ctx, "dynamic_text_ad_targets_get", "dynamictextadtargets",
    "Get dynamic text ad targets (webpage-based)",
    ["Id", "AdGroupId", "CampaignId", "Name", "Bid", "State"]);

  json("dynamic_text_ad_targets_add", "dynamictextadtargets", "add", "Add dynamic text ad targets.", "Webpages",
    'JSON array. Example: [{"AdGroupId":123,"Name":"Pages","Conditions":[{"Operand":"PAGE_URL","Operator":"URL_CONTAINS","Arguments":["example.com"]}]}]');
  ids("dynamic_text_ad_targets_delete", "dynamictextadtargets", "delete", "Delete dynamic text ad targets", "Target IDs");
  ids("dynamic_text_ad_targets_suspend", "dynamictextadtargets", "suspend", "Suspend dynamic text ad targets", "Target IDs");
  ids("dynamic_text_ad_targets_resume", "dynamictextadtargets", "resume", "Resume dynamic text ad targets", "Target IDs");
  json("dynamic_text_ad_targets_set_bids", "dynamictextadtargets", "setBids", "Set bids for dynamic text ad targets.", "Bids",
    'JSON array. Example: [{"Id":123,"Bid":5000000}]');

  // ==================== DYNAMIC FEED AD TARGETS ====================

  stdGet(ctx, "dynamic_feed_ad_targets_get", "dynamicfeedadtargets",
    "Get dynamic feed ad targets (feed-based)",
    ["Id", "AdGroupId", "CampaignId", "Name", "Bid", "State"]);

  json("dynamic_feed_ad_targets_add", "dynamicfeedadtargets", "add", "Add dynamic feed ad targets.", "Webpages",
    'JSON array. Example: [{"AdGroupId":123,"Name":"Feed","Conditions":[{"Operand":"OFFER_ID","Operator":"EQUALS_ANY","Arguments":["123"]}]}]');
  ids("dynamic_feed_ad_targets_delete", "dynamicfeedadtargets", "delete", "Delete dynamic feed ad targets", "Target IDs");
  ids("dynamic_feed_ad_targets_suspend", "dynamicfeedadtargets", "suspend", "Suspend dynamic feed ad targets", "Target IDs");
  ids("dynamic_feed_ad_targets_resume", "dynamicfeedadtargets", "resume", "Resume dynamic feed ad targets", "Target IDs");
  json("dynamic_feed_ad_targets_set_bids", "dynamicfeedadtargets", "setBids", "Set bids for dynamic feed ad targets.", "Bids",
    'JSON array. Example: [{"Id":123,"Bid":5000000}]');

  // ==================== SMART AD TARGETS ====================

  stdGet(ctx, "smart_ad_targets_get", "smartadtargets",
    "Get targeting filters for smart banner campaigns",
    ["Id", "AdGroupId", "CampaignId", "Name", "State"]);

  json("smart_ad_targets_add", "smartadtargets", "add", "Add smart ad targeting filters.", "SmartAdTargets",
    'JSON array. Example: [{"AdGroupId":123,"Name":"Filter","Conditions":[...]}]');
  json("smart_ad_targets_update", "smartadtargets", "update", "Update smart ad targeting filters.", "SmartAdTargets",
    'JSON array. Each must have Id. Example: [{"Id":123,"Name":"Updated"}]');
  ids("smart_ad_targets_delete", "smartadtargets", "delete", "Delete smart ad targets", "Target IDs");
  ids("smart_ad_targets_suspend", "smartadtargets", "suspend", "Suspend smart ad targets", "Target IDs");
  ids("smart_ad_targets_resume", "smartadtargets", "resume", "Resume smart ad targets", "Target IDs");
  json("smart_ad_targets_set_bids", "smartadtargets", "setBids", "Set bids for smart ad targets.", "Bids",
    'JSON array. Example: [{"Id":123,"Bid":5000000}]');
}
