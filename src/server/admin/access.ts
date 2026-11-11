import { notFound, redirect } from "next/navigation";
import { apiError } from "@/lib/api";
import { isPlatformAdmin } from "@/lib/multitenant";
import { platformIdentity } from "@/server/organizations/http";

export async function platformAdminIdentity(req?: Request) {
  const identity = await platformIdentity(req);
  if (identity.error) return identity;
  if (!isPlatformAdmin(identity.auth.user.id)) {
    return {
      error: apiError(403, "forbidden", "Acceso reservado al superadmin"),
    } as const;
  }
  return identity;
}

export async function requirePlatformAdmin() {
  const identity = await platformAdminIdentity();
  if (identity.error?.status === 401) redirect("/login");
  if (identity.error) notFound();
  return identity.auth.user;
}
