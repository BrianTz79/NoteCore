CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'activo' NOT NULL,
	"started_at" date NOT NULL,
	"closed_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "absence_records_user_id_idx";--> statement-breakpoint
DROP INDEX "agenda_items_user_id_idx";--> statement-breakpoint
DROP INDEX "schedule_blocks_user_id_idx";--> statement-breakpoint
DROP INDEX "subjects_user_id_idx";--> statement-breakpoint
DROP INDEX "agenda_items_user_due_idx";--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "semesters_user_id_idx" ON "semesters" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "semesters_one_active_per_user" ON "semesters" USING btree ("user_id") WHERE "semesters"."status" = 'activo';--> statement-breakpoint

/*
 * Un semestre activo por cada cuenta que ya existía.
 *
 * Sin esto, las columnas `semester_id NOT NULL` de abajo fallarían en cuanto hubiera una
 * sola fila: no hay valor por defecto posible, porque el semestre correcto depende del
 * usuario dueño de cada fila. Por eso la migración crea primero el semestre de cada quien,
 * rellena las cuatro tablas y solo entonces impone la restricción.
 *
 * El nombre se deriva del mes en que se aplica la migración, con la convención del TecNM:
 * de agosto a diciembre es el periodo 2, y de enero a julio el 1. Es la misma regla que
 * `defaultSemesterName` en `shared`, y el estudiante puede renombrarlo después.
 *
 * `started_at` toma la fecha de alta de la cuenta y no la de hoy: lo que hay capturado es de
 * un semestre que empezó antes de esta migración, y ponerle la fecha de hoy diría que el
 * semestre arrancó el día en que se actualizó el servidor.
 */
INSERT INTO "semesters" ("user_id", "name", "status", "started_at", "created_at")
SELECT
	"id",
	EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' ||
		CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 7 THEN '2' ELSE '1' END,
	'activo',
	"created_at"::date,
	"created_at"
FROM "users";--> statement-breakpoint

/*
 * Las columnas entran como nulables para poder rellenarlas.
 *
 * Añadirlas ya con `NOT NULL` exigiría un valor por defecto único para toda la tabla, y aquí
 * cada fila va a un semestre distinto según su dueño.
 */
ALTER TABLE "subjects" ADD COLUMN "semester_id" uuid;--> statement-breakpoint
ALTER TABLE "schedule_blocks" ADD COLUMN "semester_id" uuid;--> statement-breakpoint
ALTER TABLE "absence_records" ADD COLUMN "semester_id" uuid;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD COLUMN "semester_id" uuid;--> statement-breakpoint

/* Todo lo capturado hasta ahora pertenece al semestre en curso de su dueño. */
UPDATE "subjects" SET "semester_id" = "s"."id"
	FROM "semesters" AS "s"
	WHERE "s"."user_id" = "subjects"."user_id" AND "s"."status" = 'activo';--> statement-breakpoint
UPDATE "schedule_blocks" SET "semester_id" = "s"."id"
	FROM "semesters" AS "s"
	WHERE "s"."user_id" = "schedule_blocks"."user_id" AND "s"."status" = 'activo';--> statement-breakpoint
UPDATE "absence_records" SET "semester_id" = "s"."id"
	FROM "semesters" AS "s"
	WHERE "s"."user_id" = "absence_records"."user_id" AND "s"."status" = 'activo';--> statement-breakpoint
UPDATE "agenda_items" SET "semester_id" = "s"."id"
	FROM "semesters" AS "s"
	WHERE "s"."user_id" = "agenda_items"."user_id" AND "s"."status" = 'activo';--> statement-breakpoint

/* Ya con todas las filas asignadas, se impone la restricción definitiva. */
ALTER TABLE "subjects" ALTER COLUMN "semester_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_blocks" ALTER COLUMN "semester_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "absence_records" ALTER COLUMN "semester_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agenda_items" ALTER COLUMN "semester_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "absence_records" ADD CONSTRAINT "absence_records_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absence_records_user_semester_idx" ON "absence_records" USING btree ("user_id","semester_id");--> statement-breakpoint
CREATE INDEX "agenda_items_user_semester_idx" ON "agenda_items" USING btree ("user_id","semester_id");--> statement-breakpoint
CREATE INDEX "schedule_blocks_user_semester_idx" ON "schedule_blocks" USING btree ("user_id","semester_id");--> statement-breakpoint
CREATE INDEX "subjects_user_semester_idx" ON "subjects" USING btree ("user_id","semester_id");--> statement-breakpoint
CREATE INDEX "agenda_items_user_due_idx" ON "agenda_items" USING btree ("user_id","semester_id","completed","due_date");
