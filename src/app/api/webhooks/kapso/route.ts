import { multitenantEnabled } from "@/lib/multitenant";
import { resolverOrganizacion } from "@/server/webhooks/organizacion";
import { getEnv } from "@/lib/env";
import { firmaKapsoValida, mensajeKapsoAMeta } from "@/server/kapso/webhook";
import { recibirEvento } from "@/server/webhooks/recibir";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = getEnv().KAPSO_WEBHOOK_SECRET;
  if (!secret) return new Response(null, { status: 404 });
  const body = await req.text();
  if (body.length > 1_000_000 || !firmaKapsoValida(body, req.headers.get("x-webhook-signature"), secret)) {
    return new Response(null, { status: 401 });
  }
  if (req.headers.get("x-webhook-event") !== "whatsapp.message.received") {
    return Response.json({ received: true });
  }
  let event: unknown;
  try { event = JSON.parse(body); } catch { return new Response(null, { status: 400 }); }
  const payload = mensajeKapsoAMeta(event);
  if (!payload) return new Response(null, { status: 422 });
  if (multitenantEnabled() && (!getEnv().KAPSO_ORGANIZATION_ID || await resolverOrganizacion("whatsapp", payload) !== getEnv().KAPSO_ORGANIZATION_ID)) {
    return new Response(null, { status: 401 });
  }
  return recibirEvento("whatsapp", payload, body, "kapso");
}
