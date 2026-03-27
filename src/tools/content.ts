import { z } from "zod";
import type { Ctx } from "../api.js";

export function register(ctx: Ctx): void {
  const { server, api, fmt, ids, json } = ctx;

  // ==================== FEEDS ====================

  server.registerTool("feeds_get", {
    description: "Get product/offer feeds for dynamic ads and smart banners",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Name", "Status", "SourceType", "UpdatedAt", "NumberOfItems"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api("feeds", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("feeds_add", "feeds", "add", "Add product/offer feeds.", "Feeds",
    'JSON array. Example: [{"Name":"Products","UrlFeed":{"Url":"https://example.com/feed.xml"}}]');
  json("feeds_update", "feeds", "update", "Update feed parameters.", "Feeds",
    'JSON array. Each must have Id. Example: [{"Id":123,"Name":"Updated"}]');
  ids("feeds_delete", "feeds", "delete", "Delete feeds by IDs", "Feed IDs");

  // ==================== AD IMAGES ====================

  server.registerTool("ad_images_get", {
    description: "Get ad images",
    inputSchema: {
      hashes: z.array(z.string()).optional().describe("Filter by image hashes"),
      associated: z.enum(["YES", "NO"]).optional(),
      fieldNames: z.array(z.string()).default(["AdImageHash", "Name", "Associated", "Type"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ hashes, associated, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (hashes?.length) sc.AdImageHashes = hashes;
    if (associated) sc.Associated = associated;
    return fmt(await api("adimages", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("ad_images_add", "adimages", "add", "Upload ad images (base64 or URL).", "AdImages",
    'JSON array. Example: [{"Name":"img","ImageUrl":"https://example.com/img.jpg"}]');

  server.registerTool("ad_images_delete", {
    description: "Delete ad images by hashes",
    inputSchema: { hashes: z.array(z.string()).describe("Image hashes to delete") },
  }, async ({ hashes }) => fmt(await api("adimages", "delete", { SelectionCriteria: { AdImageHashes: hashes } })));

  // ==================== AD VIDEOS ====================

  server.registerTool("ad_videos_get", {
    description: "Get ad videos",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Name", "Url", "Status", "Duration"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api("advideos", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("ad_videos_add", "advideos", "add", "Add videos for video ads.", "AdVideos",
    'JSON array. Example: [{"Name":"Video","Url":"https://example.com/video.mp4"}]');

  // ==================== CREATIVES ====================

  server.registerTool("creatives_get", {
    description: "Get creatives (for display/CPM campaigns)",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Name", "Type", "PreviewUrl", "Width", "Height"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api("creatives", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("creatives_add", "creatives", "add", "Add creatives for display campaigns.", "Creatives",
    'JSON array. Example: [{"TextImageCreative":{"Name":"Creative","Href":"https://example.com","ImageHash":"abc"}}]');

  // ==================== AD EXTENSIONS ====================

  server.registerTool("ad_extensions_get", {
    description: "Get ad extensions (callouts)",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      states: z.array(z.enum(["ASSOCIATED", "DELETED"])).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Callout", "Type", "State", "Status"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, states, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    if (states?.length) sc.States = states;
    return fmt(await api("adextensions", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("ad_extensions_add", "adextensions", "add", "Add ad extensions (callouts).", "AdExtensions",
    'JSON array. Example: [{"Callout":{"CalloutText":"Free shipping"}}]');
  ids("ad_extensions_delete", "adextensions", "delete", "Delete ad extensions by IDs", "Extension IDs");

  // ==================== SITELINKS ====================

  server.registerTool("sitelinks_get", {
    description: "Get sitelink sets by IDs",
    inputSchema: {
      ids: z.array(z.number()).describe("Sitelink set IDs"),
      fieldNames: z.array(z.string()).default(["Id", "Sitelinks"]),
    },
  }, async ({ ids: fIds, fieldNames }) => fmt(await api("sitelinks", "get", { SelectionCriteria: { Ids: fIds }, FieldNames: fieldNames })));

  json("sitelinks_add", "sitelinks", "add", "Create sitelink sets (up to 8 per set).", "SitelinksSets",
    'JSON array. Example: [{"Sitelinks":[{"Title":"About","Href":"https://example.com/about"}]}]');
  ids("sitelinks_delete", "sitelinks", "delete", "Delete sitelink sets by IDs", "Set IDs");

  // ==================== VCARDS ====================

  server.registerTool("vcards_get", {
    description: "Get vCards (business cards) by IDs",
    inputSchema: {
      ids: z.array(z.number()).describe("VCard IDs"),
      fieldNames: z.array(z.string()).default(["Id", "CompanyName", "Phone", "WorkTime", "Address"]),
    },
  }, async ({ ids: fIds, fieldNames }) => fmt(await api("vcards", "get", { SelectionCriteria: { Ids: fIds }, FieldNames: fieldNames })));

  json("vcards_add", "vcards", "add", "Create vCards (business cards).", "VCards",
    'JSON array. Example: [{"CampaignId":123,"CompanyName":"Company","Phone":{"CountryCode":"+7","CityCode":"495","PhoneNumber":"1234567"}}]');
  ids("vcards_delete", "vcards", "delete", "Delete vCards by IDs", "VCard IDs");

  // ==================== STRATEGIES ====================

  server.registerTool("strategies_get", {
    description: "Get portfolio (shared) bidding strategies",
    inputSchema: {
      ids: z.array(z.number()).optional(),
      fieldNames: z.array(z.string()).default(["Id", "Name", "Type", "State"]),
      limit: z.number().min(1).max(10000).default(100),
      offset: z.number().min(0).default(0),
    },
  }, async ({ ids: fIds, fieldNames, limit, offset }) => {
    const sc: Record<string, unknown> = {};
    if (fIds?.length) sc.Ids = fIds;
    return fmt(await api("strategies", "get", { SelectionCriteria: sc, FieldNames: fieldNames, Page: { Limit: limit, Offset: offset } }));
  });

  json("strategies_add", "strategies", "add", "Create portfolio bidding strategies.", "Strategies",
    'JSON array. Example: [{"Name":"Strategy","Type":"AVERAGE_CPC","AverageCpc":{"AverageCpc":5000000}}]');
  json("strategies_update", "strategies", "update", "Update portfolio strategies.", "Strategies",
    'JSON array. Each must have Id. Example: [{"Id":123,"Name":"Updated"}]');
  ids("strategies_archive", "strategies", "archive", "Archive strategies by IDs", "Strategy IDs");
  ids("strategies_unarchive", "strategies", "unarchive", "Unarchive strategies by IDs", "Strategy IDs");
}
