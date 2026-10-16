import { describe, expect, it } from "vitest";
import { base64DecodedLength, reserveDailyCall, reserveIpCall, verifyTurnstile } from "../functions/limits";
import type { UsageKv } from "../functions/env";

function memoryKv(initial: Record<string, string> = {}): UsageKv & { store: Map<string, string> } {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

describe("reserveDailyCall", () => {
  const now = new Date("2026-10-16T03:00:00Z");

  it("counts calls for the UTC day and stops at the cap", async () => {
    const kv = memoryKv();
    for (let index = 0; index < 100; index += 1) {
      expect(await reserveDailyCall(kv, 100, now)).toBe(true);
    }
    expect(await reserveDailyCall(kv, 100, now)).toBe(false);
    expect(kv.store.get("usage:2026-10-16")).toBe("100");
  });

  it("fails closed when the stored counter is not a number", async () => {
    const kv = memoryKv({ "usage:2026-10-16": "nope" });
    expect(await reserveDailyCall(kv, 100, now)).toBe(false);
  });
});

describe("reserveIpCall", () => {
  it("allows 6 calls from one address inside the window and stops on the next", async () => {
    const kv = memoryKv();
    for (let index = 0; index < 6; index += 1) {
      expect(await reserveIpCall(kv, "203.0.113.5")).toBe(true);
    }
    expect(await reserveIpCall(kv, "203.0.113.5")).toBe(false);
    expect(await reserveIpCall(kv, "203.0.113.9")).toBe(true);
    expect(kv.store.get("ip:203.0.113.5")).toBe("6");
  });

  it("fails closed when the stored counter is not a number", async () => {
    const kv = memoryKv({ "ip:203.0.113.5": "nope" });
    expect(await reserveIpCall(kv, "203.0.113.5")).toBe(false);
  });
});

describe("verifyTurnstile", () => {
  it("posts the token and accepts success", async () => {
    const fetchImpl: typeof fetch = async (_input, init) => {
      const params = new URLSearchParams(String(init?.body ?? ""));
      expect(params.get("secret")).toBe("secret");
      expect(params.get("response")).toBe("token");
      expect(params.get("remoteip")).toBe("203.0.113.5");
      return Response.json({ success: true });
    };
    expect(await verifyTurnstile("token", "secret", "203.0.113.5", fetchImpl)).toBe(true);
  });

  it("rejects a failed check, an HTTP error, and a network error", async () => {
    const failed: typeof fetch = async () => Response.json({ success: false });
    const http: typeof fetch = async () => new Response("no", { status: 500 });
    const network: typeof fetch = async () => {
      throw new Error("down");
    };
    expect(await verifyTurnstile("token", "secret", "", failed)).toBe(false);
    expect(await verifyTurnstile("token", "secret", "", http)).toBe(false);
    expect(await verifyTurnstile("token", "secret", "", network)).toBe(false);
  });
});

describe("base64DecodedLength", () => {
  it("measures padding and rejects junk", () => {
    expect(base64DecodedLength("YQ==")).toBe(1);
    expect(base64DecodedLength("YQ==\n")).toBe(1);
    expect(base64DecodedLength("")).toBeNull();
    expect(base64DecodedLength("YQ=")).toBeNull();
    expect(base64DecodedLength("!!!!")).toBeNull();
  });
});
