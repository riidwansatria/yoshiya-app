
alter table "public"."reservation_staff"
add column "temp_name" text;

alter table "public"."reservation_staff"
alter column "user_id" drop not null;

alter table "public"."reservation_staff"
add constraint "reservation_staff_user_or_temp_check"
check (
    (user_id is not null and temp_name is null) or
    (user_id is null and temp_name is not null)
);
