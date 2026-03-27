import { z } from "zod";
import type { Ctx } from "../api.js";

export function register(ctx: Ctx): void {
  const { server, api, fmt, json, ids } = ctx;

  // ==================== REPORTS ====================

  server.registerTool("reports_get", {
    description: "Get statistics report (TSV). Supports 8 report types and flexible date ranges.",
    inputSchema: {
      reportType: z.enum([
        "ACCOUNT_PERFORMANCE_REPORT", "AD_PERFORMANCE_REPORT", "ADGROUP_PERFORMANCE_REPORT",
        "CAMPAIGN_PERFORMANCE_REPORT", "CRITERIA_PERFORMANCE_REPORT", "CUSTOM_REPORT",
        "REACH_AND_FREQUENCY_PERFORMANCE_REPORT", "SEARCH_QUERY_PERFORMANCE_REPORT",
      ]).describe("Type of report"),
      dateRangeType: z.enum([
        "TODAY", "YESTERDAY", "THIS_WEEK_MON_TODAY", "THIS_WEEK_SUN_TODAY",
        "LAST_WEEK", "LAST_BUSINESS_WEEK", "LAST_3_DAYS", "LAST_5_DAYS",
        "LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "LAST_90_DAYS",
        "LAST_365_DAYS", "THIS_MONTH", "LAST_MONTH", "ALL_TIME", "CUSTOM_DATE", "AUTO",
      ]),
      fieldNames: z.array(z.string()).describe("Fields: CampaignName, Impressions, Clicks, Cost, Ctr, AvgCpc, Conversions, etc."),
      reportName: z.string().default("MCP Report"),
      dateFrom: z.string().optional().describe("YYYY-MM-DD (required if CUSTOM_DATE)"),
      dateTo: z.string().optional().describe("YYYY-MM-DD (required if CUSTOM_DATE)"),
    },
  }, async ({ reportType, dateRangeType, fieldNames, reportName, dateFrom, dateTo }) => {
    const result = await ctx.reports({ reportName, reportType, dateRangeType, fieldNames, dateFrom, dateTo });
    return { content: [{ type: "text" as const, text: result }] };
  });

  // ==================== DICTIONARIES ====================

  server.registerTool("dictionaries_get", {
    description: "Get Yandex Direct dictionaries (regions, currencies, ad categories, etc.)",
    inputSchema: {
      names: z.array(z.enum([
        "Currencies", "MetroStations", "GeoRegions", "TimeZones", "Constants",
        "AdCategories", "OperationSystemVersions", "ProductivityAssertions",
        "SupplySidePlatforms", "Interests", "AudienceCriteriaTypes",
        "AudienceDemographicProfiles", "AudienceInterests",
      ])),
    },
  }, async ({ names }) => fmt(await api("dictionaries", "get", { DictionaryNames: names })));

  // ==================== CHANGES ====================

  server.registerTool("changes_check", {
    description: "Check recent changes in campaigns. Returns changed IDs and timestamp.",
    inputSchema: {
      campaignIds: z.array(z.number()).optional(),
      timestamp: z.string().optional().describe("ISO 8601 timestamp"),
      fieldNames: z.array(z.enum(["CampaignIds", "AdGroupIds", "AdIds", "Timestamp"])).default(["CampaignIds", "Timestamp"]),
    },
  }, async ({ campaignIds, timestamp, fieldNames }) => {
    const sc: Record<string, unknown> = {};
    if (campaignIds?.length) sc.CampaignIds = campaignIds;
    if (timestamp) sc.Timestamp = timestamp;
    return fmt(await api("changes", "check", { SelectionCriteria: sc, FieldNames: fieldNames }));
  });

  server.registerTool("changes_check_campaigns", {
    description: "Check which campaigns changed since a timestamp",
    inputSchema: { timestamp: z.string().describe("ISO 8601 timestamp") },
  }, async ({ timestamp }) => fmt(await api("changes", "checkCampaigns", { Timestamp: timestamp })));

  server.registerTool("changes_check_dictionaries", {
    description: "Check if dictionaries have been updated",
    inputSchema: {},
  }, async () => fmt(await api("changes", "checkDictionaries", {})));

  // ==================== CLIENTS ====================

  server.registerTool("clients_get", {
    description: "Get advertiser account info (settings, permissions, limits)",
    inputSchema: {
      fieldNames: z.array(z.string()).default(["Login", "ClientId", "AccountQuality", "Grants", "Notification", "Phone", "Representatives", "Settings"]),
    },
  }, async ({ fieldNames }) => fmt(await api("clients", "get", { FieldNames: fieldNames })));

  json("clients_update", "clients", "update", "Update advertiser settings.", "Clients",
    'JSON array. Example: [{"Notification":{"EmailNotification":{"Email":"user@example.com"}}}]');

  // ==================== AGENCY CLIENTS ====================

  server.registerTool("agency_clients_get", {
    description: "Get agency's client accounts (agency access required)",
    inputSchema: {
      logins: z.array(z.string()).optional(),
      archived: z.enum(["YES", "NO"]).optional(),
      fieldNames: z.array(z.string()).default(["Login", "ClientId", "AccountQuality", "Type", "Settings"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ logins, archived, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (logins?.length) sc.Logins = logins;
    if (archived) sc.Archived = archived;
    return fmt(await api("agencyclients", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("agency_clients_add", "agencyclients", "add", "Create client accounts under agency.", "Clients",
    'JSON array. Example: [{"Login":"client","FirstName":"Ivan","LastName":"Petrov","Currency":"RUB"}]');
  json("agency_clients_update", "agencyclients", "update", "Update agency client parameters.", "Clients",
    'JSON array. Each must have Login. Example: [{"Login":"client","Settings":{...}}]');

  // ==================== BUSINESSES ====================

  server.registerTool("businesses_get", {
    description: "Get business profiles from Yandex Business",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Name", "Address", "Phone"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api("businesses", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  // ==================== TURBO PAGES ====================

  server.registerTool("turbo_pages_get", {
    description: "Get Turbo page parameters for ads",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Href", "Name"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api("turbopages", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  // ==================== LEADS ====================

  server.registerTool("leads_get", {
    description: "Get form submissions (leads) from Turbo pages",
    inputSchema: {
      dateFrom: z.string().describe("YYYY-MM-DD"),
      dateTo: z.string().describe("YYYY-MM-DD"),
      turboPageIds: z.array(z.number()).optional(),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ dateFrom, dateTo, turboPageIds, limit, offset }) => {
    const sc: Record<string, unknown> = { DateFrom: dateFrom, DateTo: dateTo };
    if (turboPageIds?.length) sc.TurboPageIds = turboPageIds;
    return fmt(await api("leads", "get", { SelectionCriteria: sc, Page: { Limit: limit, Offset: offset } }));
  });
}
