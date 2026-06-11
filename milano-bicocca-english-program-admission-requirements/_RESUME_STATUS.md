# Milano-Bicocca deep-research — resume status

Last updated: 2026-06-11 ~14:00 Europe/Rome
University id (Supabase): 29 · DB already has 15 departments.

## Goal
The 15 source JSONs were originally in FLAT format (strings) — different from the
rich object/array format used by all other universities. We are re-fetching each
in rich format (mirroring a Genoa result file) so the standard import works.

## STATUS: 9 / 15 done (rich), 6 still flat. PAUSED (repeated session token limits).

### DONE — rich (9)
- bsc-economics-science-environmental-sustainability  (English, L-33, English TOLC-E)
- bsc-physical-sciences-innovative-technologies        (English, L-30, joint w/ Pavia)
- msc-ai-science-technology                            (English, LM-91 master)
- msc-applied-experimental-psychological-sciences      (English, LM-51, selection call)
- msc-artificial-intelligence                          (English — NOTE: actually the L-31 BACHELOR, not a master; filename "msc-" is now misleading, rename later)
- msc-astrophysics-space-physics                       (English, LM-58)
- msc-biotechnology-bio-economy                        (English)
- msc-human-centered-ai                                (English)
- msc-international-economics                           (English)

### TODO — still flat, need re-fetch (6)
- msc-data-science
- msc-economics-technologies-sustainability
- msc-marine-sciences
- msc-materials-science-nanotechnology
- msc-optometry-vision-science
- msc-physics   ← teaching language ambiguous: official language Italian, only
                  selected courses in English. Decide scope (likely out-of-scope).

## Known data issues to resolve at import time
- AI duplicate FIXED: old data had two files both describing the LM-91 master.
  Now msc-ai-science-technology = LM-91 master; msc-artificial-intelligence = L-31 bachelor.
- DB department "Marketing and Global Markets" (id 966) has NO source JSON.
- DB department "Medicine and Surgery" (id 415, bachelor/dur 6 — mislabeled) has NO source JSON.
- Several JSONs map to new departments not yet in DB.

## Resume options (do NOT auto-run; wait for Kerem)
- A: finish the 6 flat ones in rich format (1-2 small agents on a fresh budget).
- B: pivot — make the import script tolerate flat JSONs (split required_documents/
  uncertainty_notes strings into arrays); no further re-fetch.
Then adapt the standard import prompt for Milano-Bicocca (university_id = 29).
