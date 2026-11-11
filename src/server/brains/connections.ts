import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { multitenantEnabled } from "@/lib/multitenant";
import {
  leerConfigDespacho,
  urlSaludCerebro,
  type ConfigDespacho,
} from "./config";

export function brainKeyHash(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function rotateBrainConnection(
  organizationId: string,
  dispatchUrl: string | null,
  healthUrl: string | null,
) {
  const apiKey = `cp_${randomBytes(32).toString("base64url")}`;
  const secret = encryptSecret(apiKey);
  const values = {
    organizationId,
    keyHash: brainKeyHash(apiKey),
    secretCipher: secret.cipher,
    secretIv: secret.iv,
    secretTag: secret.tag,
    dispatchUrl,
    healthUrl,
    updatedAt: new Date(),
  };
  await getDb()
    .insert(schema.brainConnection)
    .values(values)
    .onConflictDoUpdate({
      target: schema.brainConnection.organizationId,
      set: values,
    });
  return apiKey;
}

export async function getOrganizationBrain(
  organizationId: string,
): Promise<
  ConfigDespacho & { healthUrl: string | null; keyConfigured: boolean }
> {
  if (!multitenantEnabled()) {
    const config = leerConfigDespacho();
    return {
      ...config,
      healthUrl: urlSaludCerebro(),
      keyConfigured: (process.env.BOT_API_KEY?.length ?? 0) >= 16,
    };
  }
  const [row] = await getDb()
    .select()
    .from(schema.brainConnection)
    .where(eq(schema.brainConnection.organizationId, organizationId))
    .limit(1);
  if (!row)
    return {
      active: false,
      host: null,
      problem: null,
      healthUrl: null,
      keyConfigured: false,
    };
  const secret = decryptSecret({
    cipher: row.secretCipher,
    iv: row.secretIv,
    tag: row.secretTag,
  });
  const config = leerConfigDespacho({
    BRAIN_DISPATCH_URL: row.dispatchUrl ?? undefined,
    BOT_API_KEY: secret,
  });
  const healthUrl =
    row.healthUrl ??
    (config.active ? new URL("/health", config.url).toString() : null);
  return { ...config, healthUrl, keyConfigured: true };
}
