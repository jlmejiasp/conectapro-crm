"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [notice, setNotice] = useState("");
  async function load() {
    try {
      const res = await fetch("/api/organizations", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar tus empresas");
      const data = await res.json();
      setCompanies(data.organizations);
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
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (!data.password) delete data.password;
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error?.message ?? "No se pudo crear la empresa");
      form.reset();
      setNotice("Empresa creada. Su propietario ya puede iniciar sesión.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-primary underline">
          Volver al CRM
        </Link>
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
      {notice && <p role="status">{notice}</p>}
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
          {admin && <BrainConnectionForm id={c.id} />}
        </section>
      ))}
      {admin && (
        <form onSubmit={create} className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Crear empresa</h2>
          <label className="block text-sm">
            Nombre de empresa
            <Input name="name" required maxLength={120} />
          </label>
          <label className="block text-sm">
            Identificador
            <Input
              name="slug"
              required
              pattern="[a-z0-9][a-z0-9-]{1,59}"
              placeholder="mi-empresa"
            />
          </label>
          <label className="block text-sm">
            Nombre del propietario
            <Input name="ownerName" required maxLength={120} />
          </label>
          <label className="block text-sm">
            Correo del propietario
            <Input name="ownerEmail" required type="email" />
          </label>
          <label className="block text-sm">
            Contraseña inicial
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Obligatoria para cuentas nuevas. Una cuenta existente conserva su
            contraseña.
          </p>
          <Button disabled={busy} type="submit">
            Crear empresa
          </Button>
        </form>
      )}
    </div>
  );
}
function BrainConnectionForm({ id }: { id: string }) {
  const [config, setConfig] = useState<{
    dispatchUrl: string;
    healthUrl: string;
  } | null>(null);
  const [result, setResult] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  async function loadConfig() {
    try {
      const res = await fetch(`/api/organizations/${id}/brain`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      setConfig(await res.json());
    } catch {
      setResult(
        "No se pudo cargar la conexión. Cierra y vuelve a abrir este panel para reintentar.",
      );
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult("");
    setKey("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`/api/organizations/${id}/brain`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "No se pudo guardar");
      setKey(body.apiKey);
      setResult(
        "Conexión guardada. La clave anterior deja de funcionar. Copia esta clave ahora: se muestra una sola vez.",
      );
    } catch (e) {
      setResult((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    setBusy(true);
    setKey("");
    try {
      const res = await fetch(`/api/organizations/${id}/brain`, {
        method: "DELETE",
      });
      setResult(
        res.ok
          ? "Clave revocada y agente desconectado."
          : "No se pudo revocar la clave",
      );
    } catch {
      setResult("No se pudo revocar la clave");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="text-sm"
      onToggle={(e) => {
        if (e.currentTarget.open && !config) void loadConfig();
      }}
    >
      <summary className="cursor-pointer">Conexión del agente</summary>
      {!config && <p role="status">{result || "Cargando conexión…"}</p>}
      {config && (
        <form onSubmit={save} className="mt-3 space-y-3">
          <label className="block">
            Dirección de despacho
            <Input
              type="url"
              name="dispatchUrl"
              defaultValue={config.dispatchUrl}
              placeholder="https://agente.example.com/dispatch"
            />
          </label>
          <label className="block">
            Dirección de estado
            <Input
              type="url"
              name="healthUrl"
              defaultValue={config.healthUrl}
              placeholder="https://agente.example.com/health"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Guardar genera una clave nueva. Sin dirección de despacho, el agente
            solo puede usar la API.
          </p>
          <Button disabled={busy} type="submit">
            Guardar y generar clave
          </Button>{" "}
          <Button
            disabled={busy}
            type="button"
            variant="outline"
            onClick={() => void revoke()}
          >
            Revocar clave
          </Button>
          {result && <p role="status">{result}</p>}
          {key && (
            <code className="block break-all rounded border p-3">{key}</code>
          )}
        </form>
      )}
    </details>
  );
}
