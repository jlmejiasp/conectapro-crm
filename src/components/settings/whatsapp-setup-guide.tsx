"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, MessageSquare, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type WhatsappSetup = { provider: "kapso" | "meta"; canReceive: boolean };

type Progress = {
  conversationId: string | null;
  confirmedByRecipient: boolean;
  reply: "pending" | "sent" | "delivered" | "read" | "failed" | null;
};

export function WhatsappSetupGuide({
  setup,
  phone,
}: {
  setup: WhatsappSetup;
  phone: { id: string; display: string | null } | null;
}) {
  const kapso = setup.provider === "kapso";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare aria-hidden className="size-5 text-primary" />
          Guía de WhatsApp
        </CardTitle>
        <CardDescription>
          Conecta el número de tu empresa y comprueba que puedes recibir y
          responder mensajes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4 text-sm">
          <li className="rounded-lg border p-4">
            <h3 className="font-medium">1. Prepara tu número</h3>
            <p className="mt-1 text-muted-foreground">
              {kapso
                ? "Ten a mano el número vinculado a Kapso. Si vas a cambiarlo, coordina primero el cambio con quien administra esa conexión."
                : "Ten a mano el número de tu empresa y acceso de administrador a Meta Business. Si el número ya está en otro CRM, consulta cómo trasladarlo antes de cambiar la conexión."}
            </p>
          </li>
          <li className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">2. Conecta WhatsApp</h3>
              {phone && <Badge variant="success">Conexión guardada</Badge>}
            </div>
            {!setup.canReceive ? (
              <p className="mt-1 text-muted-foreground">
                La firma de Meta aún no está habilitada. Pide al administrador
                de ConectaPro que active la recepción para poder conectar tu
                número.
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">
                {kapso
                  ? "Kapso recibe los mensajes de esta empresa. Usa el formulario de abajo si necesitas validar o actualizar las credenciales."
                  : "Usa «Conectar con Meta» si aparece abajo. Si tu cuenta ya está configurada en Meta, completa el formulario manual, valida el token y guarda."}
              </p>
            )}
            {setup.canReceive && (
              <a
                className="mt-2 inline-block font-medium text-primary underline"
                href="#configurar-numero"
              >
                Ir a la configuración
              </a>
            )}
          </li>
          {phone && setup.canReceive ? (
            <WhatsappMessageCheck key={phone.id} phone={phone} />
          ) : (
            <>
              <li className="rounded-lg border p-4">
                <h3 className="font-medium">3. Comprueba la recepción</h3>
                <p className="mt-1 text-muted-foreground">
                  Disponible cuando el número pueda recibir mensajes.
                </p>
              </li>
              <li className="rounded-lg border p-4">
                <h3 className="font-medium">4. Comprueba la respuesta</h3>
                <p className="mt-1 text-muted-foreground">
                  Responde desde la bandeja tras recibir tu mensaje de prueba.
                </p>
              </li>
            </>
          )}
        </ol>
      </CardContent>
    </Card>
  );
}

function WhatsappMessageCheck({
  phone,
}: {
  phone: { id: string; display: string | null };
}) {
  const storageKey = `conectapro:whatsapp-prueba:${phone.id}`;
  const [code, setCode] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const providerConfirmed =
    progress?.reply === "delivered" || progress?.reply === "read";
  const complete = providerConfirmed || progress?.confirmedByRecipient;
  const conversationId = progress?.conversationId;

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved && /^CP-[0-9A-F]{12}$/.test(saved)) setCode(saved);
    } catch {
      // El seguimiento en el formulario funciona aunque el almacenamiento esté bloqueado.
    }
  }, [storageKey]);

  function start() {
    const next = `CP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    setCode(next);
    setProgress(null);
    setError("");
    setCopied(false);
    try {
      sessionStorage.setItem(storageKey, next);
    } catch {
      // La prueba sigue disponible hasta que se cierre el formulario.
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/settings/whatsapp/prueba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phoneNumberId: phone.id }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message ?? "No pudimos comprobar la prueba.",
        );
      setProgress(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos comprobar la prueba.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <li className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">3. Comprueba la recepción</h3>
          {conversationId && <Badge variant="success">Mensaje recibido</Badge>}
        </div>
        {!code ? (
          <>
            <p className="text-muted-foreground">
              Genera un código de prueba y envíalo desde otro móvil por
              WhatsApp.
            </p>
            <Button type="button" variant="outline" onClick={start}>
              Iniciar prueba
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Envía únicamente este código{" "}
              {phone.display ? (
                <>
                  al <strong>{phone.display}</strong>
                </>
              ) : (
                "al número conectado"
              )}
              . Luego pulsa «Comprobar».
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="select-all rounded-md bg-muted px-3 py-2">
                {code}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                <Copy aria-hidden className="mr-1 size-4" />{" "}
                {copied ? "Copiado" : "Copiar código"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void verify()}
                disabled={busy}
              >
                <RefreshCw aria-hidden className="mr-1 size-4" />{" "}
                {busy ? "Comprobando…" : "Comprobar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={start}
                disabled={busy}
              >
                Generar otro código
              </Button>
            </div>
            {progress && !conversationId && (
              <p role="status" className="text-muted-foreground">
                El código aún no aparece en la bandeja. Comprueba el número y el
                texto exacto, y vuelve a intentarlo.
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </li>
      <li className="space-y-2 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">4. Comprueba la respuesta</h3>
          {complete && (
            <Badge variant="success">
              <CheckCircle2 aria-hidden className="mr-1 size-3.5" /> WhatsApp
              probado
            </Badge>
          )}
        </div>
        <p role="status" className="text-muted-foreground">
          {providerConfirmed
            ? "WhatsApp confirmó la entrega de tu respuesta."
            : progress?.confirmedByRecipient
              ? "El móvil de prueba confirmó que recibió tu respuesta."
              : progress?.reply === "failed"
                ? "El envío falló. Abre la conversación, revisa el aviso de la bandeja y vuelve a intentarlo."
                : progress?.reply === "pending" || progress?.reply === "sent"
                  ? "Esperando la confirmación de entrega de WhatsApp. Vuelve a pulsar «Comprobar» en unos segundos."
                  : "Cuando llegue el código, responde desde esa conversación. Vuelve aquí y pulsa «Comprobar» para confirmar la entrega."}
        </p>
        {progress?.reply === "sent" && !complete && (
          <p className="text-muted-foreground">
            Si la respuesta ya aparece en el otro móvil pero el proveedor no
            confirma la entrega, envía desde ese mismo móvil{" "}
            <code className="select-all font-medium text-foreground">
              CONFIRMO {code}
            </code>{" "}
            y pulsa «Comprobar».
          </p>
        )}
        {conversationId && (
          <Link
            className="inline-block font-medium text-primary underline"
            href={`/inbox?conversation=${encodeURIComponent(conversationId)}`}
          >
            Abrir conversación de prueba
          </Link>
        )}
      </li>
    </>
  );
}
