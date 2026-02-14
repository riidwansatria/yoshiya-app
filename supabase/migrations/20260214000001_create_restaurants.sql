create table "public"."restaurants" (
    "id" text not null,
    "name" text not null,
    "icon" text,
    constraint "restaurants_pkey" primary key ("id")
);

alter table "public"."restaurants" enable row level security;
