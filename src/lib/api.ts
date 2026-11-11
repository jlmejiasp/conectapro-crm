import { canConfigure } from "@/lib/auth/roles";
import { multitenantEnabled } from "@/lib/multitenant";
import { sameOrigin } from "@/lib/request-origin";
import { z } from "zod";
import {
  requireSession,
  UnauthorizedError,
  type SessionContext,
} from "@/lib/auth/session";

/** Respuesta de error estándar de la API interna (contrato api.md). */
export function apiError(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ error: { code, message } }, { status });
}

/**
 * Envuelve un route handler autenticado: resuelve la sesión (401 si no hay),
 * captura errores no controlados (500 sin stack) y deja pasar Response.
 */
export function withAuth<Args extends unknown[]>(
  handler: (session: SessionContext, ...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const req = args[0];
    if (
      multitenantEnabled() &&
      req instanceof Request &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !sameOrigin(req)
    ) {
      return apiError(403, "forbidden", "Origen no permitido");
    }
    let session: SessionContext;
    try {
      session = await requireSession();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return apiError(401, "unauthorized", "No autenticado");
      }
      throw err;
    }
    if (
      multitenantEnabled() &&
      req instanceof Request &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method)
    ) {
      const path = new URL(req.url).pathname;
      if (
        [
          "/api/settings/",
          "/api/agent/",
          "/api/kb",
          "/api/calendar/settings",
          "/api/pipeline/stages",
          "/api/seed/",
          "/api/lab/",
        ].some((prefix) => path.startsWith(prefix)) &&
        !canConfigure(session.role)
      ) {
        return apiError(
          403,
          "forbidden",
          "Solo quien administra la empresa puede modificar su configuración",
        );
      }
    }
    try {
      return await handler(session, ...args);
    } catch (err) {
      // Los errores de BD pueden incluir los parámetros de la consulta.
      console.error("[api] error no controlado:", err instanceof Error ? err.name : "Error");
      return apiError(500, "internal", "Error interno");
    }
  };
}

/** Parsea el body JSON con un esquema Zod; inválido → Response 422. */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: apiError(422, "invalid_body", "El body debe ser JSON válido"),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return {
      ok: false,
      response: apiError(422, "invalid_body", detail),
    };
  }
  return { ok: true, data: parsed.data };
}
