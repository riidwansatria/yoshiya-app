DROP POLICY IF EXISTS "Allow public delete" ON "public"."reservations";
create policy "Allow public delete" on "public"."reservations"
  for delete using (true);

DROP POLICY IF EXISTS "Allow public delete" ON "public"."reservation_staff";
create policy "Allow public delete" on "public"."reservation_staff"
  for delete using (true);

DROP POLICY IF EXISTS "Allow public delete" ON "public"."reservation_menus";
create policy "Allow public delete" on "public"."reservation_menus"
  for delete using (true);
