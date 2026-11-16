import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/multitenant";
import { AUTH_RATE_LIMIT, checkRateLimit } from "@/lib/rate-limit";
import { platformAdminIdentity } from "@/server/admin/access";

const change = z.object({
  organizationId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128),
  adminPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

export async function POST(req: Request) {
  const identity = await platformAdminIdentity(req);
  if (identity.error) return identity.error;
  const actor = identity.auth.user.id;
  const body = await parseBody(req, change);
  if (!body.ok) return body.response;
  const { organizationId, userId, adminPassword, newPassword } = body.data;

  if (isPlatformAdmin(userId)) {
    return apiError(
      403,
      "protected_account",
      "La cuenta de superadmin se gestiona fuera del panel",
    );
  }
  if (!checkRateLimit(`platform-password:${actor}`, AUTH_RATE_LIMIT).allowed) {
    return apiError(
      429,
      "rate_limited",
      "Demasiados intentos. Espera unos minutos",
    );
  }

  const db = getDb();
  const { account, member, session } = schema;
  const credentialOf = (id: string) =>
    and(
      eq(account.userId, id),
      eq(account.providerId, "credential"),
      isNotNull(account.password),
    );
  const [admin] = await db
    .select({ password: account.password })
    .from(account)
    .where(credentialOf(actor))
    .limit(1);
  if (
    !admin?.password ||
    !(await verifyPassword({ hash: admin.password, password: adminPassword }))
  ) {
    return apiError(
      403,
      "invalid_password",
      "La contraseña del superadmin no es correcta",
    );
  }

  const password = await hashPassword(newPassword);
  const changed = await db.transaction(async (tx) => {
    const [membership] = await tx
      .select({ id: member.id })
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, userId),
        ),
      )
      .for("update");
    if (!membership) return false;

    const accounts = await tx
      .select({ id: account.id })
      .from(account)
      .where(credentialOf(userId))
      .limit(2)
      .for("update");
    const [credential] = accounts;
    if (!credential || accounts.length !== 1) return false;

    await tx
      .update(account)
      .set({ password, updatedAt: new Date() })
      .where(eq(account.id, credential.id));
    await tx.delete(session).where(eq(session.userId, userId));
    return true;
  });

  if (!changed) {
    return apiError(
      404,
      "account_unavailable",
      "No se encontró una cuenta con contraseña para ese miembro",
    );
  }
  console.info("[admin] contraseña restablecida", {
    actor,
    organizationId,
    userId,
  });
  return Response.json({ ok: true });
}
