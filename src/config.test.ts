import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("process.exit"); }) as any);
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe("loadConfig", () => {
  it("loads config with token from env", () => {
    process.env.YANDEX_DIRECT_TOKEN = "my-token";
    const cfg = loadConfig();
    expect(cfg.token).toBe("my-token");
    expect(cfg.sandbox).toBe(false);
    expect(cfg.clientLogin).toBe("");
    expect(cfg.language).toBe("ru");
    expect(cfg.baseUrl).toContain("api.direct.yandex.com");
    expect(cfg.reportsUrl).toContain("/reports");
  });

  it("exits on missing token", () => {
    delete process.env.YANDEX_DIRECT_TOKEN;
    expect(() => loadConfig()).toThrow("process.exit");
  });

  it("enables sandbox mode", () => {
    process.env.YANDEX_DIRECT_TOKEN = "tok";
    process.env.YANDEX_DIRECT_SANDBOX = "true";
    const cfg = loadConfig();
    expect(cfg.sandbox).toBe(true);
    expect(cfg.baseUrl).toContain("api-sandbox");
    expect(cfg.reportsUrl).toContain("api-sandbox");
  });

  it("does not enable sandbox for other values", () => {
    process.env.YANDEX_DIRECT_TOKEN = "tok";
    process.env.YANDEX_DIRECT_SANDBOX = "yes";
    expect(loadConfig().sandbox).toBe(false);
  });

  it("reads client login", () => {
    process.env.YANDEX_DIRECT_TOKEN = "tok";
    process.env.YANDEX_DIRECT_CLIENT_LOGIN = "agency-client";
    expect(loadConfig().clientLogin).toBe("agency-client");
  });

  it("reads language override", () => {
    process.env.YANDEX_DIRECT_TOKEN = "tok";
    process.env.YANDEX_DIRECT_LANGUAGE = "en";
    expect(loadConfig().language).toBe("en");
  });
});
