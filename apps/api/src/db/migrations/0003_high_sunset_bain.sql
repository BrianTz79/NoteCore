CREATE TABLE "absence_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"date" date NOT NULL,
	"justified" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absence_records_block_date_unique" UNIQUE("block_id","date")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"semester_weeks" integer DEFAULT 16 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "absence_limit" integer;--> statement-breakpoint
ALTER TABLE "absence_records" ADD CONSTRAINT "absence_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_records" ADD CONSTRAINT "absence_records_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absence_records" ADD CONSTRAINT "absence_records_block_id_schedule_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."schedule_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absence_records_user_id_idx" ON "absence_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "absence_records_subject_id_idx" ON "absence_records" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "absence_records_user_date_idx" ON "absence_records" USING btree ("user_id","date");