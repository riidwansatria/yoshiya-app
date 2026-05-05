insert into storage.buckets (id, name, public)
values ('yoshiya-assets', 'yoshiya-assets', true)
on conflict (id) do update
set public = true;
