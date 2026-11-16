-- Relaciones compuestas de defensa: el tenant de cada fila debe coincidir con el de sus referencias.
-- Complementan las FKs existentes, que conservan sus reglas de cascada.
-- Deferrables para que las cascadas y SET NULL existentes terminen antes de comprobarlas.
--> statement-breakpoint
CREATE UNIQUE INDEX "ad_attribution_org_id_uq" ON "ad_attribution" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_profile_org_id_uq" ON "agent_profile" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_case_org_id_uq" ON "agent_test_case" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_run_org_id_uq" ON "agent_test_run" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_credentials_org_id_uq" ON "ai_credentials" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "booking_org_id_uq" ON "booking" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_settings_org_id_uq" ON "calendar_settings" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "capi_settings_org_id_uq" ON "capi_settings" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_org_id_uq" ON "contact" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_org_id_uq" ON "conversation" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_note_org_id_uq" ON "conversation_note" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "conversion_event_org_id_uq" ON "conversion_event" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "dispatch_org_id_uq" ON "dispatch" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "google_credentials_org_id_uq" ON "google_credentials" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_credentials_org_id_uq" ON "instagram_credentials" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_org_id_uq" ON "invitation" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "kb_entry_org_id_uq" ON "kb_entry" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "lead_org_id_uq" ON "lead" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "lead_stage_event_org_id_uq" ON "lead_stage_event" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "media_asset_org_id_uq" ON "media_asset" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_id_uq" ON "member" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "message_org_id_uq" ON "message" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "messenger_credentials_org_id_uq" ON "messenger_credentials" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "meta_credentials_org_id_uq" ON "meta_credentials" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "offered_slot_org_id_uq" ON "offered_slot" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stage_org_id_uq" ON "pipeline_stage" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "quick_reply_org_id_uq" ON "quick_reply" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "template_org_id_uq" ON "template" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "tiktok_credentials_org_id_uq" ON "tiktok_credentials" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_org_id_uq" ON "webhook_event" ("organization_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "zoom_credentials_org_id_uq" ON "zoom_credentials" ("organization_id", "id");
--> statement-breakpoint
ALTER TABLE "ad_attribution" ADD CONSTRAINT "ad_attribution_contact_id_tenant_fk" FOREIGN KEY ("organization_id", "contact_id") REFERENCES "contact" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "ad_attribution" ADD CONSTRAINT "ad_attribution_conversation_id_tenant_fk" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "conversation" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "ad_attribution" ADD CONSTRAINT "ad_attribution_image_asset_id_tenant_fk" FOREIGN KEY ("organization_id", "image_asset_id") REFERENCES "media_asset" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "agent_test_case" ADD CONSTRAINT "agent_test_case_run_id_tenant_fk" FOREIGN KEY ("organization_id", "run_id") REFERENCES "agent_test_run" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "agent_test_case" ADD CONSTRAINT "agent_test_case_conversation_id_tenant_fk" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "conversation" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_contact_id_tenant_fk" FOREIGN KEY ("organization_id", "contact_id") REFERENCES "contact" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_conversation_id_tenant_fk" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "conversation" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_lead_id_tenant_fk" FOREIGN KEY ("organization_id", "lead_id") REFERENCES "lead" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "capi_settings" ADD CONSTRAINT "capi_settings_qualified_stage_id_tenant_fk" FOREIGN KEY ("organization_id", "qualified_stage_id") REFERENCES "pipeline_stage" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contact_id_tenant_fk" FOREIGN KEY ("organization_id", "contact_id") REFERENCES "contact" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "conversation_note" ADD CONSTRAINT "conversation_note_conversation_id_tenant_fk" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "conversation" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "conversion_event" ADD CONSTRAINT "conversion_event_conversation_id_tenant_fk" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "conversation" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "conversion_event" ADD CONSTRAINT "conversion_event_attribution_id_tenant_fk" FOREIGN KEY ("organization_id", "attribution_id") REFERENCES "ad_attribution" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "dispatch" ADD CONSTRAINT "dispatch_conversation_id_tenant_fk" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "conversation" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_contact_id_tenant_fk" FOREIGN KEY ("organization_id", "contact_id") REFERENCES "contact" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_stage_id_tenant_fk" FOREIGN KEY ("organization_id", "stage_id") REFERENCES "pipeline_stage" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "lead_stage_event" ADD CONSTRAINT "lead_stage_event_lead_id_tenant_fk" FOREIGN KEY ("organization_id", "lead_id") REFERENCES "lead" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "lead_stage_event" ADD CONSTRAINT "lead_stage_event_contact_id_tenant_fk" FOREIGN KEY ("organization_id", "contact_id") REFERENCES "contact" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "lead_stage_event" ADD CONSTRAINT "lead_stage_event_from_stage_id_tenant_fk" FOREIGN KEY ("organization_id", "from_stage_id") REFERENCES "pipeline_stage" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "lead_stage_event" ADD CONSTRAINT "lead_stage_event_to_stage_id_tenant_fk" FOREIGN KEY ("organization_id", "to_stage_id") REFERENCES "pipeline_stage" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_tenant_fk" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "conversation" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_media_asset_id_tenant_fk" FOREIGN KEY ("organization_id", "media_asset_id") REFERENCES "media_asset" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "offered_slot" ADD CONSTRAINT "offered_slot_conversation_id_tenant_fk" FOREIGN KEY ("organization_id", "conversation_id") REFERENCES "conversation" ("organization_id", "id") DEFERRABLE INITIALLY DEFERRED;
