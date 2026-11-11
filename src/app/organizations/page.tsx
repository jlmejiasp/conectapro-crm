import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { multitenantEnabled } from "@/lib/multitenant";
import { OrganizationsClient } from "@/components/organizations-client";

export const dynamic = "force-dynamic";
export default async function OrganizationsPage() {
  if (!multitenantEnabled()) notFound();
  const auth = await getAuth().api.getSession({ headers: await headers() });
  if (!auth) redirect("/login");
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-3xl">
        <OrganizationsClient />
      </div>
    </main>
  );
}
