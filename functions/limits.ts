import type { UsageKv } from "./env";

const TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DAY_SECONDS = 48 * 60 * 60;

export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  if (ip) {
    params.set("remoteip", ip);
  }
  try {
    const response = await fetchImpl(TURNSTILE_URL, { method: "POST", body: params });
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as { success?: unknown };
    return payload.success === true;
  } catch {
    return false;
  }
}

export async function reserveDailyCall(kv: UsageKv, cap: number, now: Date): Promise<boolean> {
  const key = `usage:${now.toISOString().slice(0, 10)}`;
  const raw = await kv.get(key);
  const current = raw == null ? 0 : Number(raw);
  if (!Number.isFinite(current) || current >= cap) {
    return false;
  }
  await kv.put(key, String(current + 1), { expirationTtl: DAY_SECONDS });
  return true;
}

export function base64DecodedLength(value: string): number | null {
  const cleaned = value.replace(/\s/g, "");
  if (cleaned.length === 0 || cleaned.length % 4 !== 0) {
    return null;
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    return null;
  }
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return (cleaned.length / 4) * 3 - padding;
}
