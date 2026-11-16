import { afterEach, describe, expect, it, vi } from "vitest";
import { whatsappSetup } from "@/server/whatsapp/setup";

const env = vi.hoisted(() => ({
  KAPSO_WEBHOOK_SECRET: "kapso-de-prueba",
  KAPSO_ORGANIZATION_ID: "principal",
  META_APP_SECRET: "",
}));

vi.mock("@/lib/env", () => ({ getEnv: () => env }));

afterEach(() => {
  vi.unstubAllEnvs();
  env.META_APP_SECRET = "";
});

describe("recepción de WhatsApp por empresa", () => {
  it("reserva Kapso a la empresa asignada y exige firma para Meta", () => {
    vi.stubEnv("MULTITENANT", "true");
    expect(whatsappSetup("principal")).toEqual({
      provider: "kapso",
      canReceive: true,
    });
    expect(whatsappSetup("nueva")).toEqual({
      provider: "meta",
      canReceive: false,
    });
    env.META_APP_SECRET = "meta-de-prueba";
    expect(whatsappSetup("nueva")).toEqual({
      provider: "meta",
      canReceive: true,
    });
  });

  it("conserva Kapso en el modo de una sola empresa", () => {
    vi.stubEnv("MULTITENANT", "false");
    expect(whatsappSetup("instancia")).toEqual({
      provider: "kapso",
      canReceive: true,
    });
  });
});
