-- products.dll_path = payload injetado pelo loader (DLL crua)
-- products.pkg_path = pacote completo p/ download no site (zip)
alter table public.products add column if not exists pkg_path text not null default 'loaders/c4pt0r.zip';
update public.products set dll_path = 'loaders/c4pt0r.dll' where slug = 'c4pt0r-mod-menu';
