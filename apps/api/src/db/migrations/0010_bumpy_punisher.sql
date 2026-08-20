ALTER TABLE "semesters" ADD COLUMN "kind" text DEFAULT 'semestre' NOT NULL;--> statement-breakpoint
ALTER TABLE "semesters" ADD COLUMN "weeks" integer DEFAULT 16 NOT NULL;--> statement-breakpoint
--
-- Fase 18: las semanas del periodo dejan de ser un ajuste global de la cuenta.
--
-- Cada periodo hereda el valor que su dueño tenía en `user_settings.semester_weeks`, de modo
-- que ningún límite de faltas ya calculado cambie de número al desplegar. Quien nunca tocó el
-- ajuste no tiene fila en `user_settings`, y se queda con el DEFAULT 16 de la columna: el
-- mismo valor que estaba usando.
--
-- `kind` no se toca: el DEFAULT 'semestre' de la columna deja los periodos existentes como lo
-- que son. Un periodo archivado se cursó como semestre y debe seguir apareciendo como tal
-- (Principio VI), no como un valor vacío que las pantallas tengan que adivinar.
UPDATE "semesters" AS s
SET "weeks" = us."semester_weeks"
FROM "user_settings" AS us
WHERE us."user_id" = s."user_id";
