/** Las mutaciones con cookie solo se admiten desde el origen público configurado. */
export function sameOrigin(req: Request): boolean {
  return (
    req.headers.get("origin") ===
    new URL(process.env.APP_BASE_URL ?? req.url).origin
  );
}
