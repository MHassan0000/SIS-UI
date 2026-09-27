-- Run in the Supabase SQL Editor.
-- Accept plain text in the existing email column, which now stores the name.
-- Existing rows, columns, and the rollnumber rule are unchanged.

alter policy resultcard_student_insert
on public."ResultCard"
with check (
  length(rollnumber) between 1 and 255
  and rollnumber !~ '[[:space:][:cntrl:]]'
  and length(email) > 0
);
