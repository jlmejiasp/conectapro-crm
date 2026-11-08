ALTER TABLE "message" DROP CONSTRAINT "message_wa_message_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "message_org_wa_uq" ON "message" USING btree ("organization_id","wa_message_id");