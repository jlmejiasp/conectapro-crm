import Link from "next/link";
import {
  Building2,
  KeyRound,
  MessagesSquare,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AdminDirectory } from "@/components/admin-directory";
import { CreateCompanyForm } from "@/components/admin-organization-forms";
import { requirePlatformAdmin } from "@/server/admin/access";
import { platformCompanies } from "@/server/admin/companies";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requirePlatformAdmin();
  const companies = await platformCompanies();
  const cards = [
    { label: "Empresas", value: companies.length, icon: Building2 },
    {
      label: "Membresías",
      value: companies.reduce((total, c) => total + c.members, 0),
      icon: Users,
    },
    {
      label: "Conversaciones · 7 días",
      value: companies.reduce((total, c) => total + c.conversations, 0),
      icon: MessagesSquare,
    },
    {
      label: "Empresas con clave de agente",
      value: companies.filter((c) => c.agentConfigured).length,
      icon: KeyRound,
    },
  ];

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <span className="inline-flex items-center gap-2 font-semibold">
            <ShieldCheck aria-hidden className="size-5 text-primary" />{" "}
            ConectaPro
          </span>
          <Link
            href="/organizations"
            className="text-sm font-medium text-primary hover:underline"
          >
            Volver a tus empresas
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-primary">Superadmin</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Administración de plataforma
            </h1>
          </div>
          <a
            href="#alta-empresa"
            className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
          >
            <Plus aria-hidden className="size-4" /> Nueva empresa
          </a>
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <dt className="flex items-start gap-2 text-sm text-muted-foreground">
                <Icon aria-hidden className="size-4 shrink-0 text-primary" />{" "}
                {label}
              </dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums">
                {value.toLocaleString("es-ES")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          Las conversaciones cuentan hilos reales con actividad en los últimos 7
          días. Una persona puede tener varias membresías.
        </p>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <AdminDirectory companies={companies} />
          <section
            id="alta-empresa"
            className="scroll-mt-5 rounded-xl border bg-card p-5"
          >
            <h2 className="mb-4 text-lg font-semibold">
              Dar de alta una empresa
            </h2>
            <CreateCompanyForm />
          </section>
        </div>
      </div>
    </main>
  );
}
