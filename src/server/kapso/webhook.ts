import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookMessage, WebhookPayload } from "@/server/inbox/webhook";

type KapsoReceived = {
  phone_number_id?: unknown;
  message?: Record<string, unknown>;
  conversation?: { contact_name?: unknown; phone_number?: unknown; business_scoped_user_id?: unknown };
};

export function firmaKapsoValida(body: string, header: string | null, secret: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(header ?? "")) return false;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest();
  return timingSafeEqual(expected, Buffer.from(header!, "hex"));
}

/** Convierte el evento de mensaje de Kapso al contrato de entrada ya usado por el CRM. */
export function mensajeKapsoAMeta(raw: unknown): WebhookPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const event = raw as KapsoReceived;
  const phoneId = event.phone_number_id;
  const message = event.message;
  if (typeof phoneId !== "string" || !/^\d+$/.test(phoneId) || !message) return null;
  if (typeof message.id !== "string" || typeof message.timestamp !== "string" || typeof message.type !== "string") return null;
  const from = typeof message.from === "string" ? message.from : undefined;
  const fromUserId = typeof message.from_user_id === "string" ? message.from_user_id : undefined;
  if (!from && !fromUserId) return null;
  const normalized: WebhookMessage = {
    ...(message as unknown as WebhookMessage),
    id: message.id,
    timestamp: message.timestamp,
    type: message.type,
    from,
    from_user_id: fromUserId,
  };
  const name = event.conversation?.contact_name;
  const identity = from ?? (typeof event.conversation?.phone_number === "string" ? event.conversation.phone_number : undefined);
  return {
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: {
      messaging_product: "whatsapp",
      metadata: { phone_number_id: phoneId },
      contacts: [{
        ...(identity ? { wa_id: identity } : {}),
        ...(fromUserId ? { user_id: fromUserId } : {}),
        ...(typeof name === "string" ? { profile: { name } } : {}),
      }],
      messages: [normalized],
    } }] }],
  };
}
