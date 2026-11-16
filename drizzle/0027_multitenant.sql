CREATE TABLE "brain_connection" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"key_hash" text NOT NULL,
	"secret_cipher" text NOT NULL,
	"secret_iv" text NOT NULL,
	"secret_tag" text NOT NULL,
	"dispatch_url" text,
	"health_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brain_connection_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "brain_connection" ADD CONSTRAINT "brain_connection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;