alter table "public"."reservation_staff"
add column if not exists "temp_name" text;

alter table "public"."reservation_staff"
alter column "user_id" drop not null;

DO $$ BEGIN
  ALTER TABLE "public"."reservation_staff" ADD CONSTRAINT "reservation_staff_user_or_temp_check" CHECK (
      (user_id is not null and temp_name is null) or
      (user_id is null and temp_name is not null)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
