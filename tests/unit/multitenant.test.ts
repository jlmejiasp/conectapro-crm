import { afterEach, describe, expect, it, vi } from "vitest";
import { multitenantEnabled, isPlatformAdmin } from "@/lib/multitenant";
import { splitWebhook } from "@/server/webhooks/partir";
import { envAiProvider } from "@/lib/ai/provider";
import { publish, subscribe } from "@/server/events/bus";

afterEach(() => vi.unstubAllEnvs());
describe("plataforma multitenant", () => {
  it("solo una bandera explícita activa la plataforma y sus administradores", () => {
    vi.stubEnv("PLATFORM_ADMIN_USER_IDS", "user_a, user_b");
    vi.stubEnv("MULTITENANT", "false");
    expect(isPlatformAdmin("user_a")).toBe(false);
    vi.stubEnv("MULTITENANT", "true");
    expect(multitenantEnabled()).toBe(true);
    expect(isPlatformAdmin("user_a")).toBe(true);
    expect(isPlatformAdmin("user")).toBe(false);
    expect(isPlatformAdmin("")).toBe(false);
  });
  it("no ofrece el proveedor global de IA a empresas de la plataforma", () => {
    vi.stubEnv("MULTITENANT", "true");
    vi.stubEnv("OPENROUTER_API_TOKEN", "clave-global");
    vi.stubEnv("OPENROUTER_MODEL", "modelo-global");
    expect(envAiProvider()).toBeNull();
  });
  it("divide un lote de WhatsApp por entrada y cambio sin mezclar cuentas", () => {
    const input = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba_a",
          changes: [
            { value: { metadata: { phone_number_id: "phone_a" } } },
            { value: { metadata: { phone_number_id: "phone_b" } } },
          ],
        },
        {
          id: "waba_c",
          changes: [{ field: "message_template_status_update", value: {} }],
        },
      ],
    };
    const fragments = splitWebhook("whatsapp", input) as (typeof input)[];
    expect(fragments).toHaveLength(3);
    expect(
      fragments.every(
        (p) => p.entry.length === 1 && p.entry[0]!.changes.length === 1,
      ),
    ).toBe(true);
    expect(input.entry[0]!.changes).toHaveLength(2);
    expect(fragments[1]!.entry[0]!.changes[0]!.value).toEqual({
      metadata: { phone_number_id: "phone_b" },
    });
  });
  it("los eventos de una empresa no llegan a los suscriptores de otra", () => {
    const a = vi.fn(),
      b = vi.fn();
    const offA = subscribe("org_test_a", a),
      offB = subscribe("org_test_b", b);
    try {
      publish("org_test_a", {
        type: "conversation.updated",
        data: { conversation: { id: "privada_a" } },
      });
      expect(a).toHaveBeenCalledOnce();
      expect(b).not.toHaveBeenCalled();
    } finally {
      offA();
      offB();
    }
  });
});
