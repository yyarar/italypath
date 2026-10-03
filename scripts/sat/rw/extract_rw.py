#!/usr/bin/env python3
# SAT Reading and Writing: formatsiz PDF metin katmanindan ham kayit cikarma (plan Gorev 2).
# Metin yalniz PDF karakterlerinden kodla kurulur; elle ya da yapay zekayla duzeltme yok.
# Soru govdesi (stem + siklar) anahtar ve soru dosyalarinda AYNI kod yolundan gecer; iki cikti
# sonra 1:1 karsilastirilir (kapi 4).
# figure: { kind, page, bbox, clip } (PDF noktasi, 1 tabanli sayfa). clip, kirpma payinin girebilecegi bos
# alandir: ust sinir "ID" seridinin alti, alt sinir seklin altindaki ilk metin satiri (Gorev 4 kirpmasi).
#
# Calistirma (once envanter: node scripts/sat/rw/inventory-rw.mjs):
#   SAT_BANK_OUT=/Users/keremyarar/italypath-main/tmp/sat-bank/rw /usr/bin/python3 scripts/sat/rw/extract_rw.py
# Secenekler:
#   --dump <id>[,<id>]  yalniz bu id'leri iki kaynaktan cikarip ekrana yazar (dosya yazmaz)
#   --only <parca>      yalniz adinda bu parca gecen PDF'leri isler (dosya yazmaz, ozet basar)
#   --jobs <n>          paralel surec sayisi (varsayilan 6; cikti sirasi degismez)
import hashlib
import json
import os
import re
import sys
from collections import Counter
from concurrent.futures import ProcessPoolExecutor

import pdfplumber

SRC_ROOT = os.environ.get("SAT_BANK_SRC") or os.path.join(os.path.expanduser("~"), "Desktop", "SAT Question Bank PDFs")
UNF_ROOT = os.path.join(SRC_ROOT, "Question Bank (Unformatted)")
KEYS_ROOT = os.path.join(UNF_ROOT, "Answer Keys", "Reading and Writing")
QUESTIONS_ROOT = os.path.join(UNF_ROOT, "Reading and Writing")
OUT_ROOT = os.path.abspath(os.environ["SAT_BANK_OUT"]) if os.environ.get("SAT_BANK_OUT") else os.path.join(os.getcwd(), "tmp", "sat-bank", "rw")
INVENTORY = os.path.join(OUT_ROOT, "source-inventory.json")

# Bitisik harf glifleri (PDF tek karakter tasir) -> ayri harfler.
LIGATURES = {"\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi", "\ufb04": "ffl"}
# Bosluk sayilan karakterler: bosluk, nbsp, en bosluk, em bosluk.
SPACE_CHARS = {" ", "\u00a0", "\u2002", "\u2003"}
# Kucuk puntolu (9 pt) ust/alt simge -> Unicode karsiligi (NH3 -> NH\u2083, cm2 -> cm\u00b2).
SUP = dict(zip("0123456789+-\u2212", "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207a\u207b\u207b"))
SUB = dict(zip("0123456789+-\u2212", "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u208a\u208b\u208b"))
# Satir sonunda bunlardan biri varsa sarilan satir bosluksuz birlesir (megawatt- + hours).
JOIN_NO_SPACE_END = {"-", "\u2010", "\u2013", "\u2014"}
# Satir bunla basliyorsa da bosluksuz birlesir (tarayici uzun cizginin onunden de bolebilir).
JOIN_NO_SPACE_START = {"\u2014"}

BANNER_COLOR = (0.102, 0.1451, 0.3843)
BODY_SIZE = 10.5
PARA_GAP_MIN = 21.0  # top -> top farki bundan buyukse paragraf sonu (satir 15.75, not 18, paragraf >= 27.75)
RIGHT_EDGE = 594.01  # satir kirma siniri: olculen en uzun satir 594.002, sigmayan en kisa parca 594.018
SPACE_W = 2.6  # Roboto 10.5 bosluk genisligi
HARD_MARGIN = 1.0  # gercek satir sonu sayilmak icin sonraki parca en az bu kadar payla sigmali
NBSP = "\u00a0"  # bolunmez bosluk: tarayici burada satir kirmaz; ciktida duz bosluk olur
CHOICE_X = (17.0, 24.5)  # "A." harfinin x0 araligi (govde metni 15.0'da baslar)
WHITE = (1.0, 1.0, 1.0)


def close(a, b, tol=0.002):
    return len(a) == len(b) and all(abs(x - y) <= tol for x, y in zip(a, b))


def is_space(t):
    return t in SPACE_CHARS


def mid_y(o):
    return (o["top"] + o["bottom"]) / 2


# ---------------------------------------------------------------- sayfa modeli


class Page:
    def __init__(self, pdf_page, index):
        self.index = index  # 0 tabanli
        self.width = float(pdf_page.width)
        self.height = float(pdf_page.height)
        self.chars = []
        for c in pdf_page.chars:
            font = c["fontname"].split("+")[-1]
            self.chars.append(
                {
                    "t": c["text"],
                    "x0": float(c["x0"]),
                    "x1": float(c["x1"]),
                    "top": float(c["top"]),
                    "bottom": float(c["bottom"]),
                    "size": round(float(c["size"]), 2),
                    "font": font,
                }
            )
        self.rects = [shape(r, "rect") for r in pdf_page.rects]
        self.lines = [shape(r, "line") for r in pdf_page.lines]
        self.curves = [shape(r, "curve") for r in pdf_page.curves]


def color(v):
    if isinstance(v, (tuple, list)):
        return tuple(round(float(x), 4) for x in v)
    return v


def shape(r, kind):
    return {
        "kind": kind,
        "x0": float(r["x0"]),
        "x1": float(r["x1"]),
        "top": float(r["top"]),
        "bottom": float(r["bottom"]),
        "fill": bool(r.get("fill")),
        "stroke": bool(r.get("stroke")),
        "fill_color": color(r.get("non_stroking_color")),
        "stroke_color": color(r.get("stroking_color")),
    }


def load_pages(path):
    with pdfplumber.open(path) as pdf:
        return [Page(p, i) for i, p in enumerate(pdf.pages)]


def is_roboto(c):
    return c["font"].startswith("Roboto")


def is_body_size(c):
    return abs(c["size"] - BODY_SIZE) < 0.3


def is_bold(c):
    return "Bold" in c["font"] or "Black" in c["font"]


def is_italic(c):
    return "Italic" in c["font"]


def is_dark(col):
    return isinstance(col, tuple) and len(col) in (1, 3, 4) and max(col[:3]) < 0.5


# ---------------------------------------------------------------- soru bolme


def plain_text(chars):
    # Kunye/serit gibi tek satirlik etiketler icin duz metin.
    out = []
    prev = None
    for c in sorted(chars, key=lambda c: c["x0"]):
        if prev is not None and not is_space(c["t"]) and not is_space(prev["t"]) and c["x0"] - prev["x1"] > 1.5:
            out.append(" ")
        out.append(" " if is_space(c["t"]) else LIGATURES.get(c["t"], c["t"]))
        prev = c
    return re.sub(r" +", " ", "".join(out)).strip()


def group_rows(chars, tol=2.0):
    rows = []
    for c in sorted(chars, key=lambda c: (c["top"], c["x0"])):
        if rows and abs(rows[-1][0]["top"] - c["top"]) <= tol:
            rows[-1].append(c)
        else:
            rows.append([c])
    return rows


def find_header_id(page):
    big = [c for c in page.chars if is_bold(c) and abs(c["size"] - 19.5) < 0.3]
    if not big:
        return None
    text = plain_text(big)
    m = re.fullmatch(r"Question ID ([0-9a-f]{8})", text)
    if not m:
        raise ValueError(f"sayfa {page.index + 1}: beklenmeyen baslik {text!r}")
    return m.group(1), max(c["bottom"] for c in big)


def find_banners(page):
    # Koyu lacivert serit + icindeki beyaz kalin yazi: "ID: <id>" ya da "ID: <id> Answer".
    out = []
    for r in page.rects:
        if r["fill"] and isinstance(r["fill_color"], tuple) and close(r["fill_color"], BANNER_COLOR) and abs((r["bottom"] - r["top"]) - 27.0) < 1.0:
            inside = [c for c in page.chars if c["x0"] >= r["x0"] - 1 and c["x1"] <= r["x1"] + 1 and c["top"] >= r["top"] - 1 and c["bottom"] <= r["bottom"] + 1]
            text = plain_text(inside)
            m = re.fullmatch(r"ID: ([0-9a-f]{8})( Answer)?", text)
            if not m:
                raise ValueError(f"sayfa {page.index + 1}: beklenmeyen serit {text!r}")
            out.append({"id": m.group(1), "answer": bool(m.group(2)), "top": r["top"], "bottom": r["bottom"], "page": page.index})
    return sorted(out, key=lambda b: b["top"])


def read_metadata(page, header_bottom, banner_top):
    # Kunye tablosu: 5 cerceveli hucre; ust satir baslik (kalin 12), alt satir(lar) deger (kalin 10.5).
    cells = sorted(
        [r for r in page.rects if r["stroke"] and not r["fill"] and r["top"] > header_bottom and r["bottom"] < banner_top and (r["x1"] - r["x0"]) > 80],
        key=lambda r: r["x0"],
    )
    if len(cells) != 5:
        raise ValueError(f"sayfa {page.index + 1}: kunye tablosu {len(cells)} hucre")
    meta = {}
    for cell in cells:
        inside = [c for c in page.chars if c["x0"] >= cell["x0"] and c["x1"] <= cell["x1"] + 1 and c["top"] >= cell["top"] and c["bottom"] <= cell["bottom"] + 1]
        head = [c for c in inside if abs(c["size"] - 12) < 0.3]
        value = [c for c in inside if is_body_size(c)]
        meta[plain_text(head)] = " ".join(plain_text(row) for row in group_rows(value)).strip()
    for key in ("Assessment", "Test", "Domain", "Skill", "Difficulty"):
        if key not in meta:
            raise ValueError(f"sayfa {page.index + 1}: kunyede {key} yok ({sorted(meta)})")
    return meta


def span_list(pages, p_from, y_from, p_to, y_to):
    # Sayfa araligini (sayfa, ust, alt) parcalarina boler.
    out = []
    for pi in range(p_from, p_to + 1):
        top = y_from if pi == p_from else 0.0
        bottom = y_to if (pi == p_to and y_to is not None) else pages[pi].height
        if bottom > top:
            out.append((pi, top, bottom))
    return out


def split_questions(pages):
    # Her soru yeni sayfada "Question ID <id>" basligiyla baslar; bir sonraki basliga kadar surer.
    starts = []
    for p in pages:
        h = find_header_id(p)
        if h:
            starts.append((p.index, h[0], h[1]))
    if not starts or starts[0][0] != 0:
        raise ValueError("ilk sayfada soru basligi yok")
    questions = []
    for k, (pi, qid, header_bottom) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(pages)
        bl = [b for p in pages[pi:end] for b in find_banners(p)]
        if not bl or bl[0]["answer"] or bl[0]["id"] != qid or bl[0]["page"] != pi:
            raise ValueError(f"{qid}: soru seridi bulunamadi")
        ans = [b for b in bl if b["answer"]]
        if len(bl) > 2 or len(ans) > 1 or any(b["id"] != qid for b in bl) or (len(bl) == 2 and not bl[1]["answer"]):
            raise ValueError(f"{qid}: beklenmeyen serit dizisi")
        meta = read_metadata(pages[pi], header_bottom, bl[0]["top"])
        last = end - 1
        if ans:
            body = span_list(pages, pi, bl[0]["bottom"], ans[0]["page"], ans[0]["top"])
            answer = span_list(pages, ans[0]["page"], ans[0]["bottom"], last, None)
        else:
            body = span_list(pages, pi, bl[0]["bottom"], last, None)
            answer = []
        questions.append({"id": qid, "page": pi, "meta": meta, "body": body, "answer": answer})
    return questions


# ---------------------------------------------------------------- span icerigi: alti cizili, madde imi, sekil


def span_content(page, y0, y1):
    # Bir sayfa parcasindaki karakterler ve cizimler; alti cizili ve madde imi isaretlenir.
    chars = [dict(c) for c in page.chars if y0 <= mid_y(c) <= y1]
    for c in chars:
        c["ul"] = False
    shapes = [s for s in page.rects + page.lines + page.curves if s["bottom"] > y0 and s["top"] < y1]
    drawings, underlines, bullets = [], [], []
    for s in shapes:
        w, h = s["x1"] - s["x0"], s["bottom"] - s["top"]
        if s["kind"] == "rect" and s["fill"] and not s["stroke"] and s["fill_color"] == WHITE:
            continue  # sayfa zemini
        if s["kind"] == "rect" and s["fill"] and h < 1.6 and w > 2 and is_dark(s["fill_color"]):
            # Alti cizgi: metin satirinin taban cizgisinde ince koyu dikdortgen.
            hit = [
                c
                for c in chars
                if is_roboto(c) and is_body_size(c) and not is_space(c["t"])
                and s["x0"] - 0.5 <= (c["x0"] + c["x1"]) / 2 <= s["x1"] + 0.5
                and c["top"] + 0.55 * c["size"] <= s["top"] <= c["bottom"] + 1.5
            ]
            if hit:
                for c in hit:
                    c["ul"] = True
                underlines.append(s)
                continue
        if s["kind"] == "curve" and s["fill"] and w < 6 and h < 6:
            bullets.append(s)
            continue
        drawings.append(s)
    return chars, drawings, underlines, bullets


def find_figure(chars, drawings):
    # Grafik/tablo: govdenin en ustunde. Tohum: cizimler + Times yazilari + 12 pt Roboto (tablo hucresi).
    seeds = [s for s in drawings]
    seeds += [c for c in chars if not is_space(c["t"]) and (c["font"].startswith("Times") or (is_roboto(c) and abs(c["size"] - 12.0) < 0.3))]
    if not seeds:
        return None
    box = [min(o["x0"] for o in seeds), min(o["top"] for o in seeds), max(o["x1"] for o in seeds), max(o["bottom"] for o in seeds)]
    # Kutunun icindeki ya da ustundeki (baslik) her karakter sekle aittir.
    members = [c for c in chars if mid_y(c) <= box[3] + 0.5]
    for c in members:
        box = [min(box[0], c["x0"]), min(box[1], c["top"]), max(box[2], c["x1"]), max(box[3], c["bottom"])]
    kind = "graph" if any(c["font"].startswith("Times") for c in members) else "table"
    return {"kind": kind, "bbox": box, "chars": members}


# ---------------------------------------------------------------- satir kurma


def build_lines(chars, bullets, page_index):
    # Govde puntosundaki karakterler satir olusturur; kucuk puntolar en yakin satira ust/alt simge olarak eklenir.
    main = [c for c in chars if is_body_size(c)]
    rest = [c for c in chars if not is_body_size(c)]
    rows = []
    for c in sorted(main, key=lambda c: (round(mid_y(c), 1), c["x0"])):
        if rows and abs(rows[-1]["mid"] - mid_y(c)) <= 2.5:
            rows[-1]["chars"].append(c)
        else:
            rows.append({"mid": mid_y(c), "chars": [c]})
    notes = []
    for c in rest:
        if is_space(c["t"]):
            continue
        best = min(rows, key=lambda r: abs(r["mid"] - mid_y(c))) if rows else None
        if best is None or abs(best["mid"] - mid_y(c)) > 8:
            raise ValueError(f"sayfa {page_index + 1}: satira baglanamayan karakter {c['t']!r} ({c['font']} {c['size']})")
        # Taban cizgisi yalniz govde puntosundaki harflerden (onceden eklenen simgeler sayilmaz).
        ref = [x for x in best["chars"] if not is_space(x["t"]) and is_body_size(x)]
        line_bottom = max(x["bottom"] for x in ref)
        cc = dict(c)
        table = SUB if c["bottom"] > line_bottom + 0.5 else SUP
        if c["t"] in table:
            cc["t"] = table[c["t"]]
            notes.append(("sub" if table is SUB else "sup", c["t"]))
        else:
            notes.append(("small", c["t"]))
        best["chars"].append(cc)
    lines = []
    for r in rows:
        line = make_line(r["chars"], page_index)
        if line is None:
            continue
        for b in bullets:
            if line["top"] - 1 <= mid_y(b) <= line["bottom"] + 1 and b["x1"] <= line["x0"]:
                line["bullet"] = True
        lines.append(line)
    lines.sort(key=lambda l: l["top"])
    return lines, notes


def make_line(chars, page_index):
    units = []
    implicit = 0
    prev = None
    for c in sorted(chars, key=lambda c: c["x0"]):
        sp = is_space(c["t"])
        if prev is not None and not sp and not is_space(prev["t"]) and c["x0"] - prev["x1"] > 1.5:
            units.append({"t": " ", "x0": prev["x1"], "x1": c["x0"], "italic": False, "ul": False, "bold": False})
            implicit += 1
        units.append(
            {
                "t": " " if sp else LIGATURES.get(c["t"], c["t"]),
                "nb": c["t"] == NBSP,
                "x0": c["x0"],
                "x1": c["x1"],
                "italic": is_italic(c),
                "ul": bool(c.get("ul")),
                "bold": is_bold(c),
            }
        )
        prev = c
    seg_w = first_segment_width(units)
    # Bloklarin girintisi: satir basindaki en/em bosluk (siir girintisi) blok girintisi sayilmaz.
    block_x0 = units[0]["x0"] if units else 0.0
    # Bosluklari sadelestir: bas/son bosluk yok, art arda bosluk tek.
    clean = []
    for u in units:
        if u["t"] == " " and (not clean or clean[-1]["t"] == " "):
            continue
        clean.append(u)
    while clean and clean[-1]["t"] == " ":
        clean.pop()
    if not clean:
        return None
    body = [c for c in chars if not is_space(c["t"]) and is_body_size(c)]
    return {
        "page": page_index,
        "top": min(c["top"] for c in body) if body else min(c["top"] for c in chars),
        "bottom": max(c["bottom"] for c in body) if body else max(c["bottom"] for c in chars),
        "x0": clean[0]["x0"],
        "x1": clean[-1]["x1"],
        "units": clean,
        "bullet": False,
        "bold": all(u["bold"] for u in clean if u["t"] != " "),
        "implicit_spaces": implicit,
        "seg_w": seg_w,
        "block_x0": block_x0,
    }


def line_str(line):
    return "".join(u["t"] for u in line["units"])


def first_segment_width(units):
    # Tarayicinin ilk satir kirma firsatina kadar olan parca: duz bosluga kadar (bolunmez bosluk
    # parcayi surdurur, satir sonundaki bolunmez bosluk da dahil) ya da tire/uzun cizgi dahil.
    i = 0
    while i < len(units) and units[i]["t"] == " ":
        i += 1
    if i == len(units):
        return 0.0
    x1 = units[i]["x1"]
    for j in range(i, len(units)):
        u = units[j]
        if u["t"] == " " and not u.get("nb"):
            break
        x1 = u["x1"]
        if u["t"] in JOIN_NO_SPACE_END and j > i:
            break
    return x1 - units[i]["x0"]


BODY_X0 = 15.0  # govde metninin sol kenari


def at_margin(line):
    return abs(line["block_x0"] - BODY_X0) < 1.0


LABEL_RE = re.compile(r"^Text [12]$")


def is_label(line):
    # "Text 1" / "Text 2" etiket satiri: bazi dosyalarda kalin, bazilarinda duz yazi ve bosluksuz.
    return line["bold"] or bool(LABEL_RE.match(line_str(line)))


def block_change(a, b):
    # Kenardaki satirdan girintili bloga (alinti, siir, diyalog) ya da tersine gecis.
    if b.get("bullet") or a.get("bullet"):
        return False
    return at_margin(a) != at_margin(b) and max(a["block_x0"], b["block_x0"]) - BODY_X0 > 5.0


def break_kind(a, b):
    # a ile b arasindaki gecis: "soft" (sarilmis), "hard" (\n), "para" (\n\n), sayfa sinirinda
    # sigan gecis icin "para_or_hard" (karar cagirana kalir).
    same_page = b["page"] == a["page"]
    if same_page and b["top"] - a["top"] > PARA_GAP_MIN:
        return "para"
    if is_label(b):
        return "para"
    if is_label(a):
        return "hard"
    if b.get("bullet"):
        return "hard" if same_page else "para_or_hard"
    last = a["units"][-1]["t"]
    need = 0.0 if last in JOIN_NO_SPACE_END else SPACE_W
    room = RIGHT_EDGE - a["x1"] - need
    if b["seg_w"] > room - HARD_MARGIN:
        return "soft"
    if not same_page:
        return "para_or_hard"
    # Sigdigi halde alt satira gecmis: blok degisimi ya da telif satiri paragraf, digeri satir sonu.
    if block_change(a, b) or b["units"][0]["t"] == "\u00a9":
        return "para"
    return "hard"


def join_units(a_units, b_units):
    last = a_units[-1]["t"]
    first = b_units[0]["t"]
    if (last in JOIN_NO_SPACE_END and len(a_units) > 1 and a_units[-2]["t"] != " ") or first in JOIN_NO_SPACE_START:
        return []
    return [{"t": " ", "italic": False, "ul": False, "bold": False}]


def NL(n=1):
    return [{"t": "\n", "italic": False, "ul": False, "bold": False} for _ in range(n)]


INTRO_RE = re.compile(r"^The following texts? ")


def rationale_para_start(done_units, next_units):
    done = "".join(u["t"] for u in done_units)
    nxt = "".join(u["t"] for u in next_units)
    return (
        "is the best answer" in done
        and "is incorrect" not in done
        and done.rstrip().endswith((".", "\u201d"))
        and re.match(r"Choice [A-D] is incorrect", nxt) is not None
    )


def assemble(lines, stats, page_break_mode, intro_para=False):
    # Satirlari tek bir isaretli birim dizisine cevirir. page_break_mode: sayfa sinirinda sigmayan
    # gecis icin "para" (aciklama) ya da "hard" (soru govdesi). intro_para: "The following text..."
    # giris paragrafindan sonraki ilk satir sonu (bosluksuz, girintisiz gecis) paragraf sayilir.
    out = []
    breaks = []
    intro_open = intro_para and bool(INTRO_RE.match(line_str(lines[0]))) if lines else False
    for i, line in enumerate(lines):
        units = list(line["units"])
        if line.get("bullet"):
            units = [{"t": "\u2022", "italic": False, "ul": False, "bold": False}, {"t": " ", "italic": False, "ul": False, "bold": False}] + units
        if i == 0:
            out.extend(units)
            continue
        kind = break_kind(lines[i - 1], line)
        if kind == "para_or_hard":
            stats["page_break_" + page_break_mode] += 1
            kind = page_break_mode
        elif lines[i - 1]["page"] != line["page"]:
            stats["page_break_soft"] += 1
            if page_break_mode == "para" and rationale_para_start(out, units):
                # Dolu satirla biten sayfa: genislik testi paragraf sonunu goremez. Aciklamalarda ilk
                # "Choice X is incorrect" cumlesi her zaman yeni paragraf baslatir (588 aciklamanin 587'si).
                stats["page_break_rationale_para"] += 1
                kind = "para"
        if intro_open and kind != "soft":
            if kind == "hard":
                stats["intro_hard_to_para"] += 1
                kind = "para"
            intro_open = False
        breaks.append(kind)
        if kind == "para":
            out.extend(NL(2))
        elif kind == "hard":
            out.extend(NL(1))
        else:
            out.extend(join_units(out, units))
        out.extend(units)
    return out, breaks


# ---------------------------------------------------------------- isaretli metin


def merge_blanks(units):
    # Alt cizgi dizisi (bosluk) tam alti alt cizgiye indirilir.
    out = []
    for u in units:
        if u["t"] == "_" and out and out[-1]["t"].startswith("_") and out[-1].get("blank"):
            continue
        if u["t"] == "_":
            u = dict(u, t="______", blank=True)
        out.append(u)
    return out


def render(units):
    # Birim dizisi -> metin. <u> dista, <i> iceride; bosluk iki yanindaki harfler isaretliyse isaretli;
    # isaretler satir sonunu asmaz.
    units = merge_blanks(units)
    n = len(units)
    flags = []
    for i, u in enumerate(units):
        if u["t"] == "\n":
            flags.append((False, False))
        elif u["t"] == " ":
            j = i - 1
            while j >= 0 and units[j]["t"] == " ":
                j -= 1
            k = i + 1
            while k < n and units[k]["t"] == " ":
                k += 1
            if j < 0 or k >= n or units[j]["t"] == "\n" or units[k]["t"] == "\n":
                flags.append((False, False))
            else:
                flags.append((units[j]["ul"] and units[k]["ul"], units[j]["italic"] and units[k]["italic"]))
        else:
            flags.append((u["ul"], u["italic"]))
    out = []
    cur_u, cur_i = False, False
    for u, (fu, fi) in zip(units, flags):
        if fu != cur_u:
            if cur_i:
                out.append("</i>")
                cur_i = False
            if cur_u:
                out.append("</u>")
            if fu:
                out.append("<u>")
            cur_u = fu
        if fi != cur_i:
            out.append("<i>" if fi else "</i>")
            cur_i = fi
        out.append("\\$" if u["t"] == "$" else u["t"])
    if cur_i:
        out.append("</i>")
    if cur_u:
        out.append("</u>")
    text = "".join(out)
    text = re.sub(r"[ ]*\n[ ]*", "\n", text)
    return text.strip()


# ---------------------------------------------------------------- soru govdesi ve cevap bolumu


def collect_lines(pages, spans, stats, with_figure):
    lines, figure = [], None
    for pi, y0, y1 in spans:
        chars, drawings, underlines, bullets = span_content(pages[pi], y0, y1)
        stats["underline_rects"] += len(underlines)
        if with_figure:
            fig = find_figure(chars, drawings)
            if fig:
                if figure:
                    raise ValueError(f"sayfa {pi + 1}: ikinci sekil")
                # clip: kirpma payinin tasamayacagi bos alan (ust: serit alti, alt: parcanin sonu; parse_body
                # alt siniri seklin altindaki ilk metin satirina indirir). Gorev 4 payi buna kistirir.
                page = pages[pi]
                figure = {
                    "kind": fig["kind"],
                    "page": pi + 1,
                    "bbox": [round(v, 2) for v in fig["bbox"]],
                    "clip": [0.0, round(y0, 2), round(page.width, 2), round(min(y1, page.height), 2)],
                }
                drop = set(id(c) for c in fig["chars"])
                chars = [c for c in chars if id(c) not in drop]
        elif drawings:
            raise ValueError(f"sayfa {pi + 1}: aciklama bolumunde cizim")
        built, notes = build_lines(chars, bullets, pi)
        for kind, _ in notes:
            stats["small_" + kind] += 1
        stats["implicit_spaces"] += sum(l["implicit_spaces"] for l in built)
        lines.extend(built)
    return lines, figure


CHOICE_RE = ("A", "B", "C", "D")


def parse_body(pages, spans, stats):
    lines, figure = collect_lines(pages, spans, stats, with_figure=True)
    # Siklar: x0 17-24.5 araliginda "A." ile baslayan satirlar, sirayla.
    starts = []
    want = 0
    for i, line in enumerate(lines):
        us = line["units"]
        if want < 4 and CHOICE_X[0] <= line["x0"] <= CHOICE_X[1] and len(us) >= 3 and us[0]["t"] == CHOICE_RE[want] and us[1]["t"] == "." and us[2]["t"] == " ":
            starts.append(i)
            want += 1
    if len(starts) != 4:
        raise ValueError(f"{len(starts)} sik bulundu")
    stem_lines = lines[: starts[0]]
    if not stem_lines:
        raise ValueError("soru metni bos")
    if figure and len(stem_lines) > 1:
        # Tablo/grafik notu: seklin hemen altinda tek basina duran kisa satir (ornek dd349efc) sekle aittir.
        l0, l1 = stem_lines[0], stem_lines[1]
        if l0["page"] + 1 == figure["page"] and 0 <= l0["top"] - figure["bbox"][3] < 8.0 and break_kind(l0, l1) == "hard":
            b = figure["bbox"]
            figure["bbox"] = [round(min(b[0], l0["x0"]), 2), b[1], round(max(b[2], l0["x1"]), 2), round(max(b[3], l0["bottom"]), 2)]
            stats["figure_note_line"] += 1
            stem_lines = stem_lines[1:]
    if figure:
        below = [l["top"] for l in lines if l["page"] + 1 == figure["page"] and l["top"] >= figure["bbox"][3]]
        if below:
            figure["clip"][3] = round(min(figure["clip"][3], min(below)), 2)
        if not (figure["clip"][1] <= figure["bbox"][1] and figure["bbox"][3] <= figure["clip"][3]):
            raise ValueError(f"sekil kutusu bos alanin disinda: {figure}")
    stem_units, breaks = assemble(stem_lines, stats, "hard", intro_para=True)
    choices = {}
    for k, s in enumerate(starts):
        e = starts[k + 1] if k + 1 < 4 else len(lines)
        cl = [dict(l) for l in lines[s:e]]
        cl[0] = dict(cl[0], units=cl[0]["units"][3:], x0=cl[0]["units"][3]["x0"])
        # Sik icinde satir sonu beklenmez: her gecis sarilmis satir sayilir; sigma testi farkli derse sayilir.
        units = list(cl[0]["units"])
        for a, b in zip(cl, cl[1:]):
            if b["page"] == a["page"] and b["top"] - a["top"] > PARA_GAP_MIN:
                raise ValueError(f"sik {CHOICE_RE[k]} icinde paragraf boslugu")
            if break_kind(a, b) != "soft":
                stats["choice_hard_like"] += 1
                stats.setdefault("choice_hard_like_samples", []).append(line_str(a)[-40:] + " | " + line_str(b)[:30])
            units.extend(join_units(units, b["units"]))
            units.extend(b["units"])
        choices[CHOICE_RE[k]] = render(units)
    return {"stem": render(stem_units), "choices": choices, "figure": figure, "stem_breaks": breaks, "stem_lines": stem_lines}


def parse_answer(pages, spans, stats):
    lines, _ = collect_lines(pages, spans, stats, with_figure=False)
    labels = {"Correct Answer:": None, "Rationale": None, "Question Difficulty:": None}
    for i, line in enumerate(lines):
        t = line_str(line)
        if line["bold"] and t in labels and labels[t] is None:
            labels[t] = i
    if any(v is None for v in labels.values()):
        raise ValueError(f"cevap bolumu etiketleri eksik: {labels}")
    a, r, d = labels["Correct Answer:"], labels["Rationale"], labels["Question Difficulty:"]
    if not (a < r < d):
        raise ValueError("cevap bolumu sirasi beklenmedik")
    answer = " ".join(line_str(l) for l in lines[a + 1 : r]).strip()
    rationale_units, _ = assemble(lines[r + 1 : d], stats, "para")
    difficulty = " ".join(line_str(l) for l in lines[d + 1 :]).strip()
    for l in lines:
        if l["bullet"]:
            stats["rationale_bullet"] += 1
    return {"answer": answer, "rationale": render(rationale_units), "difficulty_label": difficulty}


# ---------------------------------------------------------------- dosya isleme


def extract_file(path):
    is_key = path.startswith(KEYS_ROOT + os.sep)
    pages = load_pages(path)
    stats = Counter()
    records, problems = [], []
    for q in split_questions(pages):
        try:
            body = parse_body(pages, q["body"], stats)
            rec = {
                "id": q["id"],
                "source_file": os.path.basename(path),
                "page": q["page"] + 1,
                "domain": q["meta"]["Domain"],
                "skill": q["meta"]["Skill"],
                "stem": body["stem"],
                "choices": body["choices"],
                "figure": body["figure"],
            }
            if is_key:
                if not q["answer"]:
                    raise ValueError("cevap seridi yok")
                rec.update(parse_answer(pages, q["answer"], stats))
            elif q["answer"]:
                raise ValueError("soru dosyasinda cevap seridi")
            if q["meta"]["Assessment"] != "SAT" or q["meta"]["Test"] != "Reading and Writing":
                raise ValueError(f"beklenmeyen kunye {q['meta']}")
            records.append(rec)
        except ValueError as e:
            problems.append({"id": q["id"], "source_file": os.path.basename(path), "page": q["page"] + 1, "error": str(e)})
    samples = stats.pop("choice_hard_like_samples", [])
    return {"path": path, "key": is_key, "pages": len(pages), "records": records, "problems": problems, "stats": dict(stats), "samples": samples}


# ---------------------------------------------------------------- envanter, cikti


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def list_pdfs():
    keys, questions = [], []
    for root, out in ((KEYS_ROOT, keys), (QUESTIONS_ROOT, questions)):
        for dirpath, _, files in os.walk(root):
            for f in files:
                if f.endswith(".pdf"):
                    out.append(os.path.join(dirpath, f))
    return sorted(keys), sorted(questions)


def check_inventory(paths):
    # Kaynak dosyalar envanterle birebir ayni olmali (boyut + sha256); uymazsa durulur.
    if not os.path.exists(INVENTORY):
        sys.exit(f"Envanter yok: {INVENTORY}\nOnce: node scripts/sat/rw/inventory-rw.mjs")
    with open(INVENTORY, encoding="utf-8") as fh:
        inv = {f["path"]: f for f in json.load(fh)["files"]}
    rel = {os.path.relpath(p, SRC_ROOT): p for p in paths}
    errors = []
    if set(rel) != set(inv):
        errors.append(f"dosya kumesi farkli: fazla {sorted(set(rel) - set(inv))}, eksik {sorted(set(inv) - set(rel))}")
    for r, p in sorted(rel.items()):
        if r not in inv:
            continue
        if os.path.getsize(p) != inv[r]["bytes"] or sha256(p) != inv[r]["sha256"]:
            errors.append(f"degismis: {r}")
    if errors:
        sys.exit("Envanter uyusmuyor:\n  " + "\n  ".join(errors))
    return inv


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def run(paths, jobs):
    if jobs <= 1:
        return [extract_file(p) for p in paths]
    with ProcessPoolExecutor(jobs) as ex:
        return list(ex.map(extract_file, paths))


def feature_summary(records):
    # Rapor icin sayim (kayit basina; anahtar kayitlarinda aciklama da sayilir).
    c = Counter()
    for r in records:
        sc = [r["stem"]] + list(r["choices"].values())
        alltext = sc + ([r["rationale"]] if "rationale" in r else [])
        flags = {
            "underline": any("<u>" in t for t in sc),
            "italic_stem_or_choice": any("<i>" in t for t in sc),
            "italic_choice": any("<i>" in t for t in r["choices"].values()),
            "italic_rationale": "<i>" in r.get("rationale", ""),
            "italic_any": any("<i>" in t for t in alltext),
            "bullets": "\u2022 " in r["stem"],
            "blank": "______" in r["stem"],
            "text1_text2": bool(re.search(r"^Text 1\n", r["stem"])),
            "sub_sup_chars": any(re.search(r"[\u2070-\u209f\u00b2\u00b3\u00b9]", t) for t in alltext),
            "dollar": any("\\$" in t for t in alltext),
        }
        # Siir/diyalog gibi anlamli satir sonu: not maddesi ve Text etiketi disindaki tek \n.
        rest = re.sub(r"^Text [12]\n", "", r["stem"], flags=re.M)
        rest = re.sub(r"\n(?=\u2022 )", " ", rest)
        flags["verse_or_dialogue_breaks"] = bool(re.search(r"(?<!\n)\n(?!\n)", rest))
        for k, v in flags.items():
            if v:
                c[k] += 1
        if r["figure"]:
            c["figure_" + r["figure"]["kind"]] += 1
    return dict(sorted(c.items()))


def main(argv):
    jobs = 6
    only = None
    dump = None
    i = 0
    while i < len(argv):
        if argv[i] == "--jobs":
            jobs = int(argv[i + 1])
            i += 2
        elif argv[i] == "--only":
            only = argv[i + 1]
            i += 2
        elif argv[i] == "--dump":
            dump = set(argv[i + 1].split(","))
            i += 2
        else:
            sys.exit(f"bilinmeyen secenek: {argv[i]}")
    keys, questions = list_pdfs()
    inv = check_inventory(keys + questions)
    paths = keys + questions
    if only:
        paths = [p for p in paths if only in os.path.basename(p)]
    results = run(paths, jobs)
    problems = [p for r in results for p in r["problems"]]
    for r in results:
        rel = os.path.relpath(r["path"], SRC_ROOT)
        if inv[rel]["pages"] != r["pages"]:
            problems.append({"source_file": os.path.basename(r["path"]), "error": f"sayfa sayisi {r['pages']} (envanter {inv[rel]['pages']})"})
    stats = Counter()
    for r in results:
        stats.update(r["stats"])
    key_records = sorted((rec for r in results if r["key"] for rec in r["records"]), key=lambda x: (x["source_file"], x["page"]))
    q_records = sorted((rec for r in results if not r["key"] for rec in r["records"]), key=lambda x: (x["source_file"], x["page"]))
    if dump:
        for rec in key_records + q_records:
            if rec["id"] in dump:
                print(json.dumps(rec, ensure_ascii=False, indent=2))
        return 0
    print(f"anahtar kaydi {len(key_records)}, soru kaydi {len(q_records)}, sorun {len(problems)}")
    for p in problems:
        print("  SORUN", json.dumps(p, ensure_ascii=False))
    print("istatistik", json.dumps(dict(sorted(stats.items())), ensure_ascii=False))
    print("ozellik (anahtar)", json.dumps(feature_summary(key_records), ensure_ascii=False))
    for r in results:
        for s in r["samples"]:
            print("  sik-ici-sigma", os.path.basename(r["path"]), s)
    if only:
        return 1 if problems else 0
    if problems:
        print("Sorun var; cikti yazilmadi.")
        return 1
    os.makedirs(OUT_ROOT, exist_ok=True)
    write_json(os.path.join(OUT_ROOT, "extract-keys.json"), {"records": key_records})
    write_json(os.path.join(OUT_ROOT, "extract-questions.json"), {"records": q_records})
    print(f"yazildi: {OUT_ROOT}/extract-keys.json, extract-questions.json")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
