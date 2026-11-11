import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { getAuth, runInternalSignup } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/multitenant";
import { platformIdentity } from "@/server/organizations/http";
import {
  createOrganization,
  listOrganizations,
} from "@/server/organizations/service";

export const dynamic = "force-dynamic";
export async function GET() {
  const identity = await platformIdentity();
  if (identity.error) return identity.error;
  const { user, session } = identity.auth;
  const memberships = await listOrganizations(user.id);
  const organizations = isPlatformAdmin(user.id)
    ? (
        await getDb()
          .select({
            id: schema.organization.id,
            name: schema.organization.name,
            slug: schema.organization.slug,
          })
          .from(schema.organization)
      ).map((org) => ({
        ...org,
        role: memberships.find((m) => m.id === org.id)?.role ?? null,
      }))
    : memberships;
  return Response.json(
    {
      organizations,
      activeOrganizationId: session.activeOrganizationId,
      platformAdmin: isPlatformAdmin(user.id),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
const create = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,59}$/),
  ownerEmail: z.string().trim().email(),
  ownerName: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(128).optional(),
});
export async function POST(req: Request) {
  const identity = await platformIdentity(req);
  if (identity.error) return identity.error;
  if (!isPlatformAdmin(identity.auth.user.id))
    return apiError(
      403,
      "forbidden",
      "Solo el administrador de plataforma puede crear empresas",
    );
  const body = await parseBody(req, create);
  if (!body.ok) return body.response;
  const data = body.data;
  const db = getDb();
  const [duplicate] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.slug, data.slug))
    .limit(1);
  if (duplicate)
    return apiError(
      409,
      "duplicate",
      "Ese identificador de empresa ya está en uso",
    );
  let [owner] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, data.ownerEmail.toLowerCase()))
    .limit(1);
  if (!owner) {
    if (!data.password)
      return apiError(
        422,
        "password_required",
        "Indica una contraseña inicial para el nuevo propietario",
      );
    try {
      const result = await runInternalSignup(() =>
        getAuth().api.signUpEmail({
          body: {
            name: data.ownerName,
            email: data.ownerEmail.toLowerCase(),
            password: data.password!,
          },
        }),
      );
      owner = { id: result.user.id };
    } catch {
      return apiError(
        409,
        "account_conflict",
        "No se pudo crear la cuenta del propietario. Revisa el correo e inténtalo de nuevo",
      );
    }
  }
  try {
    const organization = await createOrganization({
      name: data.name,
      slug: data.slug,
      ownerId: owner.id,
    });
    return Response.json({ organization }, { status: 201 });
  } catch (error) {
    if (
      (error as { cause?: { code?: string }; code?: string }).code ===
        "23505" ||
      (error as { cause?: { code?: string } }).cause?.code === "23505"
    )
      return apiError(
        409,
        "duplicate",
        "Ese identificador de empresa ya está en uso",
      );
    return apiError(500, "internal", "No se pudo crear la empresa");
  }
}
