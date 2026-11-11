import { and, desc, eq, gt, gte, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { canConfigure } from "@/lib/auth/roles";
import { getDb, schema } from "@/lib/db";

const prueba = z.object({
  code: z.string().regex(/^CP-[0-9A-F]{12}$/),
  phoneNumberId: z.string().min(1).max(100),
});

export const POST = withAuth(async (session, req: Request) => {
  if (!canConfigure(session.role)) {
    return apiError(
      403,
      "forbidden",
      "Solo quien administra la empresa puede comprobar WhatsApp.",
    );
  }
  const body = await parseBody(req, prueba);
  if (!body.ok) return body.response;
  const organizationId = session.organizationId;
  const { conversation, message, metaCredentials } = schema;
  const db = getDb();
  const [connection] = await db
    .select({ updatedAt: metaCredentials.updatedAt })
    .from(metaCredentials)
    .where(
      and(
        eq(metaCredentials.organizationId, organizationId),
        eq(metaCredentials.phoneNumberId, body.data.phoneNumberId),
        eq(metaCredentials.status, "connected"),
      ),
    );
  if (!connection) {
    return apiError(
      409,
      "connection_changed",
      "La conexión cambió. Recarga WhatsApp e inicia una prueba nueva.",
    );
  }

  const since = new Date(
    Math.max(connection.updatedAt.getTime(), Date.now() - 86_400_000),
  );
  const [received] = await db
    .select({ conversationId: message.conversationId, at: message.createdAt })
    .from(message)
    .innerJoin(
      conversation,
      and(
        eq(conversation.id, message.conversationId),
        eq(conversation.organizationId, message.organizationId),
      ),
    )
    .where(
      and(
        eq(message.organizationId, organizationId),
        eq(conversation.channel, "whatsapp"),
        eq(conversation.isTest, false),
        eq(message.direction, "in"),
        eq(message.type, "text"),
        isNotNull(message.waMessageId),
        eq(message.text, body.data.code),
        gte(message.createdAt, since),
      ),
    )
    .orderBy(desc(message.createdAt))
    .limit(1);

  let reply = null;
  let confirmedByRecipient = false;
  if (received) {
    const [outbound] = await db
      .select({
        status: message.status,
        providerId: message.waMessageId,
        at: message.createdAt,
      })
      .from(message)
      .where(
        and(
          eq(message.organizationId, organizationId),
          eq(message.conversationId, received.conversationId),
          eq(message.direction, "out"),
          eq(message.origin, "operator"),
          eq(message.aiGenerated, false),
          gt(message.createdAt, received.at),
        ),
      )
      // Una respuesta confirmada sigue acreditando la prueba aunque se
      // haya intentado otro envío más tarde en la misma conversación.
      .orderBy(
        desc(
          sql`${message.status} in ('delivered', 'read') and ${message.waMessageId} is not null`,
        ),
        desc(message.createdAt),
      )
      .limit(1);
    if (outbound) {
      const confirmed =
        outbound.status === "delivered" || outbound.status === "read";
      reply = confirmed && !outbound.providerId ? null : outbound.status;
      if (reply === "sent" && outbound.providerId) {
        const [acknowledgement] = await db
          .select({ id: message.id })
          .from(message)
          .where(
            and(
              eq(message.organizationId, organizationId),
              eq(message.conversationId, received.conversationId),
              eq(message.direction, "in"),
              eq(message.type, "text"),
              isNotNull(message.waMessageId),
              eq(message.text, `CONFIRMO ${body.data.code}`),
              gt(message.createdAt, outbound.at),
            ),
          )
          .limit(1);
        confirmedByRecipient = Boolean(acknowledgement);
      }
    }
  }
  return Response.json(
    {
      conversationId: received?.conversationId ?? null,
      reply,
      confirmedByRecipient,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
