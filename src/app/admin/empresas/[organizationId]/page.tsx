import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminPasswordForm } from "@/components/admin-password-form";
import { BrainConnectionForm } from "@/components/admin-organization-forms";
import { isPlatformAdmin } from "@/lib/multitenant";
import { requirePlatformAdmin } from "@/server/admin/access";
import { platformCompany } from "@/server/admin/companies";

export const dynamic = "force-dynamic";

export default async function AdminCompanyPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  await requirePlatformAdmin();
  const { organizationId } = await params;
  const company = await platformCompany(organizationId);
  if (!company) notFound();

  return (
    <main className="min-h-screen bg-muted/30 p-5 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6 py-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> Administración de
          plataforma
        </Link>
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            {company.name}
          </h1>
          <p className="text-muted-foreground">{company.slug}</p>
        </header>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Agente</h2>
          <BrainConnectionForm id={company.id} />
        </section>
        <section className="rounded-xl border bg-card">
          <h2 className="px-5 py-4 text-lg font-semibold">
            Miembros de la empresa
          </h2>
          {company.members.length === 0 && (
            <p className="px-5 pb-5 text-sm text-muted-foreground">
              No hay miembros asignados.
            </p>
          )}
          <ul className="divide-y border-t">
            {company.members.map((member) => (
              <li key={member.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 break-words">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs">
                    {member.role === "owner"
                      ? "Propietario"
                      : member.role === "admin"
                        ? "Administrador"
                        : "Equipo"}
                  </span>
                </div>
                {isPlatformAdmin(member.id) ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cuenta de superadmin protegida
                  </p>
                ) : (
                  <AdminPasswordForm
                    organizationId={company.id}
                    userId={member.id}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
