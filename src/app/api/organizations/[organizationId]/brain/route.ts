import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { isPlatformAdmin } from "@/lib/multitenant";
import { getDb, schema } from "@/lib/db";
import { platformIdentity } from "@/server/organizations/http";
import { rotateBrainConnection } from "@/server/brains/connections";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ organizationId: string }> };
const url = z
  .string()
  .max(2000)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return (
        ["http:", "https:"].includes(u.protocol) &&
        !u.username &&
        !u.password &&
        !u.hash &&
        !u.search
      );
    } catch {
      return false;
    }
  }, "Usa una URL http(s) sin credenciales, parámetros ni fragmento");
export async function GET(req: Request, context: Context) {
  const identity = await platformIdentity(req);
  if (identity.error) return identity.error;
  if (!isPlatformAdmin(identity.auth.user.id))
    return apiError(
      403,
      "forbidden",
      "Solo el administrador de plataforma puede configurar agentes",
    );
  const { organizationId } = await context.params;
  const [row] = await getDb()
    .select({
      dispatchUrl: schema.brainConnection.dispatchUrl,
      healthUrl: schema.brainConnection.healthUrl,
      updatedAt: schema.brainConnection.updatedAt,
    })
    .from(schema.brainConnection)
    .where(eq(schema.brainConnection.organizationId, organizationId))
    .limit(1);
  return Response.json(
    {
      configured: Boolean(row),
      dispatchUrl: row?.dispatchUrl ?? "",
      healthUrl: row?.healthUrl ?? "",
      updatedAt: row?.updatedAt ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
export async function PUT(req: Request, context: Context) {
  const identity = await platformIdentity(req);
  if (identity.error) return identity.error;
  if (!isPlatformAdmin(identity.auth.user.id))
    return apiError(
      403,
      "forbidden",
      "Solo el administrador de plataforma puede configurar agentes",
    );
  const { organizationId } = await context.params;
  const [org] = await getDb()
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);
  if (!org) return apiError(404, "not_found", "Empresa no encontrada");
  const body = await parseBody(
    req,
    z.object({ dispatchUrl: url.default(""), healthUrl: url.default("") }),
  );
  if (!body.ok) return body.response;
  const apiKey = await rotateBrainConnection(
    organizationId,
    body.data.dispatchUrl || null,
    body.data.healthUrl || null,
  );
  return Response.json(
    { apiKey },
    { headers: { "cache-control": "no-store" } },
  );
}
export async function DELETE(req: Request, context: Context) {
  const identity = await platformIdentity(req);
  if (identity.error) return identity.error;
  if (!isPlatformAdmin(identity.auth.user.id))
    return apiError(
      403,
      "forbidden",
      "Solo el administrador de plataforma puede revocar agentes",
    );
  const { organizationId } = await context.params;
  await getDb().transaction(async (tx) => {
    await tx
      .delete(schema.brainConnection)
      .where(eq(schema.brainConnection.organizationId, organizationId));
    await tx
      .update(schema.agentProfile)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(schema.agentProfile.organizationId, organizationId));
  });
  return Response.json({ ok: true });
}
