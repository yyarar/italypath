-- SAT Math English explanations: backward-compatible, service-role-only schema extension.
-- Apply only after the production approval gate.

begin;

alter table public.sat_questions
  add column if not exists explanation_en text;

commit;
