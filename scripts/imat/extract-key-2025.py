#!/usr/bin/env python3
# IMAT 2025 cevap anahtari (plan Gorev 9): kagidin ilk sayfasina gore dogru cevap vurgulu siktir. Vurgu, sik
# satirini kaplayan acik yesil dolgulu dikdortgendir (pdfplumber rect, non_stroking_color ~ (0.80, 1.0, 0.80)).
# Soru ve sik satirlari extract_text.py ile ayni kod yolundan (MUR duzeni) gelir.
#
# Calistirma (once envanter: node scripts/imat/inventory.mjs):
#   IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank /usr/bin/python3 scripts/imat/extract-key-2025.py
#
# Cikti: keys/2025.json = { "1": "A", ..., "60": "E" }.
# Cikis 1: vurgusuz ya da birden cok vurgulu soru (ya da sahipsiz vurgu) var; dosya yazilmaz.
# Cikis 2: dosya yazilir ama dagilim dengesiz (bir harf sorularin yarisindan fazla): dur, ana oturuma raporla.
import json
import os
import sys
from collections import Counter

sys.dont_write_bytecode = True  # scripts/imat altinda __pycache__ birakma
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_text as ex  # noqa: E402

YEAR = 2025
LETTERS = "ABCDE"


def highlight_rects(page):
    return [r for r in page.rects if r["fill"] and ex.is_highlight(r["fill_color"])]


def covers(rect, row):
    # Vurgu satirin dikey ortasini ve sik harfini kapliyor mu.
    mid = (row["top"] + row["bottom"]) / 2
    return rect["top"] - 0.5 <= mid <= rect["bottom"] + 0.5 and rect["x0"] - 2.0 <= row["x0"] <= rect["x1"]


def main():
    inv = ex.check_inventory()
    entry = inv[YEAR]
    pages = ex.load_pages(os.path.join(ex.SOURCE_DIR, entry["file"]))
    if len(pages) != entry["pages"]:
        sys.exit(f"sayfa sayisi {len(pages)} (envanter {entry['pages']})")
    questions = ex.split_questions(pages, ex.MurLayout())
    key, problems = {}, []
    used = set()
    for q in questions:
        n = q["number"]
        if len(q["choice_starts"]) != 5:
            problems.append(f"soru {n}: {len(q['choice_starts'])} sik")
            continue
        page = pages[q["rows"][0]["page"]]
        rects = highlight_rects(page)
        hits = []
        for k, s in enumerate(q["choice_starts"]):
            e = q["choice_starts"][k + 1] if k + 1 < 5 else len(q["rows"])
            rows = q["rows"][s:e]
            covering = [i for i, r in enumerate(rects) for row in rows if covers(r, row)]
            if covering:
                hits.append(LETTERS[k])
                used.update((page.index, i) for i in covering)
        if len(hits) != 1:
            problems.append(f"soru {n}: vurgulu sik {hits or 'yok'}")
            continue
        key[str(n)] = hits[0]
    for page in pages:
        for i, r in enumerate(highlight_rects(page)):
            if (page.index, i) not in used:
                problems.append(f"sayfa {page.index + 1}: sahipsiz vurgu (top {r['top']:.1f})")
    if len(key) != entry["expectedQuestions"] and not problems:
        problems.append(f"{len(key)} anahtar (beklenen {entry['expectedQuestions']})")
    if problems:
        print("Anahtar cikarilamadi:\n  " + "\n  ".join(problems))
        return 1
    out_dir = os.path.join(ex.OUT_ROOT, "keys")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f"{YEAR}.json")
    ex.write_json(out, key)
    dist = Counter(key.values())
    print(f"yazildi: {out} ({len(key)} soru)")
    print("dagilim " + ", ".join(f"{letter} {dist.get(letter, 0)}" for letter in LETTERS))
    top_letter, top_count = dist.most_common(1)[0]
    if top_count > len(key) // 2:
        print(f"DUR: {top_letter} harfi {top_count}/{len(key)}; dagilim dengesiz (yarisindan fazla). Ana oturuma raporla.")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
