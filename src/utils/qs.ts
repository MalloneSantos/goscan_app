export function withUrlQS(
  path: string,
  qs?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!qs || Object.keys(qs).length === 0) return path;

  const url = new URL(path, "http://local");
  const params = new URLSearchParams(url.search);

  for (const [k, v] of Object.entries(qs)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }

  const query = params.toString();
  const base = path.split("?")[0];
  return query ? `${base}?${query}` : base;
}
