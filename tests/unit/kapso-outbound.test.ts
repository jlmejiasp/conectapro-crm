import { afterEach, describe, expect, it, vi } from "vitest";
import { graphRequest } from "@/lib/meta/client";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    KAPSO_API_KEY: "kapso-test-key",
    KAPSO_API_BASE_URL: "https://api.kapso.ai/meta/whatsapp",
    META_GRAPH_BASE_URL: "https://graph.facebook.com",
    META_GRAPH_API_VERSION: "v25.0",
  }),
}));

afterEach(() => vi.unstubAllGlobals());

describe("WhatsApp outbound via Kapso", () => {
  it("envía el payload Cloud API con la clave Kapso y nunca transmite el token Meta", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const payload = {
      messaging_product: "whatsapp",
      to: "34644121108",
      type: "text",
      text: { body: "Prueba" },
    };

    const result = await graphRequest<{ messages: { id: string }[] }>(
      "735644199624499/messages",
      { method: "POST", token: "meta-secret", body: payload, viaKapso: true }
    );

    expect(result.messages[0]?.id).toBe("wamid.test");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.kapso.ai/meta/whatsapp/v24.0/735644199624499/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          "X-API-Key": "kapso-test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
    );
  });

  it("mantiene las consultas de Meta fuera de Kapso", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "2135628807310111" }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await graphRequest("2135628807310111", { token: "meta-secret" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/2135628807310111",
      expect.objectContaining({
        headers: { Authorization: "Bearer meta-secret" },
      })
    );
  });
});
