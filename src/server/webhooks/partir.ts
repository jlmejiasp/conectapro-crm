/** Divide los lotes de Meta para que cada fila persistida tenga un solo destino. */
export function splitWebhook(fuente: string, payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return [];
  if (fuente === "zernio") return [payload];
  const p = payload as Record<string, unknown>;
  if (!Array.isArray(p.entry)) return [];
  return p.entry.flatMap((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const entry = value as Record<string, unknown>;
    if (fuente === "whatsapp") {
      if (!Array.isArray(entry.changes)) return [];
      return entry.changes.map((change) => ({
        ...p,
        entry: [{ ...entry, changes: [change] }],
      }));
    }
    return [{ ...p, entry: [entry] }];
  });
}
