DROP INDEX "instagram_credentials_account_ref_idx";--> statement-breakpoint
DROP INDEX "messenger_credentials_account_ref_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_uq" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meta_credentials_waba_uq" ON "meta_credentials" USING btree ("waba_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_credentials_account_ref_idx" ON "instagram_credentials" USING btree ("account_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "messenger_credentials_account_ref_idx" ON "messenger_credentials" USING btree ("account_ref");