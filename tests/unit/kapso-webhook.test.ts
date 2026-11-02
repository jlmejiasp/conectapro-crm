import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { firmaKapsoValida, mensajeKapsoAMeta } from "@/server/kapso/webhook";

describe("entrada de Kapso", () => {
  it("acepta la firma del cuerpo exacto y rechaza alteraciones", () => {
    const body = '{"message":"hola"}';
    const secret = "secreto-de-prueba";
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(firmaKapsoValida(body, signature, secret)).toBe(true);
    expect(firmaKapsoValida(body + " ", signature, secret)).toBe(false);
    expect(firmaKapsoValida(body, null, secret)).toBe(false);
  });

  it("enruta un mensaje recibido al número conectado conservando su identidad", () => {
    const payload = mensajeKapsoAMeta({
      phone_number_id: "735644199624499",
      message: { id: "wamid.1", timestamp: "1730092800", type: "text", from: "34600111222", text: { body: "Hola" } },
      conversation: { contact_name: "Cliente", phone_number: "34600111222" },
    });
    expect(payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id).toBe("735644199624499");
    expect(payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body).toBe("Hola");
    expect(payload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name).toBe("Cliente");
  });

  it("rechaza eventos sin identidad o número para evitar asignarlos a otro negocio", () => {
    expect(mensajeKapsoAMeta({ phone_number_id: "123", message: { id: "1", timestamp: "1", type: "text" } })).toBeNull();
    expect(mensajeKapsoAMeta({ phone_number_id: "otro", message: { id: "1", timestamp: "1", type: "text", from: "123" } })).toBeNull();
  });
});
