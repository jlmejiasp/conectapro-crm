import { resolveMembership } from "@/server/auth/on-signup";
import { and, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { multitenantEnabled } from "@/lib/multitenant";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { subscribe } from "@/server/events/bus";

/**
 * Canal SSE de la bandeja (contrato sse.md).
 * Headers exactos + heartbeat ~25s para sobrevivir detrás de Caddy/Traefik.
 * El servidor no garantiza replay: el cliente hace catch-up con `since=`.
 */
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;
const encoder = new TextEncoder();

export async function GET(req: Request) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return new Response("No autenticado", { status: 401 });
    }
    throw err;
  }
  const { organizationId, userId, sessionId } = session;
  const authorized = async () => {
    if (!multitenantEnabled()) return true;
    if (!sessionId) return false;
    const [current] = await getDb()
      .select({ active: schema.session.activeOrganizationId })
      .from(schema.session)
      .where(
        and(
          eq(schema.session.id, sessionId),
          eq(schema.session.userId, userId),
          gt(schema.session.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!current || (current.active && current.active !== organizationId))
      return false;
    const membership = await resolveMembership(userId, current.active);
    return membership?.organizationId === organizationId;
  };

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup?.();
        }
      };

      send(`: conectado\n\n`);

      let sending = Promise.resolve();
      const unsubscribe = subscribe(organizationId, (event) => {
        sending = sending
          .then(async () => {
            if (!(await authorized())) {
              cleanup?.();
              return;
            }
            send(
              `event: ${event.type}\n` +
                `id: ${Date.now()}\n` +
                `data: ${JSON.stringify(event.data)}\n\n`,
            );
          })
          .catch(() => cleanup?.());
      });

      const heartbeat = setInterval(() => {
        void authorized()
          .then((ok) => (ok ? send(`: ping\n\n`) : cleanup?.()))
          .catch(() => cleanup?.());
      }, HEARTBEAT_MS);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      };

      req.signal.addEventListener("abort", () => cleanup?.());
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
