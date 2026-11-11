/** Modo de plataforma explícito; el despliegue existente sigue siendo compatible. */
export function multitenantEnabled(): boolean {
  return process.env.MULTITENANT === "true";
}

/** IDs de usuarios provisionados por el operador; nunca emails autoafirmados. */
export function isPlatformAdmin(userId: string): boolean {
  return (
    multitenantEnabled() &&
    (process.env.PLATFORM_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .includes(userId)
  );
}
