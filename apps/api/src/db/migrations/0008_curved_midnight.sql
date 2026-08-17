CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"blocked_by_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "career" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_visibility" text DEFAULT 'contactos' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_blocked_by_id_users_id_fk" FOREIGN KEY ("blocked_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_pair_unique" ON "contacts" USING btree ("user_a_id","user_b_id");--> statement-breakpoint
CREATE INDEX "contacts_user_a_idx" ON "contacts" USING btree ("user_a_id");--> statement-breakpoint
CREATE INDEX "contacts_user_b_idx" ON "contacts" USING btree ("user_b_id");--> statement-breakpoint
CREATE INDEX "posts_user_created_idx" ON "posts" USING btree ("user_id","created_at");--> statement-breakpoint
--
-- Añadido a mano: el generador no puede expresar estas dos reglas, y sin ellas el índice
-- único de arriba no garantiza lo que dice garantizar.
--
-- 1. El par SIEMPRE va ordenado. `contacts_pair_unique` solo impide la relación duplicada
--    si (A,B) y (B,A) no pueden coexistir, y eso depende de que el orden se respete al
--    escribir. Mientras la regla viva únicamente en `orderedPair`, un `insert` futuro que
--    la olvide creará la fila espejo sin que nada la rechace —y entonces la relación tendrá
--    dos estados posibles a la vez, que es justo lo que la tabla existe para impedir—.
-- 2. Nadie se agrega a sí mismo. Sin la comprobación, `userAId = userBId` pasa el índice
--    único sin problema y crea una relación de alguien consigo mismo.
--
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_pair_ordered" CHECK ("user_a_id" < "user_b_id");--> statement-breakpoint
--
-- Quien bloquea y quien pide tienen que ser una de las dos partes. Es la comprobación que
-- impide que un fallo de asignación deje una relación atribuida a un tercero ajeno a ella.
--
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_requester_is_member" CHECK ("requester_id" = "user_a_id" OR "requester_id" = "user_b_id");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_blocker_is_member" CHECK ("blocked_by_id" IS NULL OR "blocked_by_id" = "user_a_id" OR "blocked_by_id" = "user_b_id");