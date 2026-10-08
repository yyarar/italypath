#!/usr/bin/env python3
# IMAT: metin katmani saglam kagitlardan soru cikarma (plan Gorev 9). Metin yalniz PDF karakterlerinden
# kodla kurulur; elle ya da yapay zekayla duzeltme yok. Formul ve sekil goruntuden yazimda (Gorev 10) eklenir.
#
# Calistirma (once envanter: node scripts/imat/inventory.mjs):
#   IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank /usr/bin/python3 scripts/imat/extract_text.py --years 2024,2025
# Secenekler:
#   --years <yil,yil>   zorunlu; yalniz metin katmani saglam yillar
#   --layout mur        sayfa duzeni (varsayilan mur: 2023-2025 MUR denemesi; cambridge sonraki gorevde eklenir)
#   --dump <yil>:<no>   tek soruyu ekrana yazar (dosya yazmaz; hasImage nedenleri stderr'e)
#   --jobs <n>          paralel surec sayisi (yil basina; cikti sirasi degismez)
#   --self-test         italik isaret kurali oz sinamasi (PDF ve pdfplumber gerekmez; npm run test:imat-extract)
#
# Cikti: extract/<yil>.json = { year, source: "text", questions: [{ id, number, section, page, bbox, prompt,
# choices, hasImage, imageBoxes }] }. bbox ve imageBoxes PDF noktasi [x0, top, x1, bottom], page 1 tabanli.
# hasImage = goruntuden yazim gerekir: soru bandinda resim (en az 15x15 pt), en az 4 cizimlik kume
# (rect/curve), ya da metin katmaninin tasiyamadigi formul (vektor cizgi, denklem puntosu, eslenmeyen glif).
# Metin sozlesmesi: duz metin; paragraf "\n\n", sabit satir sonu "\n"; alinti kaynak satiri yerinde ayri satir;
# ust/alt simge Unicode; $...$ uretilmez.
# Italik (lib/sat/mathSegments.mjs sozlesmesi, Gorev 11 duzeltmesi): yazi tipi adi Italic/Oblique olan karakterler
# satir icinde ardisik dizilere toplanir; dizi en az 3 bosluksuz karakter tasiyorsa <i>...</i> ile sarilir. Sarilmaz:
# tek harf ya da 3 karakterlik bosluksuz harf/rakam/isaret dizisi (matematik degiskeni ya da nokta adi), denklem puntolu ya
# da eslenmeyen glif iceren dizi (formul nesnesi), tum bosluksuz karakterleri italik olan blok (tipografik blok
# bicimi: italik pasaj, tamami italik sik). Blok = "\n\n" ile ayrilan paragraf; alinti kaynak satiri pasajindan ayri
# bloktur (pasaj tamamen italik, kaynak satirindaki kitap adi isaretlenir). Isaretler satir sonunu asmaz: satir
# sonunda kapanir, dizi alt satirda surerse yeniden acilir. Kalin isaretlenmez.
import hashlib
import json
import os
import re
import sys
from collections import Counter
from concurrent.futures import ProcessPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SOURCE_DIR = os.path.abspath(os.environ["IMAT_SOURCE_DIR"]) if os.environ.get("IMAT_SOURCE_DIR") else os.path.join(os.path.expanduser("~"), "Desktop", "imat")
OUT_ROOT = os.path.abspath(os.environ["IMAT_OUT"]) if os.environ.get("IMAT_OUT") else os.path.join(os.getcwd(), "tmp", "imat-bank")
INVENTORY = os.path.join(OUT_ROOT, "inventory.json")
EXTRACT_DIR = os.path.join(OUT_ROOT, "extract")
TAXONOMY = os.path.join(REPO, "lib", "imat", "taxonomy.mjs")

# Bitisik harf glifleri -> ayri harfler.
LIGATURES = {"\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi", "\ufb04": "ffl"}
SPACE_CHARS = {" ", "\u00a0", "\u2002", "\u2003"}
# Kucuk puntolu ust/alt simge -> Unicode (H2O -> H\u2082O, cm2 -> cm\u00b2).
SUP = dict(zip("0123456789+-\u2212()=n", "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207a\u207b\u207b\u207d\u207e\u207c\u207f"))
SUB = dict(zip("0123456789+-\u2212()=", "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u208a\u208b\u208b\u208d\u208e\u208c"))
# Satir sonunda bunlardan biri (onundeki harfe bitisik) varsa sarilan satir bosluksuz birlesir.
JOIN_NO_SPACE_END = {"-", "\u2010", "\u2013", "\u2014"}
JOIN_NO_SPACE_START = {"\u2014"}
# Symbol fontu: pdfplumber kodu StandardEncoding ile cozer; asil glif Adobe Symbol tablosundadir.
SYMBOL_GREEK = dict(zip("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
                        "\u0391\u0392\u03a7\u0394\u0395\u03a6\u0393\u0397\u0399\u03d1\u039a\u039b\u039c\u039d\u039f\u03a0\u0398\u03a1\u03a3\u03a4\u03a5\u03c2\u03a9\u039e\u03a8\u0396"
                        "\u03b1\u03b2\u03c7\u03b4\u03b5\u03c6\u03b3\u03b7\u03b9\u03d5\u03ba\u03bb\u03bc\u03bd\u03bf\u03c0\u03b8\u03c1\u03c3\u03c4\u03c5\u03d6\u03c9\u03be\u03c8\u03b6"))
SYMBOL_STD = {
    '"': "\u2200", "$": "\u2203", "\u2019": "\u220b", "-": "\u2212", "@": "\u2245", "^": "\u22a5", "~": "\u223c",
    "\u00a3": "\u2264", "\u00a5": "\u221e", "\u00ab": "\u2194", "\u2039": "\u2190", "\u203a": "\u2191", "\ufb01": "\u2192",
    "\ufb02": "\u2193", "\u2013": "\u00b1", "\u2020": "\u2033", "\u2021": "\u2265", "\u00b7": "\u00d7", "\u00b6": "\u2202",
    "\u2022": "\u2022", "\u201a": "\u00f7", "\u201e": "\u2260", "\u201d": "\u2261", "\u00bb": "\u2248", "\u2026": "\u2026",
    "\u02d8": "\u2205", "\u00a8": "\u222a", "\u02c7": "\u2209", "\u2014": "\u2220",
}
SYMBOL_CODES = {0xB0: "\u00b0", 0xB1: "\u00b1", 0xB3: "\u2265", 0xB4: "\u00d7", 0xB9: "\u2260", 0xC6: "\u2205", 0xC7: "\u2229",
                0xC8: "\u222a", 0xCE: "\u2208", 0xCF: "\u2209", 0xD6: "\u221a", 0xD7: "\u22c5", 0xD8: "\u00ac", 0xD9: "\u2227",
                0xDA: "\u2228", 0xDB: "\u21d4", 0xDE: "\u21d2"}
CID_RE = re.compile(r"^\(cid:(\d+)\)$")
# Metin puntolari: bunlarin disindaki punto denklem nesnesidir (MathType 10.8/11.1/18.8 gibi) -> formul.
TEXT_SIZES = (5.0, 6.0, 7.0, 9.0, 10.0, 11.0, 12.0, 14.0)
BASE_MIN = 8.5  # bundan buyuk metin puntosu satir kurar; kucukler en yakin satira ust/alt simge olarak eklenir
PICTURE_MIN = 15.0  # resim sayilmak icin en kucuk kenar (pt); 2025 vurgu cercevesi seritleri 3.8x0.5
DRAWING_MIN = 4  # cizim kumesi en az bu kadar rect/curve
PARA_GAP = 1.55  # satir araligi normalin bu katindan buyukse paragraf sonu
HARD_MARGIN = 1.0
ITALIC_FONT = re.compile(r"Italic|Oblique", re.I)
MARK_MIN_CHARS = 3  # italik dizi en az bu kadar bosluksuz karakterle isaretlenir
# Bosluksuz, en cok MARK_MIN_CHARS uzunlukta ve yalniz harf/rakam/bu isaretlerden olusan italik dizi matematiktir.
MATH_RUN_CHARS = set("+-\u2212\u00b1\u00d7\u00f7\u00b7\u22c5=<>\u2264\u2265\u2260\u2248/^*()[]{}.,'\u2032\u2033")


def close_to(value, targets, tol=0.05):
    return any(abs(value - t) <= tol for t in targets)


def is_space(t):
    return t in SPACE_CHARS


def mid_y(o):
    return (o["top"] + o["bottom"]) / 2


def font_name(c):
    return c["fontname"].split("+")[-1]


def is_italic(c):
    return bool(ITALIC_FONT.search(c["font"]))


def is_formula_char(c):
    # Denklem nesnesi puntosu ya da eslenmeyen glif (image_signals ile ayni olcut): bu karakteri tasiyan dizi isaretlenmez.
    return bool(c.get("unmapped")) or not close_to(c["size"], TEXT_SIZES)


def color(v):
    if isinstance(v, (tuple, list)):
        return tuple(round(float(x), 4) for x in v)
    return v


# ---------------------------------------------------------------- sayfa modeli


def char_text(c):
    # Glif -> metin; eslenemeyen glif None (formul/sekil isareti).
    t = c["text"]
    font = font_name(c)
    m = CID_RE.match(t)
    if font.startswith("Symbol"):
        if m:
            return SYMBOL_CODES.get(int(m.group(1)))
        if t in SYMBOL_GREEK:
            return SYMBOL_GREEK[t]
        return SYMBOL_STD.get(t, t)
    if m or font.startswith(("Wingdings", "MTExtra", "MT Extra")):
        return None
    if t == "\u00a0":
        return " "
    return LIGATURES.get(t, t)


class Page:
    def __init__(self, pdf_page, index):
        self.index = index  # 0 tabanli
        self.width = float(pdf_page.width)
        self.height = float(pdf_page.height)
        self.chars = []
        seen = {}
        for c in pdf_page.chars:
            # Kalin taklidi: ayni glif 0.5 pt icinde dort kez basilir (2024 denklem nesneleri); biri kalir.
            key = (c["text"], round(float(c["x0"]) * 2), round(float(c["top"]) * 2))
            if any((key[0], key[1] + dx, key[2] + dy) in seen for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                continue
            seen[key] = True
            text = char_text(c)
            self.chars.append({
                "raw": c["text"],
                "t": text if text is not None else "\ufffd",
                "unmapped": text is None,
                "x0": float(c["x0"]), "x1": float(c["x1"]), "top": float(c["top"]), "bottom": float(c["bottom"]),
                "size": round(float(c["size"]), 2),
                "font": font_name(c),
            })
        self.images = [box(o) for o in pdf_page.images]
        self.rects = [dict(box(o), fill=bool(o.get("fill")), fill_color=color(o.get("non_stroking_color"))) for o in pdf_page.rects]
        self.lines = [box(o) for o in pdf_page.lines]
        self.curves = [box(o) for o in pdf_page.curves]


def box(o):
    return {"x0": float(o["x0"]), "x1": float(o["x1"]), "top": float(o["top"]), "bottom": float(o["bottom"])}


def load_pages(path):
    import pdfplumber  # yalniz PDF okurken; --self-test pdfplumber'siz calisir

    with pdfplumber.open(path) as pdf:
        return [Page(p, i) for i, p in enumerate(pdf.pages)]


# ---------------------------------------------------------------- satir kurma (duzenden bagimsiz)


def is_base(c):
    return not is_space(c["raw"]) and c["size"] >= BASE_MIN and close_to(c["size"], TEXT_SIZES) and not c["unmapped"]


def build_rows(page):
    # Metin puntosundaki karakterler satir kurar; geri kalanlar (kucuk punto, denklem puntosu, buyuk parantez)
    # dikeyde en yakin satira eklenir. Kucuk puntolu karakter ust ya da alt simge olarak isaretlenir.
    base = [c for c in page.chars if is_base(c)]
    rest = [c for c in page.chars if not is_base(c) and not is_space(c["raw"])]
    rows = []
    for c in sorted(base, key=lambda c: (round(mid_y(c), 1), c["x0"])):
        if rows and abs(rows[-1]["mid"] - mid_y(c)) <= 2.5:
            rows[-1]["chars"].append(c)
        else:
            rows.append({"mid": mid_y(c), "chars": [c]})
    for r in rows:
        r["base"] = list(r["chars"])
        r["band"] = (min(c["top"] for c in r["base"]), max(c["bottom"] for c in r["base"]))
    for c in rest:
        if not rows:
            continue
        best = min(rows, key=lambda r: abs(r["mid"] - mid_y(c)))
        cc = dict(c, attached=abs(best["mid"] - mid_y(c)))
        if c["size"] < BASE_MIN:
            cc["script"] = "sub" if c["bottom"] > best["band"][1] + 0.5 else "sup"
        best["chars"].append(cc)
    # Bosluk karakteri: orta noktasi satir bandinda olan en yakin satira (kucuk puntolu bosluklar dahil).
    for c in page.chars:
        if not is_space(c["raw"]):
            continue
        inside = [r for r in rows if r["band"][0] - 1.0 <= mid_y(c) <= r["band"][1] + 1.0]
        if inside:
            min(inside, key=lambda r: abs(r["mid"] - mid_y(c)))["chars"].append(dict(c, t=" "))
    out = []
    for r in rows:
        row = make_row(r["chars"], r["base"], page.index)
        if row:
            out.append(row)
    out.sort(key=lambda r: r["top"])
    return out


def map_script(text, script):
    # Ust/alt simge dizisi -> Unicode. "(s)", "(aq)" gibi harfli durum simgesi duz kalir; eslenemeyen baska
    # karakter (ondalik nokta, harf) duz yazilir ve formul isareti doner (goruntuden yazima gider).
    table = SUP if script == "sup" else SUB
    out, ok = [], True
    for part in re.split(r"(\([A-Za-z]+\))", text):
        if not part:
            continue
        if re.fullmatch(r"\([A-Za-z]+\)", part):
            out.append(part)
            continue
        for ch in part:
            if ch in table:
                out.append(table[ch])
            else:
                out.append(ch)
                ok = False
    return "".join(out), ok


def make_row(chars, base, page_index):
    # Genisligi sifir glif (2025 Symbol beta'si) tahmini genislik alir; altina dusen bosluk karakteri atilir.
    glyphs = []
    for c in chars:
        if c["t"] != " ":
            glyphs.append(dict(c, x1=c["x0"] + 0.5 * c["size"]) if c["x1"] - c["x0"] < 0.1 else c)
    spaces = [c for c in chars if c["t"] == " " and not any(g["x0"] - 0.1 <= c["x0"] < g["x1"] - 0.5 for g in glyphs)]
    ordered = sorted(glyphs + spaces, key=lambda c: (c["x0"], c["top"]))
    units = []
    unmapped_script = []
    prev = None
    i = 0
    while i < len(ordered):
        c = ordered[i]
        sp = c["t"] == " "
        if prev is not None and not sp and prev["t"] != " " and c["x0"] - prev["x1"] > 1.5:
            units.append({"t": " ", "x0": prev["x1"], "x1": c["x0"], "italic": False, "formula": False})
        if c.get("script"):
            j = i + 1
            while j < len(ordered) and ordered[j].get("script") == c["script"] and ordered[j]["x0"] - ordered[j - 1]["x1"] <= 1.0:
                j += 1
            run = ordered[i:j]
            text, ok = map_script("".join(x["t"] for x in run), c["script"])
            if not ok:
                unmapped_script.extend(run)
            units.append({
                "t": text, "x0": run[0]["x0"], "x1": run[-1]["x1"],
                "italic": all(is_italic(x) for x in run), "formula": any(is_formula_char(x) for x in run),
            })
            prev = run[-1]
            i = j
            continue
        units.append({
            "t": c["t"], "x0": c["x0"], "x1": c["x1"],
            "italic": not sp and is_italic(c), "formula": not sp and is_formula_char(c),
        })
        prev = c
        i += 1
    clean = []
    for u in units:
        if u["t"] == " " and (not clean or clean[-1]["t"] == " "):
            continue
        clean.append(u)
    while clean and clean[-1]["t"] == " ":
        clean.pop()
    if not clean:
        return None
    sizes = Counter(round(c["size"]) for c in base)
    return {
        "page": page_index,
        "top": min(c["top"] for c in base),
        "bottom": max(c["bottom"] for c in base),
        "ink_top": min(c["top"] for c in glyphs),
        "ink_bottom": max(c["bottom"] for c in glyphs),
        "x0": clean[0]["x0"],
        "x1": clean[-1]["x1"],
        "units": clean,
        "text": "".join(u["t"] for u in clean),
        "size": sizes.most_common(1)[0][0],
        "fonts": Counter(c["font"] for c in base),
        "chars": glyphs,
        "unmapped_script": unmapped_script,
    }


def strip_prefix(row, n_chars):
    # Satirin ilk n karakterlik birimini (soru numarasi / sik harfi) ve ardindaki bosluklari atar.
    units = row["units"]
    i = 0
    seen = 0
    while i < len(units) and seen < n_chars:
        if units[i]["t"] != " ":
            seen += len(units[i]["t"])
        i += 1
    while i < len(units) and units[i]["t"] == " ":
        i += 1
    rest = units[i:]
    if not rest:
        return None
    return dict(row, units=rest, x0=rest[0]["x0"], text="".join(u["t"] for u in rest))


def first_segment_width(units):
    x0 = units[0]["x0"]
    x1 = units[0]["x1"]
    for j, u in enumerate(units):
        if u["t"] == " ":
            break
        x1 = u["x1"]
        if u["t"] in JOIN_NO_SPACE_END and j > 0:
            break
    return x1 - x0


def glued_break_end(units):
    # Satir sonundaki bosluksuz kirma firsati: onundeki harfe bitisik tire/uzun cizgi.
    return len(units) >= 2 and units[-1]["t"] in JOIN_NO_SPACE_END and units[-2]["t"] != " "


def join_units(a_units, b_units):
    if glued_break_end(a_units) or b_units[0]["t"] in JOIN_NO_SPACE_START:
        return []
    return [{"t": " ", "italic": False, "formula": False}]


def is_break(u):
    return u["t"] in ("\n", "\n\n")


def is_blank(u):
    return u["t"] == " "


def italic_flags(units):
    # Harf birimi kendi yazi tipinden; bosluk ancak ayni satirdaki en yakin iki komsu harf birimi italikse italik.
    n = len(units)
    flags = [False] * n
    for i, u in enumerate(units):
        if is_break(u):
            continue
        if not is_blank(u):
            flags[i] = bool(u.get("italic"))
            continue
        j = i - 1
        while j >= 0 and is_blank(units[j]):
            j -= 1
        k = i + 1
        while k < n and is_blank(units[k]):
            k += 1
        flags[i] = (j >= 0 and k < n and not is_break(units[j]) and not is_break(units[k])
                    and bool(units[j].get("italic")) and bool(units[k].get("italic")))
    return flags


def run_qualifies(units, segments):
    # segments: ayni mantiksal dizinin satir parcalari [(bas, son)], son dahil degil.
    pieces = ["".join(units[i]["t"] for i in range(a, b)) for a, b in segments]
    text = " ".join(pieces)
    if sum(1 for ch in text if not ch.isspace()) < MARK_MIN_CHARS:
        return False  # tek ya da iki karakter (degisken, birim)
    if any(units[i].get("formula") for a, b in segments for i in range(a, b)):
        return False  # formul nesnesinin parcasi
    if not any(ch.isspace() for ch in text) and len(text) <= MARK_MIN_CHARS and all(ch.isalnum() or ch in MATH_RUN_CHARS for ch in text):
        return False  # kisa matematik dizisi (uc nokta adi, katsayili degisken)
    return True


def italic_marks(units):
    # Doner: her birim icin isaretli mi. Blok tamamen italikse hic isaret yok; aksi halde satir icindeki her italik
    # dizi run_qualifies'a gore. Satir sonunu (\n) asan dizi tek dizi sayilir ama isaret satir basina ayri yazilir.
    flags = italic_flags(units)
    marked = [False] * len(units)
    blocks, start = [], 0
    for i, u in enumerate(units):
        if u["t"] == "\n\n" or (u["t"] == "\n" and u.get("block")):
            blocks.append((start, i))
            start = i + 1
    blocks.append((start, len(units)))
    for b0, b1 in blocks:
        letters = [i for i in range(b0, b1) if not is_blank(units[i]) and not is_break(units[i])]
        if not letters or all(flags[i] for i in letters):
            continue  # bos ya da tamamen italik blok: tipografik bicim, isaretlenmez
        lines, s0 = [], b0
        for i in range(b0, b1):
            if units[i]["t"] == "\n":
                lines.append((s0, i))
                s0 = i + 1
        lines.append((s0, b1))
        runs = []  # mantiksal diziler: [[(bas, son), ...], ...]
        tail = None  # onceki satirin son harfinde biten dizinin sirasi
        for l0, l1 in lines:
            line_letters = [i for i in range(l0, l1) if not is_blank(units[i])]
            first = line_letters[0] if line_letters else None
            last = line_letters[-1] if line_letters else None
            next_tail = None
            i = l0
            while i < l1:
                if not flags[i]:
                    i += 1
                    continue
                j = i
                while j < l1 and flags[j]:
                    j += 1
                if tail is not None and i == first:
                    runs[tail].append((i, j))  # dizi satir sonunu asiyor: ayni dizi, ayri isaret
                    index = tail
                else:
                    runs.append([(i, j)])
                    index = len(runs) - 1
                if j - 1 == last:
                    next_tail = index
                i = j
            tail = next_tail
        for run in runs:
            if run_qualifies(units, run):
                for a, b in run:
                    for i in range(a, b):
                        marked[i] = True
    return marked


def render(units):
    # Gercek dolar isareti metin sozlesmesinde \$ (formul siniri sanilmasin). Italik isaretleri italic_marks'tan;
    # isaret hicbir zaman satir sonu birimini kapsamaz (satir icinde dengeli).
    marked = italic_marks(units)
    out, open_ = [], False
    for u, m in zip(units, marked):
        if m and not open_:
            out.append("<i>")
            open_ = True
        elif not m and open_:
            out.append("</i>")
            open_ = False
        out.append(u["t"])
    if open_:
        out.append("</i>")
    text = "".join(out).replace("$", "\\$")
    text = re.sub(r"[ ]*\n[ ]*", "\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


# ---------------------------------------------------------------- MUR duzeni (2023-2025 deneme kagitlari)


class MurLayout:
    # Kural: soru satiri "^\s*(\d{1,2})\.\s" (sol sutun), sik satiri "^\s*([A-E])\)\s" (girintili), bolum basligi
    # Times-Bold 12; sayfa basligi "Ministero ..." (Times-Bold 14), sayfa numarasi (Times-Roman 10, alt bant)
    # ve "FINE DELLE DOMANDE" satiri atilir; FINE'dan sonrasi okunmaz.
    name = "mur"
    QUESTION_RE = re.compile(r"^\s*(\d{1,2})\.\s")
    CHOICE_RE = re.compile(r"^\s*([A-E])\)\s")
    NUMBER_X_MAX = 80.0  # soru numarasi x0 = 68
    CHOICE_X = (100.0, 125.0)  # sik harfi x0 = 110.6
    SECTIONS = (
        ("readingskillsandknowledgeacquiredduringstudies", "reading-general"),
        ("logicalreasoningandproblem-solving", "logic"),
        ("biology", "biology"),
        ("chemistry", "chemistry"),
        ("physicsandmathematics", "physics-math"),
    )

    @staticmethod
    def _key(text):
        return re.sub(r"\s+", "", text).lower()

    def classify(self, row):
        key = self._key(row["text"])
        fonts = row["fonts"]
        if "FINEDELLEDOMANDE" in re.sub(r"\s+", "", row["text"]):
            return "end", None
        if fonts.get("Times-Bold") and row["size"] == 14 and key.startswith("ministero"):
            return "noise", "header"
        if fonts.get("Times-Roman") and row["size"] == 10 and re.fullmatch(r"\d{1,2}", key) and row["top"] > 760:
            return "noise", "page-number"
        if fonts.get("Times-Bold") and row["size"] == 12:
            for prefix, slug in self.SECTIONS:
                if key == prefix:
                    return "section", slug
        return "content", None

    def question_start(self, row, expected):
        m = self.QUESTION_RE.match(row["text"])
        return bool(m) and int(m.group(1)) == expected and row["x0"] <= self.NUMBER_X_MAX

    def choice_start(self, row, letter):
        m = self.CHOICE_RE.match(row["text"])
        return bool(m) and m.group(1) == letter and self.CHOICE_X[0] <= row["x0"] <= self.CHOICE_X[1]

    def is_citation(self, row):
        # Alinti kaynak satiri: 9 pt, saga yasli (pasajin altinda).
        return row["size"] == 9 and row["x0"] > 200.0


LAYOUTS = {"mur": MurLayout}


# ---------------------------------------------------------------- soru bolme


def split_questions(pages, layout):
    # Satirlar sayfa sayfa yururken: soru baslangici, sik baslangiclari, bolum basliklari.
    questions = []
    section = None
    current = None
    expected = 1
    ended = False
    for page in pages:
        for row in build_rows(page):
            if ended:
                break
            kind, payload = layout.classify(row)
            if kind == "end":
                ended = True
                break
            if kind == "noise":
                continue
            if kind == "section":
                section = payload
                if current:
                    current["closed_at"] = (row["page"], row["top"])
                continue
            if layout.question_start(row, expected):
                if section is None:
                    raise ValueError(f"soru {expected}: bolum basligindan once")
                current = {"number": expected, "section": section, "rows": [row], "choice_starts": [], "closed_at": None}
                questions.append(current)
                expected += 1
                continue
            if current is None:
                continue  # ilk sorudan onceki kapak/talimat metni
            if current["closed_at"]:
                raise ValueError(f"soru {current['number']}: bolum basligindan sonra sahipsiz satir (sayfa {row['page'] + 1})")
            letters = "ABCDE"
            k = len(current["choice_starts"])
            if k < 5 and layout.choice_start(row, letters[k]):
                current["choice_starts"].append(len(current["rows"]))
            current["rows"].append(row)
    if not ended:
        raise ValueError("FINE DELLE DOMANDE satiri bulunamadi")
    return questions


def break_kind(a, b, right_edge, layout):
    # a -> b gecisi: "soft" (sarilmis), "hard" (\n), "para" (\n\n).
    if layout.is_citation(b):
        return "hard"
    if layout.is_citation(a):
        return "para"
    if a["page"] != b["page"]:
        return "para"
    pitch = 1.15 * max(a["size"], b["size"])
    if b["top"] - a["top"] > PARA_GAP * pitch:
        return "para"
    if a["size"] != b["size"]:
        return "para"
    last = a["units"][-1]["t"]
    need = 0.0 if last in JOIN_NO_SPACE_END else 0.278 * a["size"]
    room = right_edge - a["x1"] - need
    if first_segment_width(b["units"]) > room - HARD_MARGIN:
        return "soft"
    return "hard"


def assemble(rows, right_edge, layout, stats, kind_name):
    out = list(rows[0]["units"])
    for a, b in zip(rows, rows[1:]):
        kind = break_kind(a, b, right_edge, layout)
        stats[f"{kind_name}_{kind}"] += 1
        if kind == "para":
            out.append({"t": "\n\n"})
        elif kind == "hard":
            # Pasajdan kaynak satirina gecis italik blok siniridir (pasajin tamami italik olabilir, kaynak satiri degil).
            out.append({"t": "\n", "block": layout.is_citation(b) and not layout.is_citation(a)})
        else:
            out.extend(join_units(out, b["units"]))
        out.extend(b["units"])
    return render(out)


def union(boxes):
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]


def as_list(o):
    return [o["x0"], o["top"], o["x1"], o["bottom"]]


def overlaps(o, x0, top, x1, bottom):
    return o["x1"] > x0 and o["x0"] < x1 and o["bottom"] > top and o["top"] < bottom


def is_highlight(col):
    return isinstance(col, tuple) and len(col) == 3 and abs(col[0] - 0.8008) < 0.02 and col[1] > 0.98 and abs(col[2] - 0.8008) < 0.02


def image_signals(page, band, rows):
    # band: [x0, top, x1, bottom] soru alani. Doner: ({neden: [kutu]}).
    x0, top, x1, bottom = band
    found = {}
    pictures = [im for im in page.images if overlaps(im, x0, top, x1, bottom)
                and im["x1"] - im["x0"] >= PICTURE_MIN and im["bottom"] - im["top"] >= PICTURE_MIN]
    if pictures:
        found["picture"] = [as_list(im) for im in pictures]
    frames = page.images
    drawings = []
    for r in page.rects:
        if not overlaps(r, x0, top, x1, bottom):
            continue
        w, h = r["x1"] - r["x0"], r["bottom"] - r["top"]
        if r["fill"] and r["fill_color"] in (1.0, (1.0,), (1.0, 1.0, 1.0)):
            continue  # beyaz zemin
        if is_highlight(r["fill_color"]):
            continue  # 2025 dogru cevap vurgusu
        if min(w, h) < 2.0:
            continue  # alti cizgi / baslik cizgisi
        if any(abs(r["x0"] - im["x0"]) < 1 and abs(r["top"] - im["top"]) < 1 and abs(r["x1"] - im["x1"]) < 1 and abs(r["bottom"] - im["bottom"]) < 1 for im in frames):
            continue  # resim cercevesi
        drawings.append(r)
    drawings += [c for c in page.curves if overlaps(c, x0, top, x1, bottom)]
    if len(drawings) >= DRAWING_MIN:
        found["drawing"] = [union([as_list(d) for d in drawings])]
    formula = [as_list(l) for l in page.lines if overlaps(l, x0, top, x1, bottom)]
    reasons = []
    if formula:
        reasons.append("vector-lines")
    eq_chars = [c for r in rows for c in r["chars"] if not close_to(c["size"], TEXT_SIZES)]
    if eq_chars:
        reasons.append("equation-size")
    bad = [c for r in rows for c in r["chars"] if c.get("unmapped")]
    if bad:
        reasons.append("unmapped-glyph")
    stacked = [c for r in rows for c in r["chars"] if c.get("attached", 0) > 7.0]
    if stacked:
        reasons.append("stacked")
    script = [c for r in rows for c in r["unmapped_script"]]
    if script:
        reasons.append("script-unmapped")
    flagged = eq_chars + bad + stacked + script
    if formula or flagged:
        found["formula"] = [union(formula + [as_list(c) for c in flagged])]
        found["formula_reasons"] = reasons
    return found


def parse_paper(path, year, layout):
    pages = load_pages(path)
    stats = Counter()
    questions = split_questions(pages, layout)
    content_rows = [r for q in questions for r in q["rows"]]
    right_edge = max(r["x1"] for r in content_rows)
    records, problems, reasons = [], [], {}
    for idx, q in enumerate(questions):
        n = q["number"]
        try:
            rows = q["rows"]
            if len({r["page"] for r in rows}) != 1:
                raise ValueError(f"soru iki sayfaya yayiliyor ({sorted({r['page'] + 1 for r in rows})})")
            if len(q["choice_starts"]) != 5:
                raise ValueError(f"{len(q['choice_starts'])} sik bulundu")
            page = pages[rows[0]["page"]]
            first = strip_prefix(rows[0], len(f"{n}."))
            starts = q["choice_starts"]
            stem_rows = ([first] if first else []) + rows[1:starts[0]]
            if not stem_rows:
                raise ValueError("soru metni bos")
            prompt = assemble(stem_rows, right_edge, layout, stats, "stem")
            choices = {}
            for k, s in enumerate(starts):
                e = starts[k + 1] if k + 1 < 5 else len(rows)
                crow = strip_prefix(rows[s], 2)
                if crow is None:
                    raise ValueError(f"sik {'ABCDE'[k]} bos")
                units = list(crow["units"])
                for a, b in zip([crow] + rows[s + 1:e], rows[s + 1:e]):
                    if break_kind(a, b, right_edge, layout) != "soft":
                        stats["choice_hard_like"] += 1
                    units.extend(join_units(units, b["units"]))
                    units.extend(b["units"])
                choices["ABCDE"[k]] = render(units)
                if not choices["ABCDE"[k]]:
                    raise ValueError(f"sik {'ABCDE'[k]} bos")
            # Soru bandi: ilk satirin ustunden sonraki sorunun/basligin ustune (ayni sayfada) ya da sayfa sonuna.
            band_top = min(r["ink_top"] for r in rows) - 2.0
            nxt = questions[idx + 1]["rows"][0] if idx + 1 < len(questions) else None
            if q["closed_at"] and q["closed_at"][0] == page.index:
                band_bottom = q["closed_at"][1]
            elif nxt is not None and nxt["page"] == page.index:
                band_bottom = nxt["ink_top"] - 1.0
            else:
                band_bottom = max(r["ink_bottom"] for r in rows) + 40.0
            band = [0.0, band_top, page.width, min(band_bottom, page.height)]
            signals = image_signals(page, band, rows)
            image_boxes = [b for key in ("picture", "drawing", "formula") for b in signals.get(key, [])]
            text_box = union([[r["x0"], r["ink_top"], r["x1"], r["ink_bottom"]] for r in rows])
            bbox = union([text_box] + image_boxes)
            has_image = bool(image_boxes)
            why = [key for key in ("picture", "drawing") if key in signals] + signals.get("formula_reasons", [])
            reasons[n] = why
            for w in why:
                stats["hasImage_" + w] += 1
            records.append({
                "id": question_id(year, n),
                "number": n,
                "section": q["section"],
                "page": page.index + 1,
                "bbox": [round(v, 2) for v in bbox],
                "prompt": prompt,
                "choices": choices,
                "hasImage": has_image,
                "imageBoxes": [[round(v, 2) for v in b] for b in image_boxes],
            })
        except ValueError as err:
            problems.append({"year": year, "number": n, "error": str(err)})
    return {"year": year, "pages": len(pages), "records": records, "problems": problems, "stats": dict(stats), "reasons": reasons}


def question_id(year, number):
    return hashlib.sha256(f"imat:{year}:{number}".encode("utf-8")).hexdigest()[:8]


# ---------------------------------------------------------------- envanter, taksonomi, cikti


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def check_inventory():
    # inventory.mjs --check ile ayni kapi: her kaynagin boyutu ve sha256'si kayitla ayni olmali.
    if not os.path.exists(INVENTORY):
        sys.exit(f"Envanter yok: {INVENTORY}\nOnce: node scripts/imat/inventory.mjs")
    with open(INVENTORY, encoding="utf-8") as fh:
        inv = {entry["year"]: entry for entry in json.load(fh)}
    errors = []
    for year, entry in sorted(inv.items()):
        path = os.path.join(SOURCE_DIR, entry["file"])
        if not os.path.exists(path):
            errors.append(f"{year}: kaynak yok ({path})")
        elif os.path.getsize(path) != entry["bytes"] or sha256(path) != entry["sha256"]:
            errors.append(f"{year}: degismis ({entry['file']})")
    if errors:
        sys.exit("Envanter uyusmuyor:\n  " + "\n  ".join(errors))
    return inv


def mock_section_counts():
    # Tek kaynak lib/imat/taxonomy.mjs (MOCK_SECTION_COUNTS); burada okunur, kopyalanmaz.
    with open(TAXONOMY, encoding="utf-8") as fh:
        src = fh.read()
    years = re.search(r"MOCK_YEARS = Object\.freeze\(\[([^\]]*)\]\)", src)
    counts = re.search(r"MOCK_SECTION_COUNTS = Object\.freeze\(\{(.*?)\}\)", src, re.S)
    if not years or not counts:
        sys.exit(f"taksonomi okunamadi: {TAXONOMY}")
    pairs = re.findall(r'"?([a-z-]+)"?\s*:\s*(\d+)', counts.group(1))
    return [int(y) for y in re.findall(r"\d{4}", years.group(1))], {k: int(v) for k, v in pairs}


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def run_one(args):
    path, year, layout_name = args
    return parse_paper(path, year, LAYOUTS[layout_name]())


def validate(result, inv_entry, mock_years, mock_counts):
    problems = list(result["problems"])
    year = result["year"]
    recs = result["records"]
    if result["pages"] != inv_entry["pages"]:
        problems.append({"year": year, "error": f"sayfa sayisi {result['pages']} (envanter {inv_entry['pages']})"})
    numbers = [r["number"] for r in recs]
    expected = inv_entry["expectedQuestions"]
    if not result["problems"] and numbers != list(range(1, expected + 1)):
        problems.append({"year": year, "error": f"soru numaralari 1..{expected} degil ({len(numbers)} kayit)"})
    if year in mock_years:
        got = Counter(r["section"] for r in recs)
        if dict(got) != mock_counts:
            problems.append({"year": year, "error": f"bolum sayilari {dict(got)} (beklenen {mock_counts})"})
    return problems


def parse_args(argv):
    opts = {"years": None, "layout": "mur", "dump": None, "jobs": 2}
    i = 0
    while i < len(argv):
        name = argv[i]
        if name in ("--years", "--layout", "--dump", "--jobs") and i + 1 < len(argv):
            opts[name[2:]] = argv[i + 1]
            i += 2
        else:
            sys.exit(f"bilinmeyen secenek: {name}")
    if not opts["years"] and not opts["dump"]:
        sys.exit("--years zorunlu (ornek: --years 2024,2025)")
    opts["years"] = sorted({int(y) for y in opts["years"].split(",")}) if opts["years"] else []
    opts["jobs"] = int(opts["jobs"])
    if opts["layout"] not in LAYOUTS:
        sys.exit(f"bilinmeyen duzen: {opts['layout']} (var olan: {', '.join(LAYOUTS)})")
    if opts["dump"]:
        m = re.fullmatch(r"(\d{4}):(\d{1,2})", opts["dump"])
        if not m:
            sys.exit("--dump bicimi <yil>:<no> (ornek: 2024:5)")
        opts["dump"] = (int(m.group(1)), int(m.group(2)))
        opts["years"] = [opts["dump"][0]]
    return opts


def self_test():
    # Italik isaret kurali (render/italic_marks) sentetik birimlerle; PDF yok. Doner 0, hata AssertionError.
    def units(*parts):
        # parts: ("metin", italik?, formul?) ya da "\n" / "\n\n" / "|" (kaynak satiri blok siniri).
        out = []
        for part in parts:
            if part in ("\n", "\n\n"):
                out.append({"t": part})
                continue
            if part == "|":
                out.append({"t": "\n", "block": True})
                continue
            text, italic, formula = (part + (False, False))[:3] if isinstance(part, tuple) else (part, False, False)
            for ch in text:
                out.append({"t": ch, "italic": italic and ch != " ", "formula": formula and ch != " "})
        return out

    def balanced_per_line(text):
        for line in text.split("\n"):
            depth = 0
            for tag in re.findall(r"</?i>", line):
                depth += 1 if tag == "<i>" else -1
                assert depth in (0, 1), f"ic ice ya da karsiliksiz isaret: {line!r}"
            assert depth == 0, f"satir sonunu asan isaret: {line!r}"

    checks = 0

    def expect(parts, wanted, label):
        nonlocal checks
        got = render(units(*parts))
        assert got == wanted, f"{label}: {got!r} != {wanted!r}"
        balanced_per_line(got)
        plain = "".join(u["t"] for u in units(*parts)).replace("$", "\\$").strip()
        assert re.sub(r"</?i>", "", got) == plain, f"{label}: isaretler silinince metin degisiyor"
        checks += 1

    # Fikstur metinleri uydurmadir (hicbir kagittan parca yok; bankaya 4 kelimelik pencereyle karsi denetlendi).
    # 1 kismi italik dizi -> isaret (uydurma kitap adi; noktalama disarida)
    expect(("Lena borrowed ", ("The Copper Lantern Diaries", True), " twice."), "Lena borrowed <i>The Copper Lantern Diaries</i> twice.", "kismi dizi")
    # 2 tamamen italik paragraf -> isaret yok; sonraki paragraf ayri blok
    expect(
        (("Marbled clouds drifted over the quiet harbour town.", True), "\n\n", "Pick the closest summary."),
        "Marbled clouds drifted over the quiet harbour town.\n\nPick the closest summary.",
        "tamamen italik paragraf",
    )
    # 3 tek italik harf (matematik degiskeni) -> isaret yok
    expect(("Solve for the unknown ", ("q", True), " below."), "Solve for the unknown q below.", "tek harf")
    # 4 iki karakter ve uc karakterlik bosluksuz matematik dizisi -> isaret yok
    expect(("a span of 7 ", ("uv", True), " near corner ", ("PQK", True)), "a span of 7 uv near corner PQK", "kisa matematik dizisi")
    # 5 formul nesnesi karakteri tasiyan dizi -> isaret yok
    expect(("the ratio ", ("rtWz", True, True), " holds"), "the ratio rtWz holds", "formul nesnesi")
    # 6 satir basina dengeli: art arda iki italik satir ayri ayri kapanir/acilir, blok kismi
    expect(
        ("Consider both claims", "\n", ("Every violinist in Orvella owns a blue scarf", True), "\n", ("Tomas owns no blue scarf", True), "\n", "What follows?"),
        "Consider both claims\n<i>Every violinist in Orvella owns a blue scarf</i>\n<i>Tomas owns no blue scarf</i>\nWhat follows?",
        "satir basina dengeli",
    )
    # 7 satir sonunu asan dizi: alt satirdaki kisa parca da isaretlenir (dizi bir butun)
    expect(
        ("Read ", ("The Glass Orchard of", True), "\n", ("Vel", True), " again"),
        "Read <i>The Glass Orchard of</i>\n<i>Vel</i> again",
        "satir asan dizi",
    )
    # 8 pasaj tamamen italik, kaynak satiri ayri blok: pasaj isaretsiz, kaynak satirindaki kitap adi isaretli
    expect(
        (("Gulls argued loudly above the drying nets.", True), "|", "Mira Totten ", ("Salt and Rope Tales", True), " - Northwind Press", "\n\n", "Choose one."),
        "Gulls argued loudly above the drying nets.\nMira Totten <i>Salt and Rope Tales</i> - Northwind Press\n\nChoose one.",
        "pasaj + kaynak satiri",
    )
    # 9 tamamen italik sik (tek blok) -> isaret yok; bosluk yalniz iki yani italikse italik
    expect((("Seven Lamps for a Patient Clockmaker", True),), "Seven Lamps for a Patient Clockmaker", "tamamen italik sik")
    expect(("Corvin ", ("Ashfall", True), " and ", ("Tidewort", True)), "Corvin <i>Ashfall</i> and <i>Tidewort</i>", "iki ayri dizi")
    # 10 dolar kacisi isaretle birlikte korunur
    expect(("Price ", ("in $ units", True), " shown"), "Price <i>in \\$ units</i> shown", "dolar kacisi")
    return checks


def main(argv):
    if argv == ["--self-test"]:
        checks = self_test()
        print(f"extract_text oz sinama: {checks} kontrol gecti (kismi dizi, tamamen italik blok, tek harf, kisa matematik, formul, satir basina denge, kaynak satiri)")
        return 0
    opts = parse_args(argv)
    inv = check_inventory()
    for year in opts["years"]:
        if year not in inv:
            sys.exit(f"envanterde yok: {year}")
        if inv[year]["textLayer"] != "ok":
            sys.exit(f"{year}: metin katmani bozuk; goruntuden yazilir (crop-questions.mjs)")
    mock_years, mock_counts = mock_section_counts()
    tasks = [(os.path.join(SOURCE_DIR, inv[y]["file"]), y, opts["layout"]) for y in opts["years"]]
    if opts["jobs"] <= 1 or len(tasks) == 1:
        results = [run_one(t) for t in tasks]
    else:
        with ProcessPoolExecutor(min(opts["jobs"], len(tasks))) as ex:
            results = list(ex.map(run_one, tasks))
    if opts["dump"]:
        year, number = opts["dump"]
        rec = next((r for r in results[0]["records"] if r["number"] == number), None)
        if rec is None:
            err = [p for p in results[0]["problems"] if p.get("number") == number]
            sys.exit(f"{year}:{number} bulunamadi {err}")
        print(json.dumps(rec, ensure_ascii=False, indent=2))
        print(f"hasImage nedenleri: {results[0]['reasons'].get(number) or '-'}", file=sys.stderr)
        return 0
    problems = []
    for res in results:
        problems += validate(res, inv[res["year"]], mock_years, mock_counts)
        recs = res["records"]
        sections = Counter(r["section"] for r in recs)
        five = sum(1 for r in recs if len(r["choices"]) == 5 and all(r["choices"].values()))
        flagged = [r["number"] for r in recs if r["hasImage"]]
        print(f"{res['year']}: {len(recs)} soru, 5 dolu sikli {five}, bolumler {dict(sections)}, hasImage {len(flagged)} {flagged}")
        print(f"  istatistik {json.dumps(dict(sorted(res['stats'].items())), ensure_ascii=False)}")
    for p in problems:
        print("  SORUN", json.dumps(p, ensure_ascii=False))
    if problems:
        print("Sorun var; cikti yazilmadi.")
        return 1
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    for res in results:
        out = os.path.join(EXTRACT_DIR, f"{res['year']}.json")
        write_json(out, {"year": res["year"], "source": "text", "questions": res["records"]})
        print(f"yazildi: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
