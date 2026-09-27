-- Run once in the SQL editor. Existing rows and columns are preserved.
begin;
create table if not exists public."ResultCard" (
  rollnumber varchar not null,
  email varchar not null
);
alter table public."ResultCard" add column if not exists rollnumber varchar;
alter table public."ResultCard" add column if not exists email varchar;
-- Required for safe retries. If existing pairs are duplicated, this fails without deleting them.
create unique index if not exists resultcard_rollnumber_email_unique
  on public."ResultCard" (rollnumber, email);
alter table public."ResultCard" enable row level security;
grant usage on schema public to anon;
grant insert (rollnumber, email) on public."ResultCard" to anon;
drop policy if exists resultcard_student_insert on public."ResultCard";
create policy resultcard_student_insert on public."ResultCard" for insert to anon
with check (
  length(rollnumber) between 1 and 255 and rollnumber !~ '[[:space:][:cntrl:]]'
  and length(email) between 3 and 254 and email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
);
commit;
-- Review pre-existing policies/grants separately. This migration grants no read/update/delete.
-- If an existing id column uses a serial sequence without anon usage, grant USAGE on
-- that specific sequence. Do not grant access to all sequences or student records.
