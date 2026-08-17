CREATE TABLE "agenda_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'tarea' NOT NULL,
	"subject_id" uuid,
	"due_date" date,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agenda_items_user_id_idx" ON "agenda_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agenda_items_subject_id_idx" ON "agenda_items" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "agenda_items_user_due_idx" ON "agenda_items" USING btree ("user_id","completed","due_date");