import { redirect } from "next/navigation";
import { canConfigure } from "@/lib/auth/roles";
import { getSessionOrNull } from "@/lib/auth/session";
import { WhatsappWizard } from "@/components/settings/whatsapp-wizard";

export const dynamic = "force-dynamic";

export default async function WhatsappSettingsPage() {
  const session = await getSessionOrNull();
  if (!canConfigure(session?.role)) redirect("/settings");
  return <WhatsappWizard />;
}
