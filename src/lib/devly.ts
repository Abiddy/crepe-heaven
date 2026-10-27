/**
 * Server-side client for the Devly Studios API. Import only from route handlers
 * or server code — it reads secret per-site keys from the environment.
 *
 * DEVLY_API_URL="https://work.devly.info"
 * DEVLY_SITE_KEYS="grape:<key>,lomelis:<key>"
 */

export type DevlyResult = {
  ok: boolean;
  status: number;
  configured: boolean;
  data?: unknown;
};

const TIMEOUT_MS = 6_000;

function siteKeyFor(slug: string): string | null {
  const raw = process.env.DEVLY_SITE_KEYS || "";
  for (const pair of raw.split(",")) {
    const index = pair.indexOf(":");
    if (index === -1) continue;
    if (pair.slice(0, index).trim() === slug) {
      const key = pair.slice(index + 1).trim();
      return key || null;
    }
  }
  return null;
}

export async function devlyPost(
  slug: string,
  path: string,
  body: unknown,
  clientIp?: string,
): Promise<DevlyResult> {
  const baseUrl = process.env.DEVLY_API_URL?.replace(/\/$/, "");
  const key = siteKeyFor(slug);
  if (!baseUrl || !key) {
    return { ok: false, status: 503, configured: false };
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...(clientIp ? { "X-Client-IP": clientIp } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json().catch(() => undefined);
    return { ok: res.ok, status: res.status, configured: true, data };
  } catch (err) {
    console.error("[devly] request failed", path, err);
    return { ok: false, status: 502, configured: true };
  }
}

export function clientIpFrom(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || undefined;
  return request.headers.get("x-real-ip")?.trim() || undefined;
}
