ALTER TABLE "user_settings" ADD COLUMN "reminders_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "reminder_lead_days" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "reminder_time_of_day" time DEFAULT '20:00' NOT NULL;