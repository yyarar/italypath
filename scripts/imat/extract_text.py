#!/usr/bin/env python3
# IMAT: metin katmani saglam kagitlardan soru cikarma (plan Gorev 9). Metin yalniz PDF karakterlerinden
# kodla kurulur; elle ya da yapay zekayla duzeltme yok. Formul ve sekil goruntuden yazimda (Gorev 10) eklenir.
#
# Calistirma (once envanter: node scripts/imat/inventory.mjs):
#   IMAT_OUT=/Users/keremyarar/italypath-main/tmp/imat-bank /usr/bin/python3 scripts/imat/extract_text.py --years 2024,2025
# Secenekler:
#   --years <yil,yil>   zorunlu; yalniz metin katmani saglam yillar
#   --layout <ad>       sayfa duzeni: mur (varsayilan; 2023-2025 MUR denemesi) | cambridge (2011-2022 gecmis kagitlari) |
#                       mur-legacy (2011-2020 MUR "hep A" kopyalari, keys/sources/<yil>-mur.pdf; --source ile)
#   --decode-shift <n>  glif numarasi -> kod noktasi kaydirmasi. Envanter yilinda kaydirma inventory.json'dan gelir (textLayer
#                       "decoded", decodeShift; 2021: 29); verilirse ayni olmali, "ok" yilda reddedilir. Cozulmus yilin cikarimi
#                       vision/<yil>/decode-check.json accepted true ister (--rows ve --dump istemez). --source kipinde kaydirma
#                       yalniz bu secenekle. Orkestrasyon scripts/imat/decode-2021.mjs.
#   --source <pdf> --out <json> --expected <n>
#                       envanter disi tek kagit (tek --years yili): envanter/kaynak klasoru kontrolu yok, sayim --expected'a
#                       gore; sorun yoksa yalniz --out yazilir (orkestrasyon scripts/imat/compare-mur-order.mjs)
#   --dump <yil>:<no>   tek soruyu ekrana yazar (dosya yazmaz; hasImage nedenleri stderr'e)
#   --rows <yil>        o yilin tum satirlarini JSON olarak ekrana yazar ({ page, top, bottom, x0, x1, text }; dosya yazmaz;
#                       decode-2021.mjs goz kontrolu orneklemi bunu kullanir)
#   UYARI: --rows ve --dump sinav metnini konsola basar; ciktisi sohbete, rapora, commit'e ya da Git'e kopyalanmaz.
#   --jobs <n>          paralel surec sayisi (yil basina; cikti sirasi degismez)
#   --self-test         italik isaret kurali + cambridge ve mur-legacy duzeni oz sinamasi (uydurma fikstur; PDF ve pdfplumber
#                       gerekmez; npm run test:imat-extract)
# Guvenilmeyen PDF (indirilmis kagit) `/usr/bin/python3 -I` ile okunur; -I kullanici paketlerini kapattigindan pdfplumber
# load_pages icinde kullanici site-packages yolundan yuklenir.
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
import contextlib
import hashlib
import io
import json
import os
import re
import sys
import tempfile
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
# Simge icindeki kisa tire (U+2013) eksi isaretidir (Cambridge: 10\u207b\u2077, SO\u2084\u00b2\u207b).
SUP = dict(zip("0123456789+-\u2212\u2013()=n", "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207a\u207b\u207b\u207b\u207d\u207e\u207c\u207f"))
SUB = dict(zip("0123456789+-\u2212\u2013()=", "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089\u208a\u208b\u208b\u208b\u208d\u208e\u208c"))
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
    return bool(c.get("unmapped")) or bool(c.get("eq"))


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


def make_decoder(shift):
    # 2021 kagidi: metin katmani glif numarasi tasir ("(cid:N)"); N + shift ASCII kod noktasidir (3 -> bosluk, 68 -> a).
    # Yalniz 32..126 araligina dusen numaralar kaydirilir; ASCII disi glifler sayfa goruntusuyle dogrulanmis
    # DECODE_EXTRA tablosundan, tabloda olmayan glif "(cid:N)" kalir (eslenmez -> formul isareti, goruntuden yazim).
    def decode(text):
        m = CID_RE.match(text)
        if not m:
            return text
        n = int(m.group(1))
        if 32 <= n + shift <= 126:
            return chr(n + shift)
        return DECODE_EXTRA.get(n, text)
    return decode


def is_white(col):
    if col is None:
        return False
    vals = list(col) if isinstance(col, (tuple, list)) else [col]
    try:
        vals = [float(v) for v in vals]
    except (TypeError, ValueError):
        return False
    if len(vals) == 4:
        return all(v <= 0.01 for v in vals)  # CMYK beyaz
    return bool(vals) and all(v >= 0.99 for v in vals)


def is_invisible(o):
    # Beyaz cizgi ve beyaz dolgu: Cambridge kagitlarinda her sorunun gorunmez cercevesi ve kose noktalari.
    stroked = bool(o.get("stroke")) and not is_white(o.get("stroking_color"))
    filled = bool(o.get("fill")) and not is_white(o.get("non_stroking_color"))
    return not stroked and not filled


class Page:
    def __init__(self, pdf_page, index, layout, decode=None):
        self.index = index  # 0 tabanli
        self.width = float(pdf_page.width)
        self.height = float(pdf_page.height)
        self.chars = []
        seen = {}
        for c in pdf_page.chars:
            src = c["text"]
            if decode is not None:
                src = decode(src)
            src = layout.CHAR_MAP.get(src, src)
            if src == "":
                continue  # sifir genislikli bosluk
            c = dict(c, text=src)
            # Kalin taklidi: ayni glif 0.5 pt icinde dort kez basilir (2024 denklem nesneleri); biri kalir.
            key = (c["text"], round(float(c["x0"]) * 2), round(float(c["top"]) * 2))
            if any((key[0], key[1] + dx, key[2] + dy) in seen for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                continue
            seen[key] = True
            text = char_text(c)
            size = round(float(c["size"]), 2)
            self.chars.append({
                "raw": c["text"],
                "t": text if text is not None else "\ufffd",
                "unmapped": text is None,
                "eq": not close_to(size, layout.TEXT_SIZES),  # denklem nesnesi puntosu
                "x0": float(c["x0"]), "x1": float(c["x1"]), "top": float(c["top"]), "bottom": float(c["bottom"]),
                "size": size,
                "font": font_name(c),
            })
        keep = (lambda o: not is_invisible(o)) if layout.IGNORE_INVISIBLE else (lambda o: True)
        self.images = [box(o) for o in pdf_page.images]
        self.rects = [dict(box(o), fill=bool(o.get("fill")), fill_color=color(o.get("non_stroking_color"))) for o in pdf_page.rects if keep(o)]
        self.lines = [box(o) for o in pdf_page.lines if keep(o)]
        self.curves = [box(o) for o in pdf_page.curves if keep(o)]


def box(o):
    return {"x0": float(o["x0"]), "x1": float(o["x1"]), "top": float(o["top"]), "bottom": float(o["bottom"])}


def load_pages(path, layout, decode=None):
    # Yalniz PDF okurken; --self-test pdfplumber'siz calisir. -I altinda kullanici paketleri kapalidir (pdfplumber orada).
    try:
        import pdfplumber
    except ImportError:
        import site

        sys.path.append(site.getusersitepackages())
        import pdfplumber

    with pdfplumber.open(path) as pdf:
        return [Page(p, i, layout, decode) for i, p in enumerate(pdf.pages)]


# ---------------------------------------------------------------- satir kurma (duzenden bagimsiz)


def is_base(c, base_min):
    return not is_space(c["raw"]) and c["size"] >= base_min and not c["eq"] and not c["unmapped"]


def build_rows(page, layout):
    # Metin puntosundaki karakterler satir kurar; geri kalanlar (kucuk punto, denklem puntosu, buyuk parantez)
    # dikeyde en yakin satira eklenir. Kucuk puntolu karakter ust ya da alt simge olarak isaretlenir.
    base_min = layout.BASE_MIN
    base = [c for c in page.chars if is_base(c, base_min)]
    rest = [c for c in page.chars if not is_base(c, base_min) and not is_space(c["raw"])]
    minor = []
    if layout.SCRIPT_BY_OFFSET and base:
        # Iki gecis: satirlari sayfanin baskin puntosuna yakin (>= %90) glifler kurar; daha kucuk metin puntosu (9.75 pt
        # Times simge, 10 pt tablo) bir satirin bandindaysa o satira katilir (taban cizgisi 1 pt'den fazla kaymissa ust/alt
        # simge), degilse kendi satirlarini kurar. Boylece satirdan once siralanan ust simge satiri baslatmaz.
        dom = Counter(c["size"] for c in base).most_common(1)[0][0]
        minor = [c for c in base if c["size"] < 0.9 * dom]
        base = [c for c in base if c["size"] >= 0.9 * dom]

    def group(chars):
        out = []
        for c in sorted(chars, key=lambda c: (round(mid_y(c), 1), c["x0"])):
            if out and abs(out[-1]["mid"] - mid_y(c)) <= layout.ROW_TOL:
                out[-1]["chars"].append(c)
            else:
                out.append({"mid": mid_y(c), "chars": [c]})
        return out

    rows = group(base)
    shifted, loose = [], []
    for c in minor:
        inside = [r for r in rows if min(x["top"] for x in r["chars"]) - 1.0 <= mid_y(c) <= max(x["bottom"] for x in r["chars"]) + 1.0]
        if not inside:
            loose.append(c)
            continue
        r = min(inside, key=lambda r: abs(r["mid"] - mid_y(c)))
        bottoms = sorted(x["bottom"] for x in r["chars"])
        base_line = bottoms[len(bottoms) // 2]
        if abs(c["bottom"] - base_line) > 1.0:
            shifted.append((r, c, "sub" if c["bottom"] > base_line else "sup"))
        else:
            r["chars"].append(c)
    rows += group(loose)
    for r in rows:
        r["base"] = list(r["chars"])
        r["band"] = (min(c["top"] for c in r["base"]), max(c["bottom"] for c in r["base"]))
    for r, c, script in shifted:
        r["chars"].append(dict(c, attached=abs(r["mid"] - mid_y(c)), script=script))
    for c in rest:
        if not rows:
            continue
        best = min(rows, key=lambda r: abs(r["mid"] - mid_y(c)))
        cc = dict(c, attached=abs(best["mid"] - mid_y(c)))
        if c["size"] < base_min:
            if layout.SCRIPT_BY_OFFSET:
                # Word alt simgesi tabana cok yakin durur (alt kenari satirla ayni): yon orta noktadan.
                cc["script"] = "sub" if mid_y(c) > (best["band"][0] + best["band"][1]) / 2 else "sup"
            else:
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


SCRIPT_CHARS = frozenset(SUP.values()) | frozenset(SUB.values())


def starts_with_script(text):
    # Metin ya da satirlarindan biri (bastaki bosluk ve <i>/<u> isaretleri atlanarak) ust/alt simgeyle basliyor mu.
    for part in text.split("\n"):
        line = re.sub(r"^(?:\s|</?[iu]>)+", "", part)
        if line and line[0] in SCRIPT_CHARS:
            return True
    return False


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
    TEXT_SIZES = TEXT_SIZES
    BASE_MIN = BASE_MIN
    ROW_TOL = 2.5
    SCRIPT_BY_OFFSET = False
    CHAR_MAP = {}
    IGNORE_INVISIBLE = False
    PICTURE_MIN = PICTURE_MIN
    PICTURE_LONG_MIN = PICTURE_MIN
    END_MARKER = True  # "FINE DELLE DOMANDE"
    BLOCK_CHOICES = False  # sik satirlari sirayla: harften sonraki satirlar bir sonraki harfe kadar
    TABLE_GAP = None  # cizgisiz tablo isareti yok
    PAGE_BOTTOM = None  # sayfanin son sorusunun bandi son satirin 40 pt altina kadar
    CHOICE_PREFIX = 2  # "A)"
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

    def __init__(self, year=None):
        self.year = year

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

    def number_prefix(self, n):
        return len(f"{n}.")

    def is_label_row(self, row):
        return False

    def figure_grid(self, rows):
        return None


# ---------------------------------------------------------------- Cambridge duzeni (2011-2022 gecmis kagitlari)

# 2021 kagidinin ASCII disi glifleri (glif numarasi -> metin). Arial/Times glif sirasi; her giris 2026-10-09'da sayfa
# goruntusuyle dogrulandi (sayfa: ornek yeri). Tabloda olmayan glif eslenmez (goruntuden yazim).
DECODE_EXTRA = {
    124: "\u00f6",  # o umlaut (s. 9, ozel ad)
    131: "\u00b0",  # derece (s. 27, 30, 36)
    133: "\u00a3",  # sterlin (s. 5, siklar)
    139: "\u00a9",  # telif isareti (her sayfa alti)
    177: "\u2013",  # kisa tire; ust simgede eksi (s. 4, 7, 28, 32)
    181: "\u2018",  # acilan tek tirnak (s. 2)
    182: "\u2019",  # kapanan tek tirnak / kesme (s. 2)
    238: "\u00d7",  # carpi, Times (s. 40)
    314: "\u2192",  # sag ok, tepkime (s. 28)
    3031: " ",  # ince bosluk, 5.25 pt (s. 27: sayi ile birim arasi)
    3032: "",  # sifir genislikli bosluk (s. 26, 28)
    19659: "\u21cc",  # denge oku, MS-UIGothic (s. 16; 2018 kagidinda ayni glif U+21CC)
}


def prefix_gap(row, n_chars):
    # Satirin ilk n karakteri (numara/sik harfi) ile ardindaki ilk harf birimi arasindaki bosluk (pt); devam yoksa None.
    units = row["units"]
    i, seen, x1 = 0, 0, None
    while i < len(units) and seen < n_chars:
        if units[i]["t"] != " ":
            seen += len(units[i]["t"])
            x1 = units[i]["x1"]
        i += 1
    while i < len(units) and units[i]["t"] == " ":
        i += 1
    if i >= len(units) or x1 is None:
        return None
    return units[i]["x0"] - x1


def first_glyph(row):
    return min(row["chars"], key=lambda c: (c["x0"], c["top"]))


def is_bold(c):
    return "bold" in c["font"].lower()


class CambridgeLayout:
    # Kural (pdftotext -layout bicimiyle: soru "^\s{0,6}(\d{1,2})\s{2,}\S", sik "^\s+([A-E])\s{3,}\S"), pdfplumber satirina
    # uygulanir: soru satiri sol sutunda numara (x0 <= 62; 2011 duz, 2012+ kalin sart), sekme boslugu (>= 6 pt), metin; sik
    # satiri girintili kalin harf A-E (x0 70-106), sekme boslugu, metin. Yalniz tek kalin harften olusan satir yalin
    # etikettir: icerigi goruntu olan sik (formul/sekil; alt satir yoksa metin U+FFFD). Sirali 5 sik bulunamazsa sekil
    # izgarasi aranir: soru satirlarinda tek kalin harf etiketleri (satir ve sira fark etmez; "B" "A"dan yukarida, "C D" ayni
    # satirda, grafik eksen yazisiyla karisik) A-E'yi birer kez veriyorsa tum siklar U+FFFD, ilk etiket satirindan sonrasi
    # sekle aittir. U+FFFD sik yalniz soru bandinda goruntu isareti varsa kabul edilir.
    # Bolum basligi ortali (x0 >= 120) tek satir, harfleri SECTIONS'ta. Sayfa alti ("IMAT 2011 (c) UCLES 2011 3",
    # "(c) UCLES 2012 Page 4 / 40") ve "BLANK PAGE" atilir. Bitis isareti yok: son soru basladiktan sonraki sayfalar okunmaz.
    # Puntolar: metin 11.25 (2011: 10.98), tablo 9.75-10.14, kapak 12-18, ust/alt simge 9 pt ve alti; listede olmayan punto
    # (2011 Times/Symbol 8.74-14.55) denklem nesnesi.
    name = "cambridge"
    TEXT_SIZES = (4.98, 5.25, 6.0, 6.75, 7.02, 7.5, 9.0, 9.75, 10.0, 10.02, 10.14, 10.98, 11.25, 12.0, 18.0)
    BASE_MIN = 9.5  # 9 pt ust/alt simge (CO2, 20th) satir kurmaz
    # Soru numarasi metinden 3 pt, kalin sik harfi 3.75 pt yukarida olabilir (2012 Q80, 2013 Q52: 3.5 iken harf ayri satir
    # kurar, 9 pt us orta noktaya en yakin harf satirina gider ve sikkin basina gecerdi); satir araligi 12.7 pt.
    ROW_TOL = 4.0
    SCRIPT_BY_OFFSET = True  # satiri baskin punto kurar; 9.75 pt Times ust/alt simge 11.25 pt satirda (2019, 2021 denklemleri)
    # Word ciktisi: tire glifi yumusak tire (U+00AD) olarak, noktali virgul Yunanca soru isareti olarak gelir; ince bosluklar.
    CHAR_MAP = {"\u00ad": "-", "\u037e": ";", "\u202f": " ", "\u200a": " ", "\u200b": ""}
    IGNORE_INVISIBLE = True  # her sorunun beyaz cercevesi ve kose noktalari
    PICTURE_MIN = 5.0  # satir ici formul goruntusu (or. 37x9 pt) de resimdir; 2 pt'lik ince seritler degil
    PICTURE_LONG_MIN = 8.0
    END_MARKER = False
    BLOCK_CHOICES = True  # sik satirlari bloklarla (2011 ortali harf)
    TABLE_GAP = 12.0  # en az iki satirda >= 12 pt sutun boslugu: cizgisiz tablo -> goruntuden yazim (2011 cizgisi ince tablolar)
    PAGE_BOTTOM = 780.0  # sayfanin son sorusunun bandi sayfa altina (alt bilgi ~796) kadar
    CHOICE_PREFIX = 1  # "A"
    NUMBER_X_MAX = 62.0  # numara x0: 44.8 (2014-2022), 46.2 (2012-2013), 55.0 (2011)
    CHOICE_X = (70.0, 106.0)  # sik harfi x0: 74.0, 76.3, 78.1, 89.0; sekil izgarasi etiketi 99.5-104.0
    GAP_MIN = 6.0  # sekme boslugu; kelime boslugu ~3 pt
    # Bu yildan itibaren soru numarasi kalin olmalidir (2011 kagidi duz; 2012-2022 hepsi kalin, 2026-10-09 olculdu).
    # Duz numarali sol sutun satiri (liste, tablo) soru baslatmaz. Yil verilmezse kural uygulanir.
    NUMBER_BOLD_FROM = 2012
    SECTIONS = {
        "generalknowledgeandlogicalreasoning": "gk-lr",
        "logicalreasoningandgeneralknowledge": "gk-lr",
        "thinkingskills": "gk-lr",
        "thinkingskillsgeneralknowledgeandlogicalreasoning": "gk-lr",
        "biology": "biology",
        "chemistry": "chemistry",
        "physicsandmathematics": "physics-math",
    }

    def __init__(self, year=None):
        self.year = year
        self.bold_number = year is None or year >= self.NUMBER_BOLD_FROM

    @staticmethod
    def _key(text):
        return re.sub(r"[^a-z]", "", text.lower())

    def classify(self, row):
        text = row["text"]
        key = self._key(text)
        if "\u00a9" in text and row["top"] > 760:
            return "noise", "footer"
        if key == "blankpage":
            return "noise", "blank-page"
        if row["x0"] >= 120 and key in self.SECTIONS:
            return "section", self.SECTIONS[key]
        return "content", None

    def question_start(self, row, expected):
        m = re.match(r"(\d{1,2})(?= |$)", row["text"])
        if not m or int(m.group(1)) != expected or row["x0"] > self.NUMBER_X_MAX:
            return False
        if self.bold_number and not is_bold(first_glyph(row)):
            return False
        gap = prefix_gap(row, len(m.group(1)))
        return gap is None or gap >= self.GAP_MIN

    def is_label_row(self, row):
        # Yalin etiket satiri: sik sutununda tek kalin harf A-E, baska bir sey yok.
        return (len(row["text"]) == 1 and row["text"] in "ABCDE" and all(is_bold(c) for c in row["chars"])
                and self.CHOICE_X[0] <= row["x0"] <= self.CHOICE_X[1])

    @staticmethod
    def bold_labels(row):
        # Satirdaki tek glifli kalin A-E parcalari (parca = 1.5 pt'den yakin glifler); sekil izgarasi etiketleri.
        glyphs = sorted(row["chars"], key=lambda c: c["x0"])
        tokens, cur = [], []
        for c in glyphs:
            if cur and c["x0"] - cur[-1]["x1"] > 1.5:
                tokens.append(cur)
                cur = []
            cur.append(c)
        if cur:
            tokens.append(cur)
        return [t[0]["t"] for t in tokens if len(t) == 1 and t[0]["t"] in "ABCDE" and is_bold(t[0])]

    def figure_grid(self, rows):
        # Sekil izgarasi: soru satirindan sonraki satirlarda kalin tek harf etiketleri A-E'yi birer kez veriyorsa ilk etiket
        # satirinin sirasi, degilse None.
        seen, first = [], None
        for i, row in enumerate(rows[1:], 1):
            found = self.bold_labels(row)
            if found and first is None:
                first = i
            seen.extend(found)
        if first is None or sorted(seen) != list("ABCDE"):
            return None
        return first

    def choice_start(self, row, letter):
        if self.is_label_row(row):
            return row["text"] == letter
        text = row["text"]
        if not (text.startswith(letter + " ") and self.CHOICE_X[0] <= row["x0"] <= self.CHOICE_X[1]):
            return 0
        if not is_bold(first_glyph(row)):
            return 0
        gap = prefix_gap(row, 1)
        return 1 if gap is not None and gap >= self.GAP_MIN else 0

    def is_citation(self, row):
        return False

    def number_prefix(self, n):
        return len(str(n))


class MurLegacyLayout(CambridgeLayout):
    # MUR CompitoInglese 2011-2020 kagitlari (Bakanligin "hep A" kopyalari; plan Gorev 15b, compare-mur-order.mjs). Dizgi
    # Cambridge kagitlariyla aynidir; kurallar CambridgeLayout'tan degismeden gelir. 2026-10-09 olcumu (pdfplumber satirlari,
    # on yil; sayfa goruntusu 2011 s.1/3, 2012 s.35, 2013 s.25, 2014 s.1/3, 2018 s.1/3):
    #   soru numarasi x0 55.0 (2011-2013; Cambridge 2012-2013 46.2), 44.8-44.9 (2014-2020); 2011 duz Arial, 2012-2020 kalin
    #   sik harfi kalin, x0 76.3/78.1 (2011-2013), 89.0-89.1 (2014-2020); sekil izgarasi etiketi 83.4 (2011), 99.5-101.0
    #   metin puntosu 10.98 (2011-2013; 2012'de 10.99-11.02 de), 11.25 (2014-2020); tablo 10.0-10.14, ust/alt simge 7.02-9.0
    #   sayfa 1: Bakanlik basligi (2011 metin, Times bold 13.98; 2012-2020 goruntu) ve kapak satirlari ilk sorudan once
    #   sayfa alti "IMAT 2011 (c) MIUR 2011 3", "(c) UCLES 2012 Page 25 / 29", "KEYIMAT14 (c) UCLES 2014 Page 1 / 40" (Cambridge kurali)
    # Fark icerikte: siklar "hep A" sirasinda, 2012-2020'de soru sirasi da Cambridge kagidindan farkli (eslesme kok metniyle).
    name = "mur-legacy"


LAYOUTS = {"mur": MurLayout, "cambridge": CambridgeLayout, "mur-legacy": MurLegacyLayout}


# ---------------------------------------------------------------- soru bolme


def split_questions(pages, layout, total=None):
    # Satirlar sayfa sayfa yururken: soru baslangici, sik baslangiclari, bolum basliklari. Bitis isareti olmayan duzende
    # (cambridge) son soru (total) basladiktan sonraki sayfa okunmaz (bos sayfa, arka kapak).
    questions = []
    section = None
    current = None
    expected = 1
    ended = False
    for page in pages:
        for row in build_rows(page, layout):
            if ended:
                break
            if not layout.END_MARKER and total and current and current["number"] == total and row["page"] > current["rows"][0]["page"]:
                ended = True
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
            if k < 5:
                count = int(layout.choice_start(row, letters[k]))
                current["choice_starts"].extend([len(current["rows"])] * min(count, 5 - k))
            current["rows"].append(row)
    if layout.END_MARKER and not ended:
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


def is_picture(im, layout):
    w, h = im["x1"] - im["x0"], im["bottom"] - im["top"]
    return min(w, h) >= layout.PICTURE_MIN and max(w, h) >= layout.PICTURE_LONG_MIN


def has_column_gap(row, min_gap):
    # Satir icinde ardisik iki glif arasinda >= min_gap pt bosluk (tablo sutunu). Bastaki kisa isaretten (<= 3 karakter:
    # soru numarasi, sik harfi, liste numarasi) sonraki sekme sayilmaz.
    glyphs = [u for u in row["units"] if u["t"] != " "]
    lead = len(row["text"].split(" ")[0])
    seen = 0
    for a, b in zip(glyphs, glyphs[1:]):
        seen += len(a["t"])
        gap = b["x0"] - a["x1"]
        if seen == lead and lead <= 3:
            continue
        if gap >= min_gap:
            return True
    return False


def image_signals(page, band, rows, layout):
    # band: [x0, top, x1, bottom] soru alani. Doner: ({neden: [kutu]}).
    x0, top, x1, bottom = band
    found = {}
    pictures = [im for im in page.images if overlaps(im, x0, top, x1, bottom) and is_picture(im, layout)]
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
    eq_chars = [c for r in rows for c in r["chars"] if c.get("eq")]
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
    if layout.TABLE_GAP is not None:
        # Cizgisiz tablo: en az iki satirda sutun boslugu; satir satir okuma sutunlari karistirir (cambridge).
        tabular = [r for r in rows if has_column_gap(r, layout.TABLE_GAP)]
        if len(tabular) >= 2:
            found["table"] = [union([[r["x0"], r["ink_top"], r["x1"], r["ink_bottom"]] for r in tabular])]
    return found


def row_mid(row):
    return (row["top"] + row["bottom"]) / 2


def block_choices(rows, starts, layout):
    # Sik satirlarini bloklara gore dagitir (cambridge). Blok = ust kenarlari arasi 1.4 satir puntosundan az olan ardisik
    # satirlar; siklar bos satirla ayrilir. 2011'de cok satirli sikkin harfi satirlarin ortasinda ayri satirdir: sikkin ilk
    # satiri harften once gelir ama ayni bloktadir. Her harf kendi blogunu alir; harfsiz blok onceki sikka eklenir (sekil
    # arasindaki devam); bir blokta birden cok harf varsa blok harflerde bolunur (harften onceki satir onceki sikka).
    # A'nin blogunda A'dan onceki satirlar ancak sik metni sutunundaysa (harfin sagi + sekme) A'ya aittir; govde sutunundaki
    # satir govdede kalir. Doner: (govde sonu sirasi, [sik basina satir siralari]).
    blocks, cur = [], [1] if len(rows) > 1 else []
    for i in range(2, len(rows)):
        if rows[i]["page"] != rows[i - 1]["page"] or rows[i]["top"] - rows[i - 1]["top"] > 1.4 * max(rows[i]["size"], rows[i - 1]["size"]):
            blocks.append(cur)
            cur = []
        cur.append(i)
    if cur:
        blocks.append(cur)
    label = rows[starts[0]]
    text_x = label["x0"] + 8.0 + layout.GAP_MIN  # harf genisligi ~8 pt
    stem_end = starts[0]
    block_a = next(b for b in blocks if starts[0] in b)
    for i in reversed([i for i in block_a if i < starts[0]]):
        if rows[i]["x0"] < text_x or abs(row_mid(rows[i]) - row_mid(label)) > 1.4 * label["size"]:
            break
        stem_end = i
    groups = [[] for _ in starts]
    owner = None
    for b in blocks:
        members = [i for i in b if i >= stem_end]
        if not members:
            continue
        inside = [starts.index(i) for i in members if i in starts]
        if len(inside) == 1:
            owner = inside[0]
            groups[owner].extend(members)
            continue
        for i in members:  # harfsiz blok onceki sikka; cok harfli blok harflerde bolunur
            if i in starts:
                owner = starts.index(i)
            groups[0 if owner is None else owner].append(i)
    return stem_end, groups


def parse_paper(path, year, layout, total=None, decode=None):
    return parse_pages(load_pages(path, layout, decode), year, layout, total)


def parse_pages(pages, year, layout, total=None):
    stats = Counter()
    questions = split_questions(pages, layout, total)
    content_rows = [r for q in questions for r in q["rows"]]
    right_edge = max(r["x1"] for r in content_rows)
    records, problems, reasons, placeholders = [], [], {}, {}
    for idx, q in enumerate(questions):
        n = q["number"]
        try:
            rows = q["rows"]
            if len({r["page"] for r in rows}) != 1:
                raise ValueError(f"soru iki sayfaya yayiliyor ({sorted({r['page'] + 1 for r in rows})})")
            starts = q["choice_starts"]
            grid_at = None
            if len(starts) != 5:
                grid_at = layout.figure_grid(rows)
                if grid_at is None:
                    raise ValueError(f"{len(starts)} sik bulundu")
            page = pages[rows[0]["page"]]
            first = strip_prefix(rows[0], layout.number_prefix(n))
            if grid_at is not None:
                stem_end, groups = grid_at, []
            elif layout.BLOCK_CHOICES:
                stem_end, groups = block_choices(rows, starts, layout)
            else:
                stem_end = starts[0]
                groups = [list(range(s, starts[k + 1] if k + 1 < 5 else len(rows))) for k, s in enumerate(starts)]
            stem_rows = ([first] if first else []) + rows[1:stem_end]
            if not stem_rows:
                raise ValueError("soru metni bos")
            prompt = assemble(stem_rows, right_edge, layout, stats, "stem")
            choices = {}
            unfilled = []  # yalin etiketli, metni goruntude olan siklar (U+FFFD)
            if grid_at is not None:
                choices = {letter: "\ufffd" for letter in "ABCDE"}
                unfilled = list("ABCDE")
                stats["grid_rows_in_figure"] += len(rows) - grid_at
            for k, group in enumerate(groups):
                s = starts[k]
                letter = "ABCDE"[k]
                parts = []
                for i in group:
                    if i != s:
                        parts.append(rows[i])
                    elif not layout.is_label_row(rows[s]):
                        crow = strip_prefix(rows[s], layout.CHOICE_PREFIX)
                        if crow is None:
                            raise ValueError(f"sik {letter} bos")
                        parts.append(crow)
                units = list(parts[0]["units"]) if parts else []
                for a, b in zip(parts, parts[1:]):
                    if break_kind(a, b, right_edge, layout) != "soft":
                        stats["choice_hard_like"] += 1
                    units.extend(join_units(units, b["units"]))
                    units.extend(b["units"])
                choices[letter] = render(units) if units else ""
                if not choices[letter]:
                    if not layout.is_label_row(rows[s]):
                        raise ValueError(f"sik {letter} bos")
                    choices[letter] = "\ufffd"  # yalin etiket, icerik goruntude
                    unfilled.append(letter)
            # Soru bandi: ilk satirin ustunden sonraki sorunun/basligin ustune (ayni sayfada) ya da sayfa sonuna.
            band_top = min(r["ink_top"] for r in rows) - 2.0
            nxt = questions[idx + 1]["rows"][0] if idx + 1 < len(questions) else None
            if q["closed_at"] and q["closed_at"][0] == page.index:
                band_bottom = q["closed_at"][1]
            elif nxt is not None and nxt["page"] == page.index:
                band_bottom = nxt["ink_top"] - 1.0
            elif layout.PAGE_BOTTOM is not None:
                band_bottom = layout.PAGE_BOTTOM  # sayfanin son sorusu: sekil son satirin altina iner (izgara siklari)
            else:
                band_bottom = max(r["ink_bottom"] for r in rows) + 40.0
            band = [0.0, band_top, page.width, min(band_bottom, page.height)]
            signals = image_signals(page, band, rows, layout)
            image_boxes = [b for key in ("picture", "drawing", "formula", "table") for b in signals.get(key, [])]
            if unfilled and not image_boxes:
                raise ValueError(f"sik {''.join(unfilled)} bos ve soru bandinda goruntu yok")
            if unfilled:
                placeholders[n] = "".join(unfilled)
                stats["choice_image_only"] += len(unfilled)
            text_box = union([[r["x0"], r["ink_top"], r["x1"], r["ink_bottom"]] for r in rows])
            # Guvenlik agi: soru metni ya da bir sik (ya da bir satiri) simgeyle basliyorsa simge yanlis satira baglanmis olabilir
            # (2012 Q80 / 2013 Q52 turu); dogru cekirdek gosterimi de olabilir. Ikisi de goruntuden yazima gider ("script-start").
            script_start = starts_with_script(prompt) or any(starts_with_script(v) for v in choices.values())
            if script_start:
                image_boxes.append(text_box)
            bbox = union([text_box] + image_boxes)
            has_image = bool(image_boxes)
            why = ([key for key in ("picture", "drawing") if key in signals] + signals.get("formula_reasons", []) + (["table"] if "table" in signals else [])
                   + (["script-start"] if script_start else []))
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
    return {"year": year, "pages": len(pages), "records": records, "problems": problems, "stats": dict(stats), "reasons": reasons,
            "placeholders": placeholders}


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
    # Kagit duzeyindeki bolme hatasi (baslik/bitis bulunamadi) yalniz o yili durdurur; sorun olarak doner.
    path, year, layout_name, total, shift = args
    try:
        return parse_paper(path, year, LAYOUTS[layout_name](year), total, make_decoder(shift) if shift is not None else None)
    except ValueError as err:
        return {"year": year, "pages": None, "records": [], "problems": [{"year": year, "error": str(err)}], "stats": {},
                "reasons": {}, "placeholders": {}}


def validate(result, inv_entry, mock_years, mock_counts):
    problems = list(result["problems"])
    year = result["year"]
    recs = result["records"]
    if result["pages"] is not None and inv_entry.get("pages") is not None and result["pages"] != inv_entry["pages"]:
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
    opts = {"years": None, "layout": "mur", "dump": None, "jobs": 2, "decode_shift": None, "rows": None, "source": None, "out": None,
            "expected": None}
    i = 0
    while i < len(argv):
        name = argv[i]
        if name in ("--years", "--layout", "--dump", "--jobs", "--decode-shift", "--rows", "--source", "--out", "--expected") and i + 1 < len(argv):
            opts[name[2:].replace("-", "_")] = argv[i + 1]
            i += 2
        else:
            sys.exit(f"bilinmeyen secenek: {name}")
    if opts["rows"]:
        opts["years"] = opts["rows"]
    if not opts["years"] and not opts["dump"]:
        sys.exit("--years zorunlu (ornek: --years 2024,2025)")
    opts["years"] = sorted({int(y) for y in opts["years"].split(",")}) if opts["years"] else []
    if opts["rows"] and len(opts["years"]) != 1:
        sys.exit("--rows tek yil alir (ornek: --rows 2021)")
    opts["jobs"] = int(opts["jobs"])
    if opts["decode_shift"] is not None:
        opts["decode_shift"] = int(opts["decode_shift"])
    if opts["layout"] not in LAYOUTS:
        sys.exit(f"bilinmeyen duzen: {opts['layout']} (var olan: {', '.join(LAYOUTS)})")
    if opts["source"] or opts["out"] or opts["expected"]:
        if not (opts["source"] and opts["out"] and opts["expected"]):
            sys.exit("--source, --out ve --expected birlikte verilir")
        if opts["dump"] or opts["rows"] or len(opts["years"]) != 1:
            sys.exit("--source tek --years yili alir; --dump/--rows ile kullanilmaz")
        if not os.path.isfile(opts["source"]):
            sys.exit(f"kaynak yok: {opts['source']}")
        opts["expected"] = int(opts["expected"])
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


def fixture_chars(text, x0, top, size=11.25, font="ArialMT"):
    # Oz sinama fiksturu: pdfplumber karakter sozlukleri (sabit genislik 0.5 punto).
    out, x = [], x0
    for ch in text:
        out.append({"text": ch, "fontname": "FAKEAA+" + font, "size": size, "x0": x, "x1": x + 0.5 * size, "top": top, "bottom": top + size})
        x += 0.5 * size
    return out


class FakePdfPage:
    # Oz sinama fiksturu: pdfplumber sayfasi yerine (karakter, resim, cizim nesneleri; A4).
    def __init__(self, chars, images=(), rects=(), lines=(), curves=()):
        self.chars, self.images, self.rects, self.lines, self.curves = chars, list(images), list(rects), list(lines), list(curves)
        self.width, self.height = 595.0, 842.0


def cambridge_self_test():
    # Cambridge duzeni uctan uca: sahte PDF sayfalari (karakter, resim, cizim nesneleri) -> Page -> satir -> soru kaydi.
    # Fikstur metinleri uydurmadir (hicbir kagittan parca yok): ada, liman, lamba adlari ve "Pick option N." kaliplari.
    checks = 0
    layout = CambridgeLayout(2099)
    chars_at = fixture_chars

    def question(number, text, top, number_top=None):
        return chars_at(str(number), 44.8, top if number_top is None else number_top, font="Arial-BoldMT") + chars_at(text, 89.0, top)

    def choice(letter, text, top):
        return chars_at(letter, 89.0, top, font="Arial-BoldMT") + (chars_at(text, 110.0, top) if text else [])

    def footer(page_no):
        return chars_at(f"IMAT 2099 \u00a9 Example Board 2099 Page {page_no} / 5", 72.0, 805.0, size=10.0, font="Helvetica")

    def heading(text, top=39.6):
        return chars_at(text, 300.0 - 0.25 * 11.25 * len(text), top)

    def five(top, words=("one", "two", "three", "four", "five")):
        return [c for k, w in enumerate(words) for c in choice("ABCDE"[k], w, top + 25.5 * k)]

    def box(x0, top, x1, bottom, **extra):
        return dict({"x0": x0, "x1": x1, "top": top, "bottom": bottom}, **extra)

    white = (1.0, 1.0, 1.0)
    # Sayfa 1: bolum basligi, Q1 (numara 3 pt yukarida; gorunmez beyaz cerceve), Q2 ("A " ile baslayan govde satiri, paragraf,
    # iki satirlik sik).
    p1 = (heading("General Knowledge and Logical Reasoning", 51.6)
          + question(1, "Which harbour lies closest to the invented island of Quellmore?", 80.0, number_top=77.0)
          + choice("A", "Port Avel", 105.0) + choice("B", "Saltmere", 130.5) + choice("C", "Druin Bay", 156.0)
          + choice("D", "Fenwick Cove", 181.5) + choice("E", "Oskar Point", 207.0)
          + question(2, "Every lamplighter in Brindle walks home before dawn.", 250.0)
          + chars_at("A clockmaker in Brindle also walks home before dawn.", 89.0, 262.75)
          + chars_at("What follows?", 89.0, 290.0)
          + choice("A", "Nothing at all", 315.0) + choice("B", "The clockmaker is tired", 340.5)
          + choice("C", "The clockmaker may be a", 366.0) + chars_at("lamplighter.", 110.0, 378.75)
          + choice("D", "Brindle has no clocks", 404.0) + choice("E", "Dawn comes late", 429.5)
          + footer(1))
    frame = [box(45.5, 70.0, 554.8, 70.0, stroke=True, stroking_color=white), box(45.5, 70.0, 45.5, 230.0, stroke=True, stroking_color=white)]
    dots = [box(45.3, 69.8, 45.7, 70.2, fill=True, non_stroking_color=white, stroke=False, stroking_color=0) for _ in range(4)]
    # Sayfa 2: Biology; Q3 resimli soru; Q4 B sikki yalniz harf + sagda resim (formul goruntusu).
    p2 = (heading("Biology")
          + question(3, "Which organelle is drawn in the sketch?", 70.0) + five(175.0)
          + question(4, "Pick the value shown in option B.", 320.0)
          + choice("A", "12", 345.0) + choice("B", "", 370.5) + choice("C", "14", 396.0) + choice("D", "15", 421.5) + choice("E", "16", 447.0)
          + footer(2))
    p2_images = [box(200.0, 90.0, 300.0, 160.0), box(110.0, 366.0, 140.0, 390.0)]
    # Sayfa 3: Physics and Mathematics; Q5-Q8 (Q6 govdesinde sagda "7 seventh shelf" listesi soru baslangici degil).
    p3 = heading("Physics and Mathematics")
    for k, n in enumerate((5, 6, 7, 8)):
        top = 70.0 + 180.0 * k
        p3 += question(n, f"Pick option {n}.", top)
        if n == 6:
            p3 += chars_at("7 seventh shelf", 113.0, top + 15.0)
        p3 += five(top + 40.0)
    p3 += footer(3)
    # Sayfa 4: Q9 sekil izgarasi siklari (B etiketi A'dan 4.5 pt yukarida ayri satir, "C D" ayni satir, "E"; aradaki yazi
    # sekle aittir), Q10 iki haneli numara.
    p4 = (question(9, "Which sketch shows a closed loop?", 40.0)
          + chars_at("B", 300.0, 65.5, font="Arial-BoldMT") + chars_at("A", 89.0, 70.0, font="Arial-BoldMT")
          + chars_at("loop drawn here", 120.0, 120.0) + chars_at("open line here", 330.0, 120.0)
          + chars_at("C", 89.0, 150.0, font="Arial-BoldMT") + chars_at("D", 300.0, 150.0, font="Arial-BoldMT")
          + chars_at("E", 89.0, 230.0, font="Arial-BoldMT")
          + question(10, "Pick option ten.", 420.0) + five(460.0)
          + footer(4))
    p4_curves = [box(120.0 + 6 * k, 80.0, 180.0 + 6 * k, 110.0, stroke=True, stroking_color=(0.0,)) for k in range(5)]
    # Sayfa 5: arka kapak (son sorudan sonra; okunmaz) + bos sayfa isareti.
    p5 = chars_at("BLANK PAGE", 264.6, 236.3, size=10.0, font="Arial-BoldMT") + chars_at("Developed for an invented board.", 49.6, 690.0, size=10.0)
    fake = [FakePdfPage(p1, lines=frame, curves=dots), FakePdfPage(p2, images=p2_images), FakePdfPage(p3), FakePdfPage(p4, curves=p4_curves), FakePdfPage(p5)]
    pages = [Page(fp, i, layout) for i, fp in enumerate(fake)]
    res = parse_pages(pages, 2099, layout, 10)
    assert not res["problems"], f"cambridge: sorun {res['problems']}"
    recs = {r["number"]: r for r in res["records"]}
    assert sorted(recs) == list(range(1, 11)), f"cambridge: numaralar {sorted(recs)}"
    checks += 1
    sections = [recs[n]["section"] for n in range(1, 11)]
    assert sections == ["gk-lr"] * 2 + ["biology"] * 2 + ["physics-math"] * 6, f"cambridge: bolumler {sections}"
    checks += 1
    q1 = recs[1]
    assert q1["prompt"] == "Which harbour lies closest to the invented island of Quellmore?", f"cambridge Q1: {q1['prompt']!r}"
    assert q1["choices"] == {"A": "Port Avel", "B": "Saltmere", "C": "Druin Bay", "D": "Fenwick Cove", "E": "Oskar Point"}, f"cambridge Q1 siklar: {q1['choices']}"
    assert q1["hasImage"] is False and q1["imageBoxes"] == [], "cambridge Q1: gorunmez beyaz cerceve resim sayildi"
    checks += 1
    q2 = recs[2]
    assert q2["prompt"] == "Every lamplighter in Brindle walks home before dawn.\nA clockmaker in Brindle also walks home before dawn.\n\nWhat follows?", f"cambridge Q2: {q2['prompt']!r}"
    assert q2["choices"]["A"] == "Nothing at all" and q2["choices"]["C"] == "The clockmaker may be a lamplighter.", f"cambridge Q2 siklar: {q2['choices']}"
    checks += 1
    assert recs[3]["hasImage"] is True and recs[3]["choices"]["E"] == "five", "cambridge Q3: resim bandinda hasImage yok"
    q4 = recs[4]
    assert q4["choices"] == {"A": "12", "B": "\ufffd", "C": "14", "D": "15", "E": "16"} and q4["hasImage"] is True, f"cambridge Q4: {q4['choices']} {q4['hasImage']}"
    checks += 1
    assert recs[6]["prompt"] == "Pick option 6.\n7 seventh shelf", f"cambridge Q6: {recs[6]['prompt']!r}"
    assert recs[7]["prompt"] == "Pick option 7." and recs[7]["page"] == 3, "cambridge Q7: liste satiri soru baslatti"
    checks += 1
    q9 = recs[9]
    assert q9["choices"] == {k: "\ufffd" for k in "ABCDE"} and q9["hasImage"] is True, f"cambridge Q9: {q9['choices']} {q9['hasImage']}"
    assert q9["prompt"] == "Which sketch shows a closed loop?", f"cambridge Q9: {q9['prompt']!r}"
    checks += 1
    q10 = recs[10]
    assert q10["prompt"] == "Pick option ten." and q10["choices"]["E"] == "five" and q10["page"] == 4, f"cambridge Q10: {q10['prompt']!r}"
    checks += 1
    # Satir siniflari: sayfa alti, bos sayfa, baslik bicimleri (yumusak tire kisa tireye doner).
    def row_of(text, x0, top, size=11.25, font="ArialMT"):
        return build_rows(Page(FakePdfPage(chars_at(text, x0, top, size, font)), 0, layout), layout)[0]
    assert layout.classify(row_of("IMAT 2011 \u00a9 Example Board 2011 7", 222.7, 796.3, size=10.02, font="Arial")) == ("noise", "footer")
    assert layout.classify(row_of("\u00a9 Example Board 2012 Page 4 / 40", 263.0, 802.8, size=10.0, font="Arial")) == ("noise", "footer")
    assert layout.classify(row_of("BLANK PAGE", 264.6, 236.3, size=10.0)) == ("noise", "blank-page")
    assert layout.classify(row_of("Thinking Skills \u00ad General Knowledge and Logical Reasoning", 156.5, 257.9)) == ("section", "gk-lr")
    assert layout.classify(row_of("Thinking Skills", 266.0, 246.6)) == ("section", "gk-lr")
    assert layout.classify(row_of("Chemistry", 274.2, 39.6)) == ("section", "chemistry")
    assert layout.classify(row_of("Chemistry and more", 89.0, 39.6)) == ("content", None)
    # Word ciktisi karakterleri: yumusak tire gorunen tiredir, Yunanca soru isareti noktali virguldur, ince bosluk bosluktur.
    assert row_of("a well\u00adknown pair\u037e x\u202fkg", 89.0, 100.0)["text"] == "a well-known pair; x kg"
    checks += 1
    # Metin puntosuna yakin ama kucuk ve kaymis glif (9.75 pt alt simge, 11.25 pt satirda) simgedir: duz harf olarak satira
    # girmez, eslenemeyen alt simge formul isaretidir; tamami 9.75 pt tablo satiri ise duz metin kalir.
    sub = chars_at("Q", 89.0, 100.0) + [dict(c, size=9.75, top=104.0, bottom=113.75, fontname="FAKEAA+TimesNewRomanPS-ItalicMT") for c in chars_at("k", 94.7, 104.0)] + chars_at(" holds", 100.0, 100.0)
    srow = build_rows(Page(FakePdfPage(sub), 0, layout), layout)[0]
    assert srow["text"] == "Qk holds" and [c["t"] for c in srow["unmapped_script"]] == ["k"], f"cambridge alt simge: {srow['text']!r}"
    # Ust simge satirdan once siralansa da (kucuk punto, ust kenar yukarida) satiri baslatmaz: harf, metin ve simge tek satir.
    lead = (chars_at("A", 89.0, 380.0, font="Arial-BoldMT") + chars_at("XY", 119.0, 383.0)
            + [dict(c, size=9.75, bottom=389.75, fontname="FAKEAA+TimesNewRomanPSMT") for c in chars_at("+", 131.0, 380.0)]
            + chars_at(" + Z", 136.0, 383.0) + chars_at("filler body text line", 89.0, 420.0))
    lrows = build_rows(Page(FakePdfPage(lead), 0, layout), layout)
    assert lrows[0]["text"] == "A XY\u207a + Z" and layout.choice_start(lrows[0], "A"), f"cambridge ust simge: {[r['text'] for r in lrows]}"
    # Word alt simgesi tabana cok yakin (7.5 pt, alt kenari satirin alt kenariyla ayni): orta noktasi bandin ortasinin
    # altindaysa alt simge, ustundeyse ust simge.
    chem = chars_at("XQ", 89.0, 70.11) + chars_at("3", 100.25, 73.83, size=7.5) + chars_at(" and m", 104.0, 70.11) + chars_at("2", 137.75, 70.11, size=7.5)
    crow = build_rows(Page(FakePdfPage(chem), 0, layout), layout)[0]
    assert crow["text"] == "XQ\u2083 and m\u00b2", f"cambridge alt/ust simge yonu: {crow['text']!r}"
    table = row_of("Row 2 Lanterns stacked", 95.0, 300.0, size=9.75)
    assert table["text"] == "Row 2 Lanterns stacked" and not table["unmapped_script"], "cambridge: 9.75 pt tablo satiri simge sayildi"
    checks += 1
    # Iki haneli numara ve satir basi kurallari dogrudan.
    r38 = build_rows(Page(FakePdfPage(question(38, "Pick the lighter lantern.", 40.0)), 0, layout), layout)[0]
    assert layout.question_start(r38, 38) and not layout.question_start(r38, 3), "cambridge: iki haneli numara"
    stem_a = row_of("A narrow bridge crosses it twice.", 89.0, 100.0)
    assert not layout.choice_start(stem_a, "A"), "cambridge: 'A ' ile baslayan govde satiri sik sayildi"
    bold_a = build_rows(Page(FakePdfPage(chars_at("A", 89.0, 100.0, font="Arial-BoldMT") + chars_at(" narrow bridge", 94.6, 100.0)), 0, layout), layout)[0]
    assert not layout.choice_start(bold_a, "A"), "cambridge: sekme boslugu olmayan kalin 'A' sik sayildi"
    plain_a = build_rows(Page(FakePdfPage(chars_at("A", 89.0, 100.0) + chars_at("12 14", 150.0, 100.0)), 0, layout), layout)[0]
    assert not layout.choice_start(plain_a, "A"), "cambridge: kalin olmayan 'A' tablo satiri sik sayildi"
    checks += 1
    # 2011 bicimi: cok satirli sikta harf satirlarin ortasinda (6.3 pt kayik, ayri satir); sikkin ilk satiri harften once gelir.
    # Satirlar dikeyde en yakin harfe gider; A'dan once gelen ve sik metni sutununda duran satir govdeye girmez.
    def letter(l, top):
        return chars_at(l, 76.3, top, font="Arial,Bold")
    def line(text, top):
        return chars_at(text, 125.9, top)
    centred = (heading("Chemistry") + chars_at("1", 55.0, 60.0, font="Arial") + chars_at("Which lamp is brightest?", 76.3, 60.0)
               + line("The brass lamp on the", 91.7) + letter("A", 98.0) + line("northern quay.", 104.3)
               + chars_at("B", 76.3, 129.0, font="Arial,Bold") + line("The tin lamp.", 129.0)
               + line("The glass lamp that", 154.0) + letter("C", 160.3) + line("hangs by the gate.", 166.6)
               + line("The copper lamp", 191.0) + chars_at("D", 76.3, 203.5, font="Arial,Bold") + line("beside the old", 203.5) + line("mill wheel.", 216.0)
               + chars_at("E", 76.3, 241.0, font="Arial,Bold") + line("None of them.", 241.0))
    layout_2011 = CambridgeLayout(2011)
    res = parse_pages([Page(FakePdfPage(centred), 0, layout_2011)], 2011, layout_2011, 1)
    assert not res["problems"], f"cambridge ortali harf: {res['problems']}"
    got = res["records"][0]
    assert got["prompt"] == "Which lamp is brightest?", f"cambridge ortali harf govde: {got['prompt']!r}"
    assert got["choices"] == {"A": "The brass lamp on the northern quay.", "B": "The tin lamp.", "C": "The glass lamp that hangs by the gate.",
                              "D": "The copper lamp beside the old mill wheel.", "E": "None of them."}, f"cambridge ortali harf: {got['choices']}"
    checks += 1
    # Cizgisiz tablo (iki ya da daha cok satirda sutun boslugu >= 12 pt): satir okumasi sutunlari karistirir -> goruntuden
    # yazim (hasImage, neden "table"). Liste isareti ("1", "A") ile metin arasindaki sekme sayilmaz.
    tab = (heading("Biology") + question(1, "Which shelf holds the most jars?", 60.0)
           + chars_at("Shelf", 120.0, 90.0) + chars_at("Jars", 300.0, 90.0)
           + chars_at("North", 120.0, 102.75) + chars_at("14", 300.0, 102.75)
           + chars_at("1", 113.0, 130.0, font="Arial-BoldMT") + chars_at("one note line", 140.0, 130.0)
           + five(160.0))
    res = parse_pages([Page(FakePdfPage(tab), 0, layout)], 2099, layout, 1)
    assert res["records"][0]["hasImage"] is True and "table" in res["reasons"][1], f"cambridge tablo: {res['reasons']}"
    listing = (heading("Biology") + question(1, "Which items are sealed?", 60.0)
               + chars_at("1", 113.0, 90.0, font="Arial-BoldMT") + chars_at("the red jar", 140.0, 90.0)
               + chars_at("2", 113.0, 102.75, font="Arial-BoldMT") + chars_at("the blue jar", 140.0, 102.75) + five(130.0))
    res = parse_pages([Page(FakePdfPage(listing), 0, layout)], 2099, layout, 1)
    assert res["records"][0]["hasImage"] is False, f"cambridge numarali liste tablo sayildi: {res['reasons']}"
    checks += 1
    # Goruntusuz yalin etiket: sik metni yok ve soru bandinda goruntu yok -> soru sorun olarak doner, kayit yazilmaz.
    bare = (heading("Chemistry") + question(1, "Pick the heavier flask.", 70.0) + choice("A", "one", 100.0) + choice("B", "", 125.5)
            + choice("C", "three", 151.0) + choice("D", "four", 176.5) + choice("E", "five", 202.0))
    res = parse_pages([Page(FakePdfPage(bare), 0, layout)], 2099, layout, 1)
    assert res["records"] == [] and [p["number"] for p in res["problems"]] == [1] and "goruntu yok" in res["problems"][0]["error"], f"cambridge: {res['problems']}"
    checks += 1
    # 2021 kod noktasi kaydirmasi: (cid:N) -> chr(N + 29) metin katmanina girmeden; bilinmeyen glif eslenmez.
    decode = make_decoder(29)
    assert decode("(cid:43)") == "H" and decode("(cid:3)") == " " and decode("x") == "x" and decode("(cid:2999)") == "(cid:2999)"
    # ASCII disi tablo (2021 sayfa goruntuleriyle dogrulandi): kisa tire, tirnak, sicaklik derecesi, ince/sifir bosluk.
    assert decode("(cid:177)") == "\u2013" and decode("(cid:182)") == "\u2019" and decode("(cid:131)") == "\u00b0"
    assert decode("(cid:3031)") == " " and decode("(cid:3032)") == ""
    # Simge icindeki kisa tire eksi isaretidir.
    assert map_script("\u20137", "sup") == ("\u207b\u2077", True), map_script("\u20137", "sup")
    cid = lambda s: "".join(f"(cid:{ord(ch) - 29})" for ch in s)
    enc = [dict(c, text=cid(c["text"])) for c in question(5, "Pick the brass lamp.", 40.0)]
    row = build_rows(Page(FakePdfPage(enc), 0, layout, decode=decode), layout)[0]
    assert row["text"] == "5 Pick the brass lamp." and layout.question_start(row, 5), f"cambridge decode: {row['text']!r}"
    raw = build_rows(Page(FakePdfPage(enc), 0, layout), layout)
    assert not any("Pick" in r["text"] for r in raw), "cambridge decode: kaydirmasiz metin okunur cikti"
    checks += 1
    # Kalin numara kurali (2012 ve sonrasi): sol sutunda duz yazili numara + sekme soru baslatmaz (liste/tablo satiri);
    # 2011 kagidinda numaralar duzdur, kural uygulanmaz.
    plain_no = build_rows(Page(FakePdfPage(chars_at("2", 44.8, 100.0) + chars_at("seventh shelf lamps", 89.0, 100.0)), 0, layout), layout)[0]
    assert not CambridgeLayout(2012).question_start(plain_no, 2), "cambridge: 2012+ duz numara soru baslatti"
    assert not CambridgeLayout(2099).question_start(plain_no, 2) and not CambridgeLayout().question_start(plain_no, 2), "cambridge: yilsiz duzen kalin numara istemeli"
    assert CambridgeLayout(2011).question_start(plain_no, 2), "cambridge: 2011 duz numara soru baslatmadi"
    assert CambridgeLayout(2012).question_start(r38, 38), "cambridge: kalin numara soru baslatmadi"
    inline = (heading("Biology") + question(1, "Which shelf holds the brass lamps?", 60.0) + chars_at("2", 44.8, 85.0) + chars_at("seventh shelf lamps", 89.0, 85.0)
              + five(110.0) + question(2, "Pick option two.", 260.0) + five(290.0))
    res = parse_pages([Page(FakePdfPage(inline), 0, layout)], 2099, layout, 2)
    assert not res["problems"] and [r["number"] for r in res["records"]] == [1, 2], f"cambridge kalin numara: {res['problems']}"
    assert res["records"][0]["prompt"] == "Which shelf holds the brass lamps?\n\n2 seventh shelf lamps", f"cambridge kalin numara: {res['records'][0]['prompt']!r}"
    assert res["records"][1]["prompt"] == "Pick option two.", f"cambridge kalin numara Q2: {res['records'][1]['prompt']!r}"
    checks += 1
    # Eksik numara kapisi: 3 numarali soru yok (1, 2, 4). Ayni sayfada 4'un satirlari 2'ye katilir (bolme hatasi yok) ama sayim
    # tutmaz; sonraki sayfada ise 2 iki sayfaya yayilir. Ikisinde de sorun doner ve hicbir dosya yazilmaz (dolgu yok).
    gap = (heading("Chemistry") + question(1, "Pick option one.", 60.0) + five(90.0) + question(2, "Pick option two.", 230.0) + five(260.0)
           + question(4, "Pick option four.", 400.0) + five(430.0))
    same_page = parse_pages([Page(FakePdfPage(gap), 0, layout)], 2099, layout, 4)
    assert not same_page["problems"] and [r["number"] for r in same_page["records"]] == [1, 2], f"eksik numara: {same_page['problems']}"
    head = heading("Chemistry") + question(1, "Pick option one.", 60.0) + five(90.0) + question(2, "Pick option two.", 230.0) + five(260.0)
    next_page = parse_pages([Page(FakePdfPage(head), 0, layout), Page(FakePdfPage(question(4, "Pick option four.", 60.0) + five(90.0)), 1, layout)], 2099, layout, 4)
    with tempfile.TemporaryDirectory() as tmp:
        target = os.path.join(tmp, "nested", "2099.json")
        for res, why in ((same_page, "soru numaralari 1..4 degil"), (next_page, "iki sayfaya yayiliyor")):
            with contextlib.redirect_stdout(io.StringIO()) as printed:
                code, written = emit([res], {2099: {"pages": None, "expectedQuestions": 4}}, [], {}, lambda year: target)
            assert code == 1 and written == [] and not os.path.exists(target), f"eksik numara kapisi: cikti yazildi ({why})"
            assert why in printed.getvalue() and "cikti yazilmadi" in printed.getvalue(), f"eksik numara kapisi: sorun yazilmadi ({why})"
        ok = parse_pages([Page(FakePdfPage(head), 0, layout)], 2099, layout, 2)
        with contextlib.redirect_stdout(io.StringIO()):
            code, written = emit([ok], {2099: {"pages": 1, "expectedQuestions": 2}}, [], {}, lambda year: target)
        assert code == 0 and written == [target] and os.path.exists(target), f"tam kagit yazilmadi ({code})"
        with open(target, encoding="utf-8") as fh:
            data = json.load(fh)
        assert sorted(data) == ["questions", "source", "year"] and [q["number"] for q in data["questions"]] == [1, 2], "cikti semasi"
    checks += 1
    # Kalin sik harfi metinden 3.75 pt yukarida (A/C/E), 3.0 pt (B/D): harf ve metin tek satir kurar; 9 pt us "10"un sagindaki
    # yerinde kalir. ROW_TOL 3.5 iken harf ayri satir kurar, us orta noktaya en yakin harf satirina gider ve sikkin basina gecer.
    def raised(letter, text, exp, top, lift):
        body = chars_at(text, 95.8, top + lift)
        return chars_at(letter, 74.0, top, font="Arial-BoldMT") + body + chars_at(exp, body[-1]["x1"], top + 0.28, size=9.0)
    split = heading("Chemistry") + question(1, "How many grains of salt fill the invented barrel?", 60.0)
    for k, lift in enumerate((3.75, 3.0, 3.75, 3.0, 3.75)):
        split += raised("ABCDE"[k], f"{k + 2}.5 \u00d7 10", f"2{k}", 100.0 + 25.5 * k, lift)
    res = parse_pages([Page(FakePdfPage(split), 0, layout)], 2099, layout, 1)
    assert not res["problems"], f"cambridge yukari harf: {res['problems']}"
    got = res["records"][0]
    want = {letter: f"{k + 2}.5 \u00d7 10" + map_script(f"2{k}", "sup")[0] for k, letter in enumerate("ABCDE")}
    assert got["choices"] == want, f"cambridge yukari harf: us sikkin basina gecti {got['choices']}"
    assert got["hasImage"] is False and res["reasons"][1] == [], f"cambridge yukari harf: {res['reasons']}"
    checks += 1
    # Guvenlik agi: soru metni ya da bir sik (ya da bir satiri) ust/alt simgeyle basliyorsa goruntuden yazima gider ("script-start"):
    # cekirdek gosterimi (atom numarasi alt simge) dogru olabilir ama satira yanlis baglanmis simge de boyle gorunur.
    lead = (heading("Chemistry") + question(1, "Which pair of invented ions matches?", 60.0)
            + chars_at("A", 89.0, 100.0, font="Arial-BoldMT") + chars_at("7", 119.0, 104.0, size=7.5) + chars_at("Zq and Wv", 123.0, 100.0)
            + [c for k, w in enumerate(("two", "three", "four", "five")) for c in chars_at("BCDE"[k], 89.0, 125.5 + 25.5 * k, font="Arial-BoldMT") + chars_at(w, 119.0, 125.5 + 25.5 * k)])
    res = parse_pages([Page(FakePdfPage(lead), 0, layout)], 2099, layout, 1)
    assert not res["problems"], f"cambridge simge basi: {res['problems']}"
    got = res["records"][0]
    assert got["choices"]["A"] == "\u2087Zq and Wv", f"cambridge simge basi: {got['choices']['A']!r}"
    assert got["hasImage"] is True and "script-start" in res["reasons"][1] and got["imageBoxes"], f"cambridge simge basi: {res['reasons']}"
    assert starts_with_script("plain line\n\u00b2\u00b3 loose row") and starts_with_script("<i>\u2083</i>x") and not starts_with_script("x\u00b2 + 1"), "simge basi kurali"
    checks += 1
    return checks


def mur_legacy_self_test():
    # MUR 2011-2020 kagit duzeni (mur-legacy) uctan uca, uydurma fiksturle: sayfa 1 Bakanlik basligi (Times bold 13.98,
    # denklem puntosu) ve kapak satirlari ilk sorudan once okunmaz, 2011 bicimi (duz numara x0 55, kalin sik harfi x0 78.1)
    # ve 2014+ bicimi (kalin numara x0 44.8, sik harfi x0 89.0), MIUR/KEYIMAT sayfa altlari atilir, 2012+ duz numara soru
    # baslatmaz.
    checks = 0
    chars_at = fixture_chars

    def header():
        return chars_at("Ministero dell'Esempio e della Prova", 150.0, 44.0, size=13.98, font="TimesNewRoman,Bold")

    def centred(text, top, size=10.98):
        return chars_at(text, 300.0 - 0.25 * size * len(text), top, size=size)

    # 2011 bicimi: duz numara (Arial) x0 55.0, metin x0 76.3; kalin sik harfi x0 78.1, sik metni x0 127.5; punto 10.98.
    def q2011(number, text, top):
        return chars_at(str(number), 55.0, top, size=10.98, font="Arial") + chars_at(text, 76.3, top, size=10.98, font="Arial")

    def c2011(top, words):
        return [c for k, w in enumerate(words) for c in chars_at("ABCDE"[k], 78.1, top + 24.0 * k, size=10.98, font="Arial,Bold") + chars_at(w, 127.5, top + 24.0 * k, size=10.98, font="Arial")]

    layout = MurLegacyLayout(2011)
    assert layout.name == "mur-legacy" and LAYOUTS["mur-legacy"] is MurLegacyLayout, "mur-legacy kayitta yok"
    p1 = (header() + centred("ADMISSION TEST FOR AN INVENTED COURSE", 150.0, size=12.0) + centred("Academic Year 2099/2100", 180.0, size=12.0)
          + centred("General Knowledge and Logical Reasoning", 220.0)
          + q2011(1, "Which quay lies nearest to the invented isle of Brannoch?", 250.0) + c2011(280.0, ("North quay", "South quay", "Old quay", "Mill quay", "Salt quay"))
          + q2011(2, "How many lamps hang on the third pier?", 420.0) + c2011(450.0, ("two", "three", "four", "five", "six"))
          + chars_at("IMAT 2099 \u00a9 MIUR 2099 1", 222.7, 796.3, size=10.02, font="Arial"))
    p2 = (centred("Biology", 80.0)
          + q2011(3, "Which jar keeps the seeds driest?", 110.0) + c2011(140.0, ("clay jar", "glass jar", "tin jar", "wood jar", "reed jar"))
          + chars_at("IMAT 2099 \u00a9 MIUR 2099 2", 222.7, 796.3, size=10.02, font="Arial"))
    p3 = centred("Developed for an invented board.", 690.0, size=10.0)
    pages = [Page(FakePdfPage(p), i, layout) for i, p in enumerate((p1, p2, p3))]
    res = parse_pages(pages, 2011, layout, 3)
    assert not res["problems"], f"mur-legacy 2011: sorun {res['problems']}"
    recs = {r["number"]: r for r in res["records"]}
    assert sorted(recs) == [1, 2, 3] and [recs[n]["section"] for n in (1, 2, 3)] == ["gk-lr", "gk-lr", "biology"], f"mur-legacy 2011: {sorted(recs)}"
    assert recs[1]["prompt"] == "Which quay lies nearest to the invented isle of Brannoch?", f"mur-legacy 2011 Q1: {recs[1]['prompt']!r}"
    assert recs[1]["choices"] == {"A": "North quay", "B": "South quay", "C": "Old quay", "D": "Mill quay", "E": "Salt quay"}, f"mur-legacy 2011 Q1: {recs[1]['choices']}"
    assert recs[3]["prompt"] == "Which jar keeps the seeds driest?" and recs[3]["choices"]["E"] == "reed jar" and recs[3]["page"] == 2, f"mur-legacy 2011 Q3: {recs[3]['prompt']!r}"
    checks += 1

    # 2014+ bicimi: kalin numara x0 44.8, metin x0 89.0; kalin sik harfi x0 89.0, sik metni x0 119.0; sayfa alti uc parcali.
    def q2014(number, text, top, bold=True):
        return chars_at(str(number), 44.8, top, font="Arial-BoldMT" if bold else "ArialMT") + chars_at(text, 89.0, top)

    def c2014(top, words):
        return [c for k, w in enumerate(words) for c in chars_at("ABCDE"[k], 89.0, top + 25.5 * k, font="Arial-BoldMT") + chars_at(w, 119.0, top + 25.5 * k)]

    def foot(page):
        return chars_at("KEYIMAT99", 44.8, 800.0, size=10.0) + chars_at("\u00a9 Example 2099", 260.0, 800.0, size=10.0) + chars_at(f"Page {page} / 2", 500.0, 800.0, size=10.0)

    layout = MurLegacyLayout(2099)
    # 2012-2020 kagitlarinda Bakanlik basligi goruntudur (metin katmaninda yok): fiksturde de yok.
    p1 = (centred("ADMISSION TEST FOR AN INVENTED COURSE", 150.0, size=11.25) + centred("General Knowledge and Logical Reasoning", 200.0, size=11.25)
          + q2014(1, "Which lantern burns the longest on the invented coast?", 260.0)
          + q2014(2, "brass lanterns are listed above.", 285.0, bold=False)
          + c2014(320.0, ("the brass one", "the tin one", "the glass one", "the paper one", "the iron one"))
          + q2014(2, "Pick the quieter harbour.", 500.0) + c2014(530.0, ("Avel", "Druin", "Fenwick", "Oskar", "Quill"))
          + foot(1))
    p2 = centred("Chemistry", 60.0, size=11.25) + q2014(3, "Pick the heavier flask.", 100.0) + c2014(130.0, ("one", "two", "three", "four", "five")) + foot(2)
    pages = [Page(FakePdfPage(p), i, layout) for i, p in enumerate((p1, p2))]
    res = parse_pages(pages, 2099, layout, 3)
    assert not res["problems"], f"mur-legacy 2014+: sorun {res['problems']}"
    recs = {r["number"]: r for r in res["records"]}
    assert sorted(recs) == [1, 2, 3], f"mur-legacy 2014+: {sorted(recs)}"
    assert recs[1]["prompt"] == "Which lantern burns the longest on the invented coast?\n\n2 brass lanterns are listed above.", f"mur-legacy 2014+ Q1: {recs[1]['prompt']!r}"
    assert recs[1]["choices"]["A"] == "the brass one" and recs[2]["prompt"] == "Pick the quieter harbour." and recs[2]["choices"]["E"] == "Quill", f"mur-legacy 2014+ Q2: {recs[2]['prompt']!r}"
    assert recs[3]["section"] == "chemistry" and recs[3]["choices"]["C"] == "three", "mur-legacy 2014+ Q3"
    footer_row = build_rows(Page(FakePdfPage(foot(1)), 0, layout), layout)[0]
    assert layout.classify(footer_row) == ("noise", "footer"), "mur-legacy: KEYIMAT sayfa alti atilmadi"
    checks += 1
    return checks


def main(argv):
    if argv == ["--self-test"]:
        checks = self_test() + cambridge_self_test() + mur_legacy_self_test()
        print(f"extract_text oz sinama: {checks} kontrol gecti (italik: kismi dizi, tamamen italik blok, tek harf, kisa matematik, formul, satir basina denge, kaynak satiri; cambridge: soru/sik/baslik/sayfa alti, iki haneli numara, ortali harf, sekil izgarasi, goruntu siki, simge, tablo, 2021 kod kaydirmasi, kalin numara, eksik numara kapisi, yukari sik harfi, simge basi; mur-legacy: kapak, 2011 ve 2014+ bicimi, MIUR/KEYIMAT sayfa alti)")
        return 0
    opts = parse_args(argv)
    if opts["source"]:
        # Envanter disi tek kagit (MUR 2011-2020 kopyasi): kaynak klasoru ve envanter kontrolu yok; kapi ayni.
        year = opts["years"][0]
        mock_years, mock_counts = mock_section_counts()
        res = run_one((os.path.abspath(opts["source"]), year, opts["layout"], opts["expected"], opts["decode_shift"]))
        code, _ = emit([res], {year: {"pages": None, "expectedQuestions": opts["expected"]}}, mock_years, mock_counts,
                       lambda y: os.path.abspath(opts["out"]))
        return code
    inv = check_inventory()
    shifts = year_shifts(inv, opts)
    if opts["rows"]:
        year = opts["years"][0]
        layout = LAYOUTS[opts["layout"]](year)
        decode = make_decoder(shifts[year]) if shifts[year] is not None else None
        rows = [{"page": r["page"] + 1, "top": round(r["top"], 2), "bottom": round(r["bottom"], 2), "x0": round(r["x0"], 2),
                 "x1": round(r["x1"], 2), "text": r["text"]}
                for page in load_pages(os.path.join(SOURCE_DIR, inv[year]["file"]), layout, decode) for r in build_rows(page, layout)]
        print(json.dumps(rows, ensure_ascii=False))
        return 0
    mock_years, mock_counts = mock_section_counts()
    tasks = [(os.path.join(SOURCE_DIR, inv[y]["file"]), y, opts["layout"], inv[y]["expectedQuestions"], shifts[y]) for y in opts["years"]]
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
    code, _ = emit(results, inv, mock_years, mock_counts, lambda year: os.path.join(EXTRACT_DIR, f"{year}.json"))
    return code


def decode_check_accepted(year):
    # vision/<yil>/decode-check.json accepted alani (decode-2021.mjs --check yazar, ana oturum kabul eder); dosya yoksa None.
    path = os.path.join(OUT_ROOT, "vision", str(year), "decode-check.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh).get("accepted")


def year_shifts(inv, opts):
    # Yil -> glif kaydirmasi (None: kaydirma yok), envanterin textLayer alanindan. "decoded" yilin kaydirmasi envanterden gelir
    # (--decode-shift verilirse ayni olmali); cikarma (--rows ve --dump disinda) decode-check kabulu ister. "ok" yila kaydirma
    # uygulanmaz (toplu calistirmada 2021 disina tasmasin); "broken" yil goruntuden yazilir.
    shifts = {}
    for year in opts["years"]:
        if year not in inv:
            sys.exit(f"envanterde yok: {year}")
        layer = inv[year].get("textLayer")
        if layer == "broken":
            sys.exit(f"{year}: metin katmani bozuk; goruntuden yazilir (crop-questions.mjs sayfa kipi)")
        if layer == "decoded":
            shift = inv[year].get("decodeShift")
            if not isinstance(shift, int):
                sys.exit(f"{year}: envanterde decodeShift yok (cozulmus metin katmani; inventory.mjs)")
            if opts["decode_shift"] is not None and opts["decode_shift"] != shift:
                sys.exit(f"{year}: --decode-shift {opts['decode_shift']} envanterdeki kaydirmayla ({shift}) celisiyor")
            if not opts["rows"] and not opts["dump"]:
                accepted = decode_check_accepted(year)
                if accepted is not True:
                    sys.exit(f"{year}: cozulmus metin katmani ama decode-check kabul edilmedi (accepted {accepted}); once decode-2021.mjs --check ve ana oturum kabulu")
            shifts[year] = shift
        elif layer == "ok":
            if opts["decode_shift"] is not None:
                sys.exit("--decode-shift yalniz cozulmus metin katmanli yilda (envanter textLayer \"decoded\") gecerli; kaydirma envanterden okunur")
            shifts[year] = None
        else:
            sys.exit(f"{year}: bilinmeyen textLayer: {layer}")
    return shifts


def emit(results, entries, mock_years, mock_counts, out_path):
    # Kapi + yazim: her yil icin ozet; herhangi bir yilda sorun (eksik/sira disi numara, sayfa sayisi, bolme hatasi) varsa
    # hicbir dosya yazilmaz (dolgu yok). entries[yil] = { pages (None: kontrol yok), expectedQuestions }; out_path(yil) -> yol.
    # Doner: (cikis kodu, yazilan yollar).
    problems = []
    for res in results:
        problems += validate(res, entries[res["year"]], mock_years, mock_counts)
        recs = res["records"]
        sections = Counter(r["section"] for r in recs)
        five = sum(1 for r in recs if len(r["choices"]) == 5 and all(r["choices"].values()))
        flagged = [r["number"] for r in recs if r["hasImage"]]
        print(f"{res['year']}: {len(recs)} soru, 5 dolu sikli {five}, bolumler {dict(sections)}, hasImage {len(flagged)} {flagged}")
        if res["placeholders"]:
            items = ", ".join(f"{n}:{letters}" for n, letters in sorted(res["placeholders"].items()))
            print(f"  goruntu siklari (U+FFFD, goruntuden yazilir) {len(res['placeholders'])} soru: {items}")
        print(f"  istatistik {json.dumps(dict(sorted(res['stats'].items())), ensure_ascii=False)}")
    for p in problems:
        print("  SORUN", json.dumps(p, ensure_ascii=False))
    if problems:
        print("Sorun var; cikti yazilmadi.")
        return 1, []
    written = []
    for res in results:
        out = out_path(res["year"])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        write_json(out, {"year": res["year"], "source": "text", "questions": res["records"]})
        print(f"yazildi: {out}")
        written.append(out)
    return 0, written


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
