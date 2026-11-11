import { and, asc, count, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export async function platformCompanies() {
  const db = getDb();
  const { organization, member, conversation, brainConnection } = schema;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [companies, members, activity] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        agentId: brainConnection.organizationId,
      })
      .from(organization)
      .leftJoin(
        brainConnection,
        eq(brainConnection.organizationId, organization.id),
      )
      .orderBy(asc(organization.name), asc(organization.id)),
    db
      .select({ id: member.organizationId, total: count() })
      .from(member)
      .groupBy(member.organizationId),
    db
      .select({ id: conversation.organizationId, total: count() })
      .from(conversation)
      .where(
        and(
          eq(conversation.isTest, false),
          gte(conversation.lastMessageAt, since),
        ),
      )
      .groupBy(conversation.organizationId),
  ]);
  const memberCounts = new Map(members.map(({ id, total }) => [id, total]));
  const activityCounts = new Map(activity.map(({ id, total }) => [id, total]));
  return companies.map(({ agentId, ...company }) => ({
    ...company,
    agentConfigured: agentId !== null,
    members: memberCounts.get(company.id) ?? 0,
    conversations: activityCounts.get(company.id) ?? 0,
  }));
}

export type PlatformCompany = Awaited<
  ReturnType<typeof platformCompanies>
>[number];

export async function platformCompany(id: string) {
  const db = getDb();
  const { organization, member, user } = schema;
  const [company] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1);
  if (!company) return null;

  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, id))
    .orderBy(asc(user.name), asc(user.id));

  return { ...company, members };
}
