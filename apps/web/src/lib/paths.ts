/** Site base path (trailing slash). */
export function baseUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/** Join a path onto the site base. */
export function withBase(path = ""): string {
  const clean = path.replace(/^\/+/, "");
  return `${baseUrl()}${clean}`;
}
