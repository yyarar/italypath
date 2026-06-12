# Genoa deep-research — resume status

Last updated: 2026-06-10 ~12:40 Europe/Rome

## STATUS: RESEARCH COMPLETE ✅
All 27 result JSONs written, validate 100% (17/17). All rich shape except Medicine (out of scope, flat — fine).

### Teaching-language outcome
- FULLY ENGLISH (20): Architectural Composition, Bioengineering, Computer Engineering (BA + MA),
  Computer Science, Economics & Data Science, Electrical Eng. for Energy Transition, Electronic Eng.,
  Energy Eng., Eng. Tech for Strategy & Security, Eng. for Natural Risk Mgmt, Environmental Eng.,
  Internet & Multimedia Eng., MEET, Maritime Science (BA), Medical-Pharmaceutical Biotech,
  Robotics Eng., Safe Transport & Logistics Eng., Sustainable Polymer (SMART), Yacht Design
- MIXED / ENGLISH-TRACK ONLY (4, in scope w/ note): Advanced Materials (SERP+ EN curriculum),
  Building Engineering (only Building Retrofitting track EN), Digital Humanities (ACW curriculum EN),
  International Relations (Security & Int. Relations curriculum EN)
- OUT OF SCOPE — ITALIAN, drop from English dataset (3): Medicine and Surgery, Chemical and Processes
  Engineering, Civil Engineering

## NEXT STEP: import to Supabase (university_id = 20)
Write import-genoa-program-details.mjs modelled on import-ca-foscari-program-details.mjs.
Decide scope: recommend importing the 24 in-scope (20 full + 4 track-English), skip the 3 Italian.

## Where we are (history)
27 items in outline.yaml. Pilot (9) done; full batch was interrupted by a session token limit (now reset).

### DONE & GOOD (rich object/array shape — keep, do not re-run)
- Computer_Engineering_Bachelor.json (bachelor, English)
- Maritime_Science_and_Technology.json (bachelor, English)
- Medical_Pharmaceutical_Biotechnology.json (master, English)

### OUT OF SCOPE (do not import, keep as record)
- Medicine_and_Surgery.json — confirmed ITALIAN (LM-41), no English version at UniGe. Drop from English dataset.

### NEED RE-FETCH (file exists but FLAT strings — must overwrite with rich shape)
- Bioengineering.json (English, code 11933)
- Computer_Science.json (English, code 11964)
- Robotics_Engineering.json (English, code 11963)
- Management_for_Energy_and_Environmental_Transition_MEET.json (English, code 11939, LM-77)
- International_Relations_Security_and_International_Relations.json (English curriculum of bilingual prog, code 11935, LM-52)

### NOT STARTED (18 masters)
advanced-materials (11967), architectural-composition (11930), computer-engineering-master (11965),
digital-humanities (11945), economics-and-data-science (11937), electrical-engineering-for-energy-transition (11955),
electronic-engineering (11970), energy-engineering (11917, confirm EN vs EN+IT), engineering-for-natural-risk-management (11921),
engineering-technology-for-strategy-and-security (11994), environmental-engineering (11925),
chemical-and-processes-engineering (11919, confirm language), civil-engineering (11926, confirm language),
building-engineering (11969), internet-and-multimedia-engineering (11962), safe-transport-and-logistics-engineering (11920),
sustainable-polymer-and-process-chemistry (11950, "SMART"), yacht-design (11958)

## Format rule (critical)
Every result JSON must mirror Computer_Engineering_Bachelor.json:
- requirement/deadline/exam fields = OBJECTS; required_documents + source_quotes = ARRAYS of objects;
  uncertainty_notes + uncertain = arrays of strings. Never flat strings.
- fields.yaml is list-style and validates directly with ~/.claude/skills/research/validate_json.py.

## Resume = re-run 23 items (18 not-started + 5 re-fetch), in 8 agents of 3 (last = 2).
Wave 1 = batches 1-4, then verify rich shape, then Wave 2 = batches 5-8.
Genoa university_id in Supabase = 20. Import script (program_admission_details, dept match) still to be written, model on import-ca-foscari.
