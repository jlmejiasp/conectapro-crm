"use client";

import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { PlatformCompany } from "@/server/admin/companies";

export function AdminDirectory({
  companies,
}: {
  companies: PlatformCompany[];
}) {
  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("all");
  const query = search.trim().toLocaleLowerCase("es");
  const visible = companies.filter(
    (company) =>
      [company.name, company.slug].some((value) =>
        value?.toLocaleLowerCase("es").includes(query),
      ) &&
      (agent === "all" || company.agentConfigured === (agent === "configured")),
  );
  return (
    <section className="min-w-0 rounded-xl border bg-card">
      <div className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Directorio de empresas</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-40 flex-1">
            <Search
              aria-hidden
              className="absolute left-3 top-2.5 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Buscar empresa"
              placeholder="Buscar por nombre o identificador"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar por configuración del agente"
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={agent}
            onChange={(event) => setAgent(event.target.value)}
          >
            <option value="all">Todos los agentes</option>
            <option value="configured">Con clave</option>
            <option value="missing">Sin clave</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-y bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3">
                Empresa
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Miembros
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Conversaciones · 7 días
              </th>
              <th scope="col" className="px-3 py-3">
                Agente
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Gestionar</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((company) => (
              <tr key={company.id} className="hover:bg-muted/30">
                <th scope="row" className="px-5 py-3 font-medium">
                  {company.name}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {company.slug}
                  </span>
                </th>
                <td className="px-3 py-3 text-right tabular-nums">
                  {company.members}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {company.conversations}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span
                    className={
                      company.agentConfigured
                        ? "rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {company.agentConfigured ? "Con clave" : "Sin clave"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/empresas/${encodeURIComponent(company.id)}`}
                    aria-label={`Gestionar ${company.name}`}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Gestionar <ArrowUpRight aria-hidden className="size-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p role="status" className="p-6 text-sm text-muted-foreground">
            No se encontraron empresas.
          </p>
        )}
      </div>
    </section>
  );
}
