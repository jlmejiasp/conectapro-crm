import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { member } from "@/lib/db/schema";

const estado = vi.hoisted(() => ({
  filas: [] as { organizationId: string; role: string }[],
  condicion: null as unknown,
  limite: 0,
}));

vi.mock("@/lib/db", () => ({
  schema: { member },
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: (condicion: unknown) => {
          estado.condicion = condicion;
          return {
            limit: async (limite: number) => {
              estado.limite = limite;
              return estado.filas.slice(0, limite);
            },
          };
        },
      }),
    }),
  }),
}));

import { resolveMembership } from "@/server/auth/on-signup";

beforeEach(() => {
  estado.filas = [];
  estado.condicion = null;
});

describe("resolución de membresía", () => {
  it("restringe la consulta al usuario y a la organización activa", async () => {
    estado.filas = [{ organizationId: "org_a", role: "owner" }];
    expect(await resolveMembership("user_a", "org_a")).toEqual(estado.filas[0]);
    const query = new PgDialect().sqlToQuery(estado.condicion as never);
    expect(query.params).toEqual(["user_a", "org_a"]);
    expect(query.sql).toContain("user_id");
    expect(query.sql).toContain("organization_id");
  });

  it("deniega una membresía ausente o revocada", async () => {
    expect(await resolveMembership("user_a", "org_b")).toBeNull();
  });

  it("admite sesión antigua sin organización solo con una membresía", async () => {
    estado.filas = [{ organizationId: "org_a", role: "member" }];
    expect(await resolveMembership("user_a", null)).toEqual(estado.filas[0]);
    expect(estado.limite).toBe(2);
    estado.filas.push({ organizationId: "org_b", role: "owner" });
    expect(await resolveMembership("user_a", null)).toBeNull();
  });

  it("deniega membresías duplicadas con roles ambiguos", async () => {
    estado.filas = [
      { organizationId: "org_a", role: "member" },
      { organizationId: "org_a", role: "owner" },
    ];
    expect(await resolveMembership("user_a", "org_a")).toBeNull();
  });
});
