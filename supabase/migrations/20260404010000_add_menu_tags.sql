create table "public"."menu_tags" (
    "id" uuid not null default gen_random_uuid(),
    "restaurant_id" text not null references "public"."restaurants"("id") on delete cascade,
    "label" text not null,
    "created_at" timestamptz default now(),
    "updated_at" timestamptz default now(),
    constraint "menu_tags_pkey" primary key ("id")
);

create table "public"."menu_tag_assignments" (
    "menu_id" uuid not null references "public"."menus"("id") on delete cascade,
    "tag_id" uuid not null references "public"."menu_tags"("id") on delete cascade,
    constraint "menu_tag_assignments_pkey" primary key ("menu_id", "tag_id")
);

create unique index "menu_tags_restaurant_label_unique_idx"
    on "public"."menu_tags" ("restaurant_id", lower(btrim("label")));

create index "menu_tag_assignments_tag_id_idx"
    on "public"."menu_tag_assignments" ("tag_id");

alter table "public"."menu_tags" enable row level security;
alter table "public"."menu_tag_assignments" enable row level security;

create policy "Allow public read access" on "public"."menu_tags" for select using (true);
create policy "Allow public insert" on "public"."menu_tags" for insert with check (true);
create policy "Allow public update" on "public"."menu_tags" for update using (true);
create policy "Allow public delete" on "public"."menu_tags" for delete using (true);

create policy "Allow public read access" on "public"."menu_tag_assignments" for select using (true);
create policy "Allow public insert" on "public"."menu_tag_assignments" for insert with check (true);
create policy "Allow public update" on "public"."menu_tag_assignments" for update using (true);
create policy "Allow public delete" on "public"."menu_tag_assignments" for delete using (true);

create trigger set_menu_tags_updated_at
before update on public.menu_tags
for each row
execute procedure public.handle_updated_at();
