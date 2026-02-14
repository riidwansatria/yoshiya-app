-- Allow public read access to all tables via anon key
-- Write access will be restricted in a future migration when auth is implemented

create policy "Allow public read access" on "public"."restaurants"
  for select using (true);

create policy "Allow public read access" on "public"."venues"
  for select using (true);

create policy "Allow public read access" on "public"."menus"
  for select using (true);

create policy "Allow public read access" on "public"."users"
  for select using (true);

create policy "Allow public read access" on "public"."customers"
  for select using (true);

create policy "Allow public read access" on "public"."agencies"
  for select using (true);

create policy "Allow public read access" on "public"."reservations"
  for select using (true);

create policy "Allow public read access" on "public"."reservation_menus"
  for select using (true);

create policy "Allow public read access" on "public"."reservation_staff"
  for select using (true);

-- Also allow insert/update for now (needed for Apps Script sync and basic CRUD)
create policy "Allow public insert" on "public"."reservations"
  for insert with check (true);

create policy "Allow public update" on "public"."reservations"
  for update using (true);

create policy "Allow public insert" on "public"."reservation_menus"
  for insert with check (true);

create policy "Allow public update" on "public"."reservation_menus"
  for update using (true);

create policy "Allow public insert" on "public"."reservation_staff"
  for insert with check (true);

create policy "Allow public update" on "public"."reservation_staff"
  for update using (true);

create policy "Allow public insert" on "public"."customers"
  for insert with check (true);

create policy "Allow public update" on "public"."customers"
  for update using (true);
