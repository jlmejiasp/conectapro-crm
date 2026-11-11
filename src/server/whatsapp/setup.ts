import { getEnv } from "@/lib/env";
import { multitenantEnabled } from "@/lib/multitenant";

/** En modo multitenant Kapso solo recibe para la empresa asignada. */
export function whatsappSetup(organizationId: string) {
  const env = getEnv();
  const multitenant = multitenantEnabled();
  const kapso = Boolean(
    env.KAPSO_WEBHOOK_SECRET &&
    (!multitenant || env.KAPSO_ORGANIZATION_ID === organizationId),
  );
  return {
    provider: kapso ? ("kapso" as const) : ("meta" as const),
    canReceive: kapso || !multitenant || Boolean(env.META_APP_SECRET),
  };
}
