import { afterEach, expect, it, vi } from "vitest";
import { aiDestinationAllowed, aiRedirectPolicy } from "@/lib/ai/destinations";

afterEach(() => vi.unstubAllEnvs());

it("solo permite el proveedor integrado y las bases HTTPS aprobadas en multitenant", () => {
  vi.stubEnv("MULTITENANT", "true");
  vi.stubEnv(
    "MULTITENANT_AI_ALLOWED_BASE_URLS",
    "https://proveedor.example/api/v1",
  );
  expect(aiDestinationAllowed("https://openrouter.ai/api")).toBe(true);
  expect(aiDestinationAllowed("https://proveedor.example/api/")).toBe(true);
  expect(aiDestinationAllowed("https://proveedor.example/otra-api")).toBe(
    false,
  );
  expect(aiDestinationAllowed("https://otro-proveedor.example/api")).toBe(
    false,
  );
  expect(aiDestinationAllowed("http://proveedor.example/api")).toBe(false);
  expect(aiDestinationAllowed("https://proveedor.example/api?opcion=1")).toBe(
    false,
  );
  expect(aiRedirectPolicy()).toBe("error");
});

it("preserva las bases personalizadas en el modo de una sola empresa", () => {
  vi.stubEnv("MULTITENANT", "false");
  expect(aiDestinationAllowed("http://proveedor.local/api")).toBe(true);
  expect(aiRedirectPolicy()).toBe("follow");
});
