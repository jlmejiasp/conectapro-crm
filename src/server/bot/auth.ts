import { eq } from "drizzle-orm";
import { multitenantEnabled } from "@/lib/multitenant";
import { brainKeyHash } from "@/server/brains/connections";
import { timingSafeEqual } from "node:crypto";
import { getDb, schema } from "@/lib/db";
import { apiError } from "@/lib/api";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { markBotSeen } from "@/server/bot/status";

/**
 * Autenticación de la API de servicio `/api/bot/*`.
 *
 * Esta superficie NO la consume el navegador: la consume un cerebro externo
 * (un microservicio propio del operador, en su mismo servidor) que quiere
 * conducir la conversación sin que el token de WhatsApp salga del CRM.
 * Header `X-API-Key` (o `Authorization: Bearer`) contra `BOT_API_KEY` (env),
 * comparación en tiempo constante. Sin `BOT_API_KEY` configurada, toda la superficie responde 401.
 *
 * Primero se autentica y DESPUÉS se cuenta. Antes había un solo cubo global
 * contado antes de mirar la key: 600 requests anónimos por minuto dejaban al
 * cerebro en 429 el resto de la ventana, y los clientes sin respuesta.
 */

const MIN_KEY_LENGTH = 16;

/** La superficie está abierta: hay `BOT_API_KEY` y no es débil. Una key
 *  corta equivale a no tenerla (todo responde 401). */
export function isBotKeyConfigured(): boolean {
  const key = process.env.BOT_API_KEY;
  return typeof key === "string" && key.length >= MIN_KEY_LENGTH;
}

/**
 * Presupuesto del cerebro AUTENTICADO: 1200/min (20/s sostenidos). Nea hace
 * ~4-10 llamadas por turno de cliente (contexto, "escribiendo…", 1-3
 * mensajes y, cuando aplica, ficha, handoff, agenda o adjuntos): alcanza para
 * 120-300 turnos por minuto, por encima del pico de un solo negocio. Un
 * cerebro desbocado en un bucle queda en 20/s, carga que el monolito absorbe
 * sin que la bandeja lo note.
 */
export const BOT_API_BUDGET = { windowMs: 60_000, max: 1200 };

/**
 * Autenticaciones FALLIDAS por IP: 30/min, y luego 429. Jamás tocan el
 * presupuesto de arriba, y una key correcta pasa aunque su IP esté frenada:
 * detrás del mismo proxy (o sin proxy, donde todo es "local") el cerebro puede
 * compartir IP con quien inunda. Adivinar la key tampoco es el riesgo: mide
 * 16+ caracteres.
 */
export const BOT_AUTH_FAILURES = { windowMs: 60_000, max: 30 };

/**
 * 036 — La llave llega en `X-API-Key` o, para `/api/bot/llm`, como
 * `Authorization: Bearer`: es lo que manda el SDK de OpenAI del cerebro, que
 * apunta su `base_url` al CRM y no sabe de cabeceras propias.
 */
function llaveDe(req: Request): string | null {
  const directa = req.headers.get("x-api-key");
  if (directa) return directa;
  const auth = req.headers.get("authorization");
  const m = auth ? /^Bearer\s+(.+)$/i.exec(auth.trim()) : null;
  return m?.[1] ?? null;
}

const requestOrganizations = new WeakMap<Request, string>();

async function requireTenantBotKey(req: Request): Promise<Response | null> {
  const provided = llaveDe(req);
  // Limitar antes de consultar también evita búsquedas de hashes arbitrarios.
  const ip = clientIp(req.headers);
  if (!provided || !/^cp_[A-Za-z0-9_-]{43}$/.test(provided))
    return failedTenantAuth(ip);
  const [row] = await getDb()
    .select({ organizationId: schema.brainConnection.organizationId })
    .from(schema.brainConnection)
    .where(eq(schema.brainConnection.keyHash, brainKeyHash(provided)))
    .limit(1);
  if (!row) return failedTenantAuth(ip);
  requestOrganizations.set(req, row.organizationId);
  markBotSeen(Date.now(), row.organizationId);
  const rl = checkRateLimit(`bot-api:${row.organizationId}`, BOT_API_BUDGET);
  return rl.allowed
    ? null
    : apiError(429, "rate_limited", "Demasiadas solicitudes");
}
function failedTenantAuth(ip: string): Response {
  const rl = checkRateLimit(`bot-api-fail:${ip}`, BOT_AUTH_FAILURES);
  return rl.allowed
    ? apiError(401, "unauthorized", "No autorizado")
    : apiError(429, "rate_limited", "Demasiados intentos fallidos");
}

export async function requireBotKey(req: Request): Promise<Response | null> {
  if (multitenantEnabled()) return requireTenantBotKey(req);
  if (!validBotKey(llaveDe(req))) {
    const ip = clientIp(req.headers);
    const fails = checkRateLimit(`bot-api-fail:${ip}`, BOT_AUTH_FAILURES);
    return fails.allowed
      ? apiError(401, "unauthorized", "No autorizado")
      : apiError(429, "rate_limited", "Demasiados intentos fallidos");
  }
  // «Quién responde»: la única huella que deja el cerebro externo en el CRM.
  // Se marca al autenticar, antes del presupuesto: un cerebro frenado por 429
  // sigue siendo el que contesta.
  markBotSeen();
  const rl = checkRateLimit("bot-api", BOT_API_BUDGET);
  if (!rl.allowed)
    return apiError(429, "rate_limited", "Demasiadas solicitudes");
  return null;
}

function validBotKey(provided: string | null): boolean {
  const expected = process.env.BOT_API_KEY;
  if (!expected || !isBotKeyConfigured() || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Organización única de la instancia (self-hosted, un negocio). Cacheada en
 * memoria: la instancia jamás cambia de organización en runtime.
 */
export async function resolveInstanceOrg(
  req?: Request,
): Promise<string | null> {
  if (multitenantEnabled())
    return req ? (requestOrganizations.get(req) ?? null) : null;
  // No cachear una selección global: si se añadiera otra empresa, se deniega.
  const rows = await getDb()
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .limit(2);
  return rows.length === 1 ? rows[0]!.id : null;
}

/** Compatibilidad con arneses de la versión anterior; ya no existe caché. */
export function resetInstanceOrgCache(): void {}
