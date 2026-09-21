export const FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export const BASE = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
 --paper:#f8f7f1; --surface:#fffefa; --ink:#15201c; --muted:#59645f;
 --sage:#1f4f46; --sage-soft:#dbe8e1; --terra:#b75b38; --border:#d8ded9; --band:#f5f1e8;
}
html,body{margin:0;padding:0}
body{background:var(--paper);color:var(--ink);
 font-family:'Hanken Grotesk',sans-serif;-webkit-font-smoothing:antialiased;
 font-feature-settings:"kern" 1;overflow:hidden}
.serif{font-family:'Spectral',serif}
.frame{position:relative;display:flex;flex-direction:column;height:100%;width:100%}
.eyebrow{font-size:22px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--terra)}
.rule{height:1px;background:var(--border);width:100%}
.rule-ink{height:2px;background:var(--ink);width:100%}
.footer{display:flex;align-items:baseline;justify-content:space-between;
 font-size:24px;letter-spacing:.06em;color:var(--muted);font-weight:500}
.footer b{color:var(--sage);font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:22px}
.src{font-size:19px;color:var(--muted);line-height:1.5}
`;
