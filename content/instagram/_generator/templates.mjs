import { FONTS, BASE } from './style.mjs';

const W = 1080, H = 1350, PAD = 84;

function shell(css, inner, w = W, h = H) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">${FONTS}
<style>${BASE}
body{width:${w}px;height:${h}px}
.page{width:${w}px;height:${h}px;padding:${PAD}px;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;justify-content:space-between;flex:0 0 auto}
.brand{font-size:22px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--sage)}
.cat{font-size:20px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--terra)}
.main{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;min-height:0}
.botbar{flex:0 0 auto}
${css}</style></head><body><div class="page">${inner}</div><script>
function __fit(){var m=document.querySelector('.main')||document.querySelector('.wrap');
if(!m){document.title='FIT:nomain';return;}
var prev=m.style.justifyContent;m.style.justifyContent='flex-start';
var o=m.scrollHeight-m.clientHeight;m.style.justifyContent=prev;
document.title='FIT:'+(o>1?('OVERFLOW+'+o):'ok');}
if(document.readyState==='complete'){__fit()}else{window.addEventListener('load',__fit)}
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(__fit)}
</script></body></html>`;
}

const top = (cat) => `<div class="topbar"><span class="brand">Eduitalya Italypath</span><span class="cat">${cat}</span></div>
<div class="rule-ink" style="margin-top:26px"></div>`;

const bot = (src) => `<div class="botbar">
${src ? `<p class="src" style="margin-bottom:26px">${src}</p>` : ''}
<div class="rule" style="margin-bottom:24px"></div>
<div class="footer"><span>italypath.app</span><b>@eduitalya</b></div></div>`;

// ── A. Dev istatistik ────────────────────────────────────────────
export function stat(p) {
  return shell(`
.num{font-weight:700;font-size:${p.numSize || 330}px;line-height:.82;color:var(--sage);letter-spacing:-.03em}
.numlabel{font-size:34px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--terra);margin-top:30px}
h1{font-size:70px;font-weight:600;line-height:1.14;letter-spacing:-.015em;margin-top:52px;max-width:15ch}
.sub{font-size:31px;line-height:1.52;color:var(--muted);margin-top:30px;max-width:26ch}
`, `${top(p.cat)}<div class="main">
<div class="num serif">${p.num}</div>
<div class="numlabel">${p.numLabel}</div>
<h1 class="serif">${p.head}</h1>
<p class="sub">${p.sub}</p></div>${bot(p.src)}`);
}

// ── B. Sıralı liste ──────────────────────────────────────────────
export function rank(p) {
  const rows = p.rows.map((r, i) => `
<div class="row">
  <span class="rk serif">${String(i + 1).padStart(2, '0')}</span>
  <span class="nm">${r.name}${r.note ? `<em>${r.note}</em>` : ''}</span>
  <span class="vl serif">${r.value}</span>
</div>`).join('<div class="rule"></div>');
  return shell(`
h1{font-size:56px;font-weight:600;line-height:1.12;letter-spacing:-.015em;max-width:17ch}
.kicker{font-size:26px;line-height:1.5;color:var(--muted);margin-top:20px;max-width:32ch}
.list{margin-top:38px}
.row{display:flex;align-items:baseline;gap:28px;padding:18px 0}
.rk{font-size:32px;font-weight:600;color:var(--terra);width:52px;flex:0 0 auto}
.nm{flex:1 1 auto;font-size:34px;font-weight:600;color:var(--ink);line-height:1.2}
.nm em{display:block;font-style:normal;font-size:22px;font-weight:400;color:var(--muted);margin-top:6px}
.vl{flex:0 0 auto;font-size:42px;font-weight:700;color:var(--sage);letter-spacing:-.02em}
`, `${top(p.cat)}<div class="main">
<h1 class="serif">${p.head}</h1>
${p.kicker ? `<p class="kicker">${p.kicker}</p>` : ''}
<div class="list">${rows}</div></div>${bot(p.src)}`);
}

// ── C. Manşet / ifade ────────────────────────────────────────────
export function statement(p) {
  return shell(`
h1{font-size:${p.size || 92}px;font-weight:600;line-height:1.1;letter-spacing:-.022em;max-width:13ch}
h1 mark{background:none;color:var(--terra);font-style:italic;font-weight:600}
.sub{font-size:33px;line-height:1.5;color:var(--muted);margin-top:46px;max-width:24ch}
.tag{display:inline-block;margin-top:56px;border:2px solid var(--sage);color:var(--sage);
 padding:16px 30px;font-size:25px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
`, `${top(p.cat)}<div class="main">
<h1 class="serif">${p.head}</h1>
<p class="sub">${p.sub}</p>
${p.tag ? `<div><span class="tag">${p.tag}</span></div>` : ''}
</div>${bot(p.src)}`);
}

// ── D. Bantlı karşılaştırma ──────────────────────────────────────
export function band(p) {
  const cards = p.cards.map(c => `
<div class="card">
  <span class="ct">${c.title}</span>
  <span class="cv serif">${c.value}</span>
  <span class="cd">${c.detail}</span>
</div>`).join('');
  return shell(`
.hero{background:var(--sage);color:var(--surface);padding:50px 48px;margin-top:30px}
.hero h1{font-size:57px;font-weight:600;line-height:1.14;letter-spacing:-.015em;max-width:16ch}
.hero p{font-size:26px;line-height:1.5;color:var(--sage-soft);margin-top:20px;max-width:32ch}
.cards{display:flex;flex-direction:column;margin-top:30px;border-top:2px solid var(--ink)}
.card{display:flex;align-items:baseline;gap:26px;padding:24px 0;border-bottom:1px solid var(--border)}
.ct{flex:0 0 250px;font-size:25px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--terra)}
.cv{flex:0 0 auto;font-size:44px;font-weight:700;color:var(--sage);letter-spacing:-.02em}
.cd{flex:1 1 auto;text-align:right;font-size:24px;color:var(--muted);line-height:1.45}
`, `${top(p.cat)}<div class="main">
<div class="hero"><h1 class="serif">${p.head}</h1><p>${p.sub}</p></div>
<div class="cards">${cards}</div></div>${bot(p.src)}`);
}

// ── S. Story 1080x1920 ───────────────────────────────────────────
export function story(p) {
  const SH = 1920;
  return shell(`
.page{padding:0}
.safe{position:absolute;inset:0;padding:${p.dark ? 0 : 0}}
.wrap{position:absolute;left:88px;right:88px;top:300px;bottom:340px;display:flex;flex-direction:column}
body{background:${p.dark ? 'var(--sage)' : 'var(--paper)'}}
.brand2{font-size:23px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
 color:${p.dark ? 'var(--sage-soft)' : 'var(--sage)'}}
.hr{height:2px;background:${p.dark ? 'rgba(219,232,225,.45)' : 'var(--ink)'};margin-top:26px}
.mid{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;min-height:0}
h1{font-size:${p.size || 88}px;font-weight:600;line-height:1.12;letter-spacing:-.02em;max-width:13ch;
 color:${p.dark ? 'var(--surface)' : 'var(--ink)'}}
h1 mark{background:none;color:${p.dark ? '#e8a887' : 'var(--terra)'};font-style:italic}
.sub{font-size:34px;line-height:1.5;margin-top:40px;max-width:23ch;
 color:${p.dark ? 'var(--sage-soft)' : 'var(--muted)'}}
.big{font-family:'Spectral',serif;font-size:230px;font-weight:700;line-height:.85;letter-spacing:-.03em;
 color:${p.dark ? 'var(--surface)' : 'var(--sage)'}}
.biglabel{font-size:32px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;margin-top:26px;
 color:${p.dark ? '#e8a887' : 'var(--terra)'}}
.sticker{margin-top:56px;font-size:26px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
 border:2px dashed ${p.dark ? 'rgba(219,232,225,.6)' : 'var(--border)'};padding:22px 28px;
 color:${p.dark ? 'var(--sage-soft)' : 'var(--muted)'};text-align:center}
.foot{position:absolute;left:88px;right:88px;bottom:200px;display:flex;justify-content:space-between;
 align-items:baseline;font-size:26px;letter-spacing:.06em;
 color:${p.dark ? 'var(--sage-soft)' : 'var(--muted)'}}
.foot b{font-size:24px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
 color:${p.dark ? 'var(--surface)' : 'var(--sage)'}}
`, `<div class="wrap">
<div><span class="brand2">Eduitalya Italypath</span><div class="hr"></div></div>
<div class="mid">
${p.big ? `<div class="big">${p.big}</div><div class="biglabel">${p.bigLabel}</div>` : ''}
<h1 class="serif" ${p.big ? 'style="font-size:60px;margin-top:44px"' : ''}>${p.head}</h1>
${p.sub ? `<p class="sub">${p.sub}</p>` : ''}
${p.sticker ? `<div class="sticker">${p.sticker}</div>` : ''}
</div></div>
<div class="foot"><span>italypath.app</span><b>@eduitalya</b></div>`, W, SH);
}
