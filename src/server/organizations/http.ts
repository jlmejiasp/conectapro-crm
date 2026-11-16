import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { multitenantEnabled } from "@/lib/multitenant";

import { sameOrigin } from "@/lib/request-origin";

export async function platformIdentity(req?: Request) {
  if (!multitenantEnabled())
    return { error: apiError(404, "not_found", "No encontrado") } as const;
  if (req && req.method !== "GET" && !sameOrigin(req))
    return {
      error: apiError(403, "forbidden", "Origen no permitido"),
    } as const;
  const auth = await getAuth().api.getSession({ headers: await headers() });
  if (!auth)
    return { error: apiError(401, "unauthorized", "No autenticado") } as const;
  return { auth } as const;
}
