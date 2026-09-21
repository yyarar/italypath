import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stat, rank, statement, band, story } from './templates.mjs';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..');
const TMP = resolve(HERE, '.tmp-html');
mkdirSync(TMP, { recursive: true });
mkdirSync(`${OUT}/posts`, { recursive: true });
mkdirSync(`${OUT}/stories`, { recursive: true });

const SRC_DB = 'Kaynak: ItalyPath program veritabanı, 8 Eylül 2026. Programların tamamı İngilizce öğretim dilli.';

const POSTS = [
  { id: '01-acilis', fn: statement, size: 86, cat: 'Tanıtım',
    head: 'İtalya’da İngilizce okumak <mark>sandığından</mark> daha mümkün.',
    sub: '64 üniversite, 1.008 İngilizce program, 46 şehir. Hepsi tek yerde, kaynağıyla birlikte.',
    tag: 'italypath.app', src: SRC_DB },

  { id: '02-milano', fn: stat, cat: 'Şehir', num: '207', numLabel: 'İngilizce program',
    head: 'Sadece Milano’da.',
    sub: 'Tek bir şehirde 8 farklı üniversite, 207 İngilizce program sunuyor. Türkiye’den bakınca “İtalya” tek bir seçenek gibi görünüyor — değil.',
    src: SRC_DB },

  { id: '03-sehirler', fn: rank, cat: 'Şehir',
    head: 'En çok İngilizce program sunan 5 şehir',
    kicker: 'Program sayısı, seçenek demek. Ama tek kriter değil — maliyet ve şehir karakteri de önemli.',
    rows: [
      { name: 'Milano', note: '8 üniversite', value: '207' },
      { name: 'Bologna', note: '1 üniversite', value: '98' },
      { name: 'Roma', note: '8 üniversite', value: '81' },
      { name: 'Padova', note: '1 üniversite', value: '75' },
      { name: 'Torino', note: '2 üniversite', value: '64' },
    ], src: SRC_DB },

  { id: '04-lisans-yl', fn: band, cat: 'Seviye',
    head: 'Lisans mı, yüksek lisans mı? Rakamlar net konuşuyor.',
    sub: 'İtalya’da İngilizce yüksek lisans seçeneği, İngilizce lisanstan 3,5 kat fazla. Lisans arıyorsan rekabet daha sıkı — erken başla.',
    cards: [
      { title: 'Lisans', value: '215', detail: '215’in 210’u 3 yıllık' },
      { title: 'Yüksek lisans', value: '764', detail: '764’ün 760’ı 2 yıllık' },
      { title: 'Tek aşamalı', value: '29', detail: 'Tıp, hukuk, mimarlık · 5–6 yıllık' },
    ], src: SRC_DB },

  { id: '05-lisans-okullar', fn: rank, cat: 'Lisans',
    head: 'İngilizce lisansta en çok seçenek sunan okullar',
    kicker: 'Lisans için İtalya’ya bakıyorsan aramaya buradan başla.',
    rows: [
      { name: 'Università Cattolica', note: 'Milano', value: '15' },
      { name: 'Bozen-Bolzano', note: 'Bolzano', value: '15' },
      { name: 'University of Bologna', note: 'Bologna', value: '12' },
      { name: 'Politecnico di Milano', note: 'Milano', value: '11' },
      { name: 'University of Padua', note: 'Padova', value: '11' },
    ], src: SRC_DB },

  { id: '06-maliyet', fn: band, cat: 'Maliyet',
    head: 'İtalya pahalı değil. Şehir pahalı.',
    sub: 'Aynı ülkede, aynı diplomayla, aylık bütçen iki katına çıkabilir. Şehir seçimi bütçenin en büyük kaldıracı.',
    cards: [
      { title: 'Bütçe dostu', value: '250–400€', detail: 'Özel oda · Messina, Camerino, Cassino' },
      { title: 'Dengeli', value: '350–550€', detail: 'Özel oda · Perugia, Ferrara, Lecce' },
      { title: 'Yüksek', value: '500–750€', detail: 'Özel oda · Bolzano, Cenova, Aosta' },
    ],
    src: 'Kaynak: ItalyPath şehir maliyet modeli, sürüm 2026-08. Aralıklar tahmindir; kesin fiyat değildir.' },

  { id: '07-burs', fn: stat, cat: 'Burs', num: '38', numLabel: 'Bölgesel burs kurumu', numSize: 320,
    head: 'DSU bursu tek bir program değil.',
    sub: 'Her bölgenin kendi kurumu, kendi takvimi ve kendi ISEE eşiği var. “İtalya’da burs şartı şu” diyen tek bir cümle yok — bölgene bakman gerekiyor.',
    src: 'Kaynak: ItalyPath bölgesel burs kayıtları. Tutarlar ve eşikler her yıl, her bölgede değişir; resmî çağrıyı kontrol et.' },

  { id: '08-dosya', fn: statement, size: 84, cat: 'Kabul',
    head: 'Her programın <mark>kaynaklı</mark> bir kabul dosyası var.',
    sub: '900 programda son başvuru tarihi, dil şartı, gerekli belgeler ve sınav bilgisi — hepsi resmî sayfa linkiyle. Emin olmadığımız yeri “emin değiliz” diye yazıyoruz.',
    tag: 'Uydurma bilgi yok', src: SRC_DB },
];

const STORIES = [
  { id: 's1-merhaba', dark: true, size: 84,
    head: 'Merhaba. <mark>Eduitalya Italypath</mark> burada.',
    sub: 'İtalya’da okumak isteyen Türk öğrenciler için hazırlanmış, kaynaklı bir planlama rehberi.' },

  { id: 's2-rakam', big: '1.008', bigLabel: 'İngilizce program',
    head: '64 üniversite, 46 şehir. Hepsi tek yerde.' },

  { id: 's3-anket',
    head: 'Sen hangisini arıyorsun?',
    sub: 'Cevabına göre içerik üreteceğiz.',
    sticker: 'Buraya anket çıkartması ekle · Lisans / Yüksek lisans' },

  { id: 's4-soru', dark: true,
    head: 'İtalya’yla ilgili en çok neyi merak ediyorsun?',
    sub: 'Sorunu yaz, cevabını kaynağıyla paylaşalım.',
    sticker: 'Buraya soru kutusu çıkartması ekle' },

  { id: 's5-cta', size: 82,
    head: 'Programını <mark>bugün</mark> aramaya başla.',
    sub: 'Üniversite, program, burs, yaşam maliyeti ve ISEE hesaplayıcı — hepsi ücretsiz.',
    sticker: 'Buraya link çıkartması ekle · italypath.app' },
];

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const problems = [];
function render(html, name, dir, w, h) {
  const f = `${TMP}/${name}.html`;
  writeFileSync(f, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--virtual-time-budget=8000', `--screenshot=${dir}/${name}.png`,
    `--window-size=${w},${h}`, `file://${f}`], { stdio: 'ignore' });
  const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox',
    '--virtual-time-budget=8000', '--dump-dom', `--window-size=${w},${h}`, `file://${f}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const m = dom.match(/<title>FIT:([^<]*)<\/title>/);
  const verdict = m ? m[1] : 'NO-PROBE';
  if (verdict !== 'ok') problems.push(`${name}: ${verdict}`);
  console.log(verdict === 'ok' ? '\u2713' : '\u2717', name, verdict === 'ok' ? '' : verdict);
}

for (const p of POSTS) render(p.fn(p), p.id, `${OUT}/posts`, 1080, 1350);
for (const s of STORIES) render(story(s), s.id, `${OUT}/stories`, 1080, 1920);
if (problems.length) { console.log('\n!! TASMA:'); problems.forEach(x => console.log('   ' + x)); process.exitCode = 1; }
else console.log('\nhepsi sigiyor');
