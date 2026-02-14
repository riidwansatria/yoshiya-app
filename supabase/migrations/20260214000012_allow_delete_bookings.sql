
-- Allow public delete on reservations
create policy "Allow public delete" on "public"."reservations"
  for delete using (true);

-- Allow public delete on reservation_staff (for cascade)
create policy "Allow public delete" on "public"."reservation_staff"
  for delete using (true);

-- Allow public delete on reservation_menus (if it exists/used)
create policy "Allow public delete" on "public"."reservation_menus"
  for delete using (true);
