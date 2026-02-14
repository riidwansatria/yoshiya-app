-- Allow public delete on reservation_staff (needed for staff re-assignment)
create policy "Allow public delete" on "public"."reservation_staff"
  for delete using (true);

-- Allow public delete on reservation_menus (needed for menu updates)
create policy "Allow public delete" on "public"."reservation_menus"
  for delete using (true);
