import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { platformIdentity } from "@/server/organizations/http";
import { selectOrganization } from "@/server/organizations/service";

export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const identity = await platformIdentity(req);
  if (identity.error) return identity.error;
  const body = await parseBody(
    req,
    z.object({ organizationId: z.string().min(1).max(100) }),
  );
  if (!body.ok) return body.response;
  const ok = await selectOrganization(
    identity.auth.user.id,
    identity.auth.session.id,
    body.data.organizationId,
  );
  return ok
    ? Response.json({ ok: true })
    : apiError(403, "forbidden", "No perteneces a esa empresa");
}
