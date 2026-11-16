"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { limpiarBorradores } from "@/lib/borradores";

type Company = {
  id: string;
  name: string;
  slug: string | null;
  role: string | null;
};
export function OrganizationsClient() {
  const [active, setActive] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      const res = await fetch("/api/organizations", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar tus empresas");
      const data = await res.json();
      setCompanies(
        (data.organizations as Company[]).filter((company) => company.role),
      );
      setAdmin(data.platformAdmin);
      setActive(data.activeOrganizationId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function enter(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/organizations/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: id }),
      });
      if (!res.ok) throw new Error("No puedes acceder a esta empresa");
      limpiarBorradores();
      try {
        localStorage.setItem(
          "conectapro-company-changed",
          `${id}:${Date.now()}`,
        );
      } catch {
        /* La selección ya está guardada; funciona sin almacenamiento local. */
      }
      // Recarga completa: descarta lista, hilos y conexiones SSE del negocio anterior.
      window.location.assign("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-primary underline">
          Volver al CRM
        </Link>
        {admin && (
          <Link
            href="/admin"
            className="ml-4 text-sm font-medium text-primary underline"
          >
            Administración de plataforma
          </Link>
        )}
        <h1 className="mt-4 text-2xl font-semibold">Tus empresas</h1>
        <p className="text-muted-foreground">
          Elige el espacio en el que quieres trabajar.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {loading && <p>Cargando empresas…</p>}
      {!loading && companies.length === 0 && (
        <p>No tienes empresas asignadas. Contacta con el administrador.</p>
      )}
      {companies.map((c) => (
        <section key={c.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">{c.name}</h2>
              {active === c.id && (
                <p className="text-xs text-primary">Empresa activa</p>
              )}
              <p className="text-sm text-muted-foreground">
                {c.slug}
                {c.role
                  ? ` · ${c.role === "owner" ? "Propietario" : c.role === "admin" ? "Administrador" : "Equipo"}`
                  : ""}
              </p>
            </div>
            {c.role && (
              <Button disabled={busy} onClick={() => void enter(c.id)}>
                Entrar
              </Button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
