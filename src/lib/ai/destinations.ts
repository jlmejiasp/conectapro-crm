import { apiRoot, OPENROUTER_BASE_URL } from "@/lib/ai/presets";
import { multitenantEnabled } from "@/lib/multitenant";

function approvedRoot(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    return apiRoot(url.href);
  } catch {
    return null;
  }
}

/** En una plataforma compartida, solo el operador amplía los destinos de IA. */
export function aiDestinationAllowed(baseUrl: string): boolean {
  if (!multitenantEnabled()) return true;
  const candidate = approvedRoot(baseUrl);
  if (!candidate) return false;
  const approved = [
    OPENROUTER_BASE_URL,
    ...(process.env.MULTITENANT_AI_ALLOWED_BASE_URLS ?? "").split(","),
  ];
  return approved.some((url) => approvedRoot(url) === candidate);
}

export const AI_DESTINATION_ERROR =
  "Este proveedor no está habilitado para ConectaPro. Usa OpenRouter o pide al administrador que apruebe la dirección del proveedor.";

export function aiRedirectPolicy(): RequestRedirect {
  return multitenantEnabled() ? "error" : "follow";
}
