-- Durum: ARSIV · 2026-09-26 · Kerem karari (guvenlik denetimi kart 4, S3#7)
--
-- community_links and scholarship_regions were created for an unmerged web
-- branch (UI, 2026-03-31) and were last updated on 2026-03-30. The site reads
-- community and scholarship data from lib/community-links.ts and
-- lib/scholarships/regions.ts. The only other reader was the unreleased
-- remake iOS app (scholarship_regions).
--
-- Archived in place: rows stay in the table and in the weekly backup; the
-- client roles lose every privilege and the public read policies go.
-- To reopen: grant select to the client roles and recreate a read policy.
-- Rerunnable.

begin;

revoke all on table public.community_links from public, anon, authenticated;
revoke all on table public.scholarship_regions from public, anon, authenticated;

drop policy if exists community_links_public_read on public.community_links;
drop policy if exists scholarship_regions_public_read on public.scholarship_regions;

comment on table public.community_links is
  'ARSIV (2026-09-26): kullanilmiyor. Site topluluk verisini lib/community-links.ts icinden okur. Istemci erisimi kapali; satirlar ve yedek yerinde.';
comment on table public.scholarship_regions is
  'ARSIV (2026-09-26): kullanilmiyor. Site burs verisini lib/scholarships/regions.ts icinden okur; bu tablo 2026-03-30 verisidir. Istemci erisimi kapali; satirlar ve yedek yerinde.';

commit;
