create policy "Authenticated can upload menu images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'yoshiya-assets'
  and (storage.foldername(name))[1] = 'menus'
);

create policy "Authenticated can delete menu images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'yoshiya-assets'
  and (storage.foldername(name))[1] = 'menus'
);

create policy "Public can read menu images"
on storage.objects for select
to public
using (
  bucket_id = 'yoshiya-assets'
  and (storage.foldername(name))[1] = 'menus'
);
