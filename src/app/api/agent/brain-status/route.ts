import { withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { getOrganizationBrain } from "@/server/brains/connections";
import { multitenantEnabled } from "@/lib/multitenant";
import { isAiConfiguredFor } from "@/lib/ai/provider";
import {
  botLastSeenAt,
  computeBrainStatus,
  getBrainHealth,
} from "@/server/bot/status";
import { estadoDelDespacho } from "@/server/dispatch/estado";

export const dynamic = "force-dynamic";

/**
 * «Quién responde a tus clientes»: el cerebro conectado, el despacho (021), el
 * interruptor y los avisos `sin_cerebro` y `apagado` (036). Ver
 * `server/bot/status.ts`.
 */
export const GET = withAuth(async (session) => {
  const brain = await getOrganizationBrain(session.organizationId);
  const db = getDb();
  const [rows, health, aiConfigured, dispatch] = await Promise.all([
    db
      .select({ enabled: schema.agentProfile.enabled })
      .from(schema.agentProfile)
      .where(scoped(schema.agentProfile.organizationId, session.organizationId))
      .limit(1),
    getBrainHealth(brain.healthUrl ?? undefined),
    isAiConfiguredFor(session.organizationId),
    estadoDelDespacho(session.organizationId),
  ]);
  const status = computeBrainStatus({
    aiConfigured,
    agentEnabled: rows[0]?.enabled ?? false,
    botKeyConfigured: brain.keyConfigured,
    lastSeenAt: botLastSeenAt(multitenantEnabled() ? session.organizationId : undefined),
    health,
    dispatch,
    now: new Date(),
  });
  return Response.json({ ...status, managed: multitenantEnabled() }, { headers: { "cache-control": "no-store" } });
});
