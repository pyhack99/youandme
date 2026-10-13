# Opsætning af Supabase til Vores minder

## Forbindelsesstatus

Supabase-forbindelsen i Codex er ikke tilsluttet lige nu. Du kan stadig sætte projektet op direkte i Supabase Dashboard.

## Opret billedlageret

1. Log ind på Supabase og åbn scrapbogens projekt.
2. Gå til **Storage** → **Buckets** → **New bucket**.
3. Kald lageret `Mener`.
4. Sæt maks. filstørrelse til 10 MB, og tillad billedtyperne JPEG, PNG, WebP og GIF.
5. Vælg kun **Public bucket**, hvis billederne gerne må kunne ses af alle, der får fat i billedlinket.

Opret bucket via Dashboard eller Storage API. Skriv ikke direkte til `storage.buckets`-tabellen.

## Database og adgang

Den nuværende HTML-side logger ikke brugere ind. Hvis du giver den `anon`-rollen læse- og uploadadgang, kan alle, der kan nå hjemmesiden, læse minderne og uploade nye billeder. Brug kun SQL'en nedenfor til en side, der er bevidst offentlig eller kun bruges lokalt. Hvis hjemmesiden skal være offentligt tilgængelig og minderne private, skal der først tilføjes login til siden og bruges politikker for `authenticated`-brugere.

Åbn **SQL Editor** → **New query** og kør dette én gang:

```sql
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  memory_date date,
  place text,
  story text,
  image_path text not null,
  uploaded_by text not null check (uploaded_by in ('Columbus', 'Julia')),
  created_at timestamptz not null default now()
);

alter table public.memories enable row level security;
grant select, insert on table public.memories to anon;

drop policy if exists "Public can read scrapbook memories" on public.memories;
create policy "Public can read scrapbook memories"
  on public.memories for select to anon
  using (true);

drop policy if exists "Public can add scrapbook memories" on public.memories;
create policy "Public can add scrapbook memories"
  on public.memories for insert to anon
  with check (uploaded_by in ('Columbus', 'Julia'));

drop policy if exists "Public can upload scrapbook photos" on storage.objects;
create policy "Public can upload scrapbook photos"
  on storage.objects for insert to anon
  with check (bucket_id = 'Mener');
```

After setup, reload `upload.html` and try one photo. If the project has the Data API disabled, enable it in the project's API settings for the `public` schema. Keep the publishable key in `config.js`; never put a `service_role` or secret key in browser code.

## Supabase’s video tutorial

[Getting Started with File Storage on Supabase (YouTube)](https://www.youtube.com/watch?v=ch2UGHMreB0)

The video covers creating a bucket, uploading files, and setting storage access policies. See also Supabase's current guides for [creating buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [storage access control](https://supabase.com/docs/guides/storage/security/access-control), and [bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals).
