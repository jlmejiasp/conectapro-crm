import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  sesion: null as null | {
    user: { id: string };
    session: { activeOrganizationId: string | null };
  },
  resolver: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession: async () => estado.sesion } }),
}));
vi.mock("@/server/auth/on-signup", () => ({
  resolveMembership: estado.resolver,
}));

import { requireSession } from "@/lib/auth/session";

beforeEach(() => {
  estado.sesion = {
    user: { id: "user_a" },
    session: { activeOrganizationId: "org_b" },
  };
  estado.resolver.mockReset();
});

describe("sesión de organización activa", () => {
  it("usa la organización de la sesión y el rol verificado en BD", async () => {
    estado.resolver.mockResolvedValue({
      organizationId: "org_b",
      role: "member",
    });
    await expect(requireSession()).resolves.toEqual({
      userId: "user_a",
      organizationId: "org_b",
      role: "member",
    });
    expect(estado.resolver).toHaveBeenCalledWith("user_a", "org_b");
  });

  it("deniega acceso si la membresía seleccionada fue revocada", async () => {
    estado.resolver.mockResolvedValue(null);
    await expect(requireSession()).rejects.toThrow(
      "Sesión sin organización activa",
    );
    expect(estado.resolver).toHaveBeenCalledTimes(1);
  });

  it("no autoriza solicitudes sin sesión", async () => {
    estado.sesion = null;
    await expect(requireSession()).rejects.toThrow("No autenticado");
    expect(estado.resolver).not.toHaveBeenCalled();
  });
});
