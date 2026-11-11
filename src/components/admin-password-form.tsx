"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminPasswordForm({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setDone(false);
    setError("");
    if (data.get("newPassword") !== data.get("confirmPassword")) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          userId,
          adminPassword: data.get("adminPassword"),
          newPassword: data.get("newPassword"),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? "No se pudo cambiar la contraseña.",
        );
      }
      form.reset();
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-primary">
        Restablecer contraseña
      </summary>
      <form onSubmit={submit} className="mt-3 max-w-md space-y-3">
        <p className="text-muted-foreground">
          El cambio se aplica a toda la cuenta y cierra sus sesiones en todas
          las empresas a las que pertenece.
        </p>
        <label className="block">
          Tu contraseña de superadmin
          <Input
            name="adminPassword"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </label>
        <label className="block">
          Nueva contraseña de la cuenta
          <Input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <label className="block">
          Repetir nueva contraseña
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Cambiar contraseña y cerrar sesiones"}
        </Button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {done && <p role="status">Contraseña cambiada y sesiones cerradas.</p>}
      </form>
    </details>
  );
}
