const BASE = "https://api.postforme.dev/v1";

export async function getPost4MeAccountName(accountId: string): Promise<string | null> {
  const id = accountId.trim();
  const key = process.env.POST_FOR_ME_API_KEY;
  if (!id || !key) return null;
  try {
    const res = await fetch(`${BASE}/social-accounts/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name = data?.name ?? data?.username ?? data?.data?.name ?? data?.data?.username;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}
