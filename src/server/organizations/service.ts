import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";

export async function listOrganizations(userId: string) {
  return getDb()
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(
      schema.organization,
      eq(schema.organization.id, schema.member.organizationId),
    )
    .where(eq(schema.member.userId, userId));
}

/** El propietario ya existe; todo el dominio inicial se crea en una transacción. */
export async function createOrganization(input: {
  name: string;
  slug: string;
  ownerId: string;
}) {
  return getDb().transaction(async (tx) => {
    const id = newId("organization");
    await tx
      .insert(schema.organization)
      .values({ id, name: input.name, slug: input.slug });
    await tx
      .insert(schema.member)
      .values({
        id: newId("member"),
        organizationId: id,
        userId: input.ownerId,
        role: "owner",
      });
    const stages = [
      ["Nuevo", "open"],
      ["En conversación", "open"],
      ["Interesado", "open"],
      ["Cliente", "won"],
      ["Perdido", "lost"],
    ] as const;
    await tx.insert(schema.pipelineStage).values(
      stages.map(([name, kind], position) => ({
        id: newId("stage"),
        organizationId: id,
        name,
        kind,
        position,
      })),
    );
    await tx
      .insert(schema.agentProfile)
      .values({ id: newId("agentProfile"), organizationId: id });
    return { id, name: input.name, slug: input.slug };
  });
}

/** Serializa mutaciones de la sesión y vuelve a comprobar la membresía en BD. */
export async function selectOrganization(
  userId: string,
  sessionId: string,
  organizationId: string,
) {
  return getDb().transaction(async (tx) => {
    const [membership] = await tx
      .select()
      .from(schema.member)
      .where(
        sql`${schema.member.userId} = ${userId} and ${schema.member.organizationId} = ${organizationId}`,
      )
      .for("share")
      .limit(1);
    if (!membership) return false;
    const rows = await tx
      .update(schema.session)
      .set({ activeOrganizationId: organizationId, updatedAt: new Date() })
      .where(
        sql`${schema.session.id} = ${sessionId} and ${schema.session.userId} = ${userId} and ${schema.session.expiresAt} > now()`,
      )
      .returning({ id: schema.session.id });
    return rows.length === 1;
  });
}
