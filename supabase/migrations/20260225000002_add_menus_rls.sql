-- Add missing RLS policies for the menus table
create policy "Allow public insert" on "public"."menus" for insert with check (true);
create policy "Allow public update" on "public"."menus" for update using (true);
create policy "Allow public delete" on "public"."menus" for delete using (true);
