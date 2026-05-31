/* ============================================================
   MINTYNEX — ORIGINAL CREATURE MASCOTS  (app-creatures.js)

   Three fully original creature characters:
   • Zaplet  — Electric-type: round yellow body, spiky ears, spark tail
   • Embyr   — Fire-type: warm orange, flame crest, bright eyes
   • Wavuu   — Water-type: teardrop body, fin ears, ripple aura

   All SVG, inline-drawn, no external assets, no IP issues.
   Each has idle float + blink + element reaction animations.
   ============================================================ */

/* ─────────────────────────────────────────────
   SVG BUILDER HELPERS
───────────────────────────────────────────── */
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
function svg(w, h) {
  const s = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, xmlns: 'http://www.w3.org/2000/svg' });
  s.style.overflow = 'visible';
  return s;
}

/* ─────────────────────────────────────────────
   ZAPLET  — Electric creature
   Yellow round body, spiky lightning-bolt ears,
   zigzag tail, spark cheeks, black eyes
───────────────────────────────────────────── */
function buildZaplet(size = 80) {
  const s = svg(100, 100);
  const g = svgEl('g');

  // Glow aura
  const aura = svgEl('ellipse', { cx:'50', cy:'58', rx:'36', ry:'10', fill:'rgba(250,204,21,0.18)' });
  aura.style.animation = 'creaturePulse 2s ease-in-out infinite';
  g.appendChild(aura);

  // Tail (zigzag lightning bolt)
  const tail = svgEl('path', {
    d: 'M72 62 L82 55 L76 58 L86 48',
    stroke: '#facc15', 'stroke-width': '4', 'stroke-linecap': 'round',
    fill: 'none', 'stroke-linejoin': 'round'
  });
  tail.classList.add('tail-part');
  g.appendChild(tail);

  // Left ear (lightning spike)
  g.appendChild(svgEl('polygon', {
    points: '30,42 22,16 36,30',
    fill: '#facc15', stroke: '#ca8a04', 'stroke-width': '1.5'
  }));
  // Right ear
  g.appendChild(svgEl('polygon', {
    points: '70,42 78,16 64,30',
    fill: '#facc15', stroke: '#ca8a04', 'stroke-width': '1.5'
  }));

  // Body
  g.appendChild(svgEl('ellipse', {
    cx:'50', cy:'58', rx:'30', ry:'26',
    fill:'#fde047', stroke:'#ca8a04', 'stroke-width':'2'
  }));

  // Cheek sparks
  const cheekL = svgEl('ellipse', { cx:'27', cy:'62', rx:'6', ry:'4', fill:'rgba(250,100,0,0.5)' });
  const cheekR = svgEl('ellipse', { cx:'73', cy:'62', rx:'6', ry:'4', fill:'rgba(250,100,0,0.5)' });
  cheekL.style.animation = 'creatureGlow 1.8s ease-in-out infinite';
  cheekR.style.animation = 'creatureGlow 1.8s ease-in-out infinite reverse';
  g.appendChild(cheekL);
  g.appendChild(cheekR);

  // Eyes (white + pupil)
  g.appendChild(svgEl('ellipse', { cx:'40', cy:'54', rx:'6', ry:'7', fill:'white' }));
  g.appendChild(svgEl('ellipse', { cx:'60', cy:'54', rx:'6', ry:'7', fill:'white' }));
  g.appendChild(svgEl('circle',  { cx:'41', cy:'54', r:'3.5', fill:'#1a1a1a' }));
  g.appendChild(svgEl('circle',  { cx:'61', cy:'54', r:'3.5', fill:'#1a1a1a' }));
  // Eye shine
  g.appendChild(svgEl('circle',  { cx:'42.5', cy:'52', r:'1.2', fill:'white' }));
  g.appendChild(svgEl('circle',  { cx:'62.5', cy:'52', r:'1.2', fill:'white' }));
  // Eyelids (blink)
  const lidL = svgEl('ellipse', { cx:'40', cy:'48', rx:'6', ry:'6', fill:'#fde047' });
  const lidR = svgEl('ellipse', { cx:'60', cy:'48', rx:'6', ry:'6', fill:'#fde047' });
  lidL.classList.add('eye-lid');
  lidR.classList.add('eye-lid');
  g.appendChild(lidL);
  g.appendChild(lidR);

  // Smile
  const smile = svgEl('path', {
    d: 'M41 63 Q50 70 59 63',
    stroke: '#92400e', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round'
  });
  g.appendChild(smile);

  // Spark orbs orbiting
  const sparkGrp = svgEl('g');
  sparkGrp.style.transformOrigin = '50px 58px';
  sparkGrp.style.animation = 'creatureSpin 3s linear infinite';
  ['#facc15','#fbbf24','#fde68a'].forEach((c, i) => {
    const angle = i * 120;
    const rad = angle * Math.PI / 180;
    const x = 50 + Math.cos(rad) * 38;
    const y = 58 + Math.sin(rad) * 20;
    const sp = svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r:'3', fill:c });
    sparkGrp.appendChild(sp);
  });
  g.appendChild(sparkGrp);

  s.appendChild(g);
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  return s;
}

/* ─────────────────────────────────────────────
   EMBYR  — Fire creature
   Warm orange round body, flame crest on head,
   bright white eyes, rosy cheeks
───────────────────────────────────────────── */
function buildEmbyr(size = 80) {
  const s = svg(100, 110);

  // Shadow glow
  const glow = svgEl('ellipse', { cx:'50', cy:'96', rx:'28', ry:'7', fill:'rgba(249,115,22,0.2)' });
  glow.style.animation = 'creaturePulse 2.2s ease-in-out infinite';
  s.appendChild(glow);

  // Flame crest (3 flames behind head)
  const flames = [
    { d:'M38 50 Q32 28 42 18 Q44 32 40 42', fill:'#fbbf24' },
    { d:'M50 46 Q46 22 54 10 Q58 26 54 42', fill:'#f97316' },
    { d:'M62 50 Q68 28 58 18 Q56 32 60 42', fill:'#fbbf24' },
  ];
  flames.forEach(fl => {
    const p = svgEl('path', { d: fl.d, fill: fl.fill });
    p.classList.add('flame-tip');
    s.appendChild(p);
  });
  // Inner flame
  const innerFlame = svgEl('path', { d:'M50 46 Q49 32 53 22 Q56 32 52 44', fill:'#fff7ed' });
  innerFlame.classList.add('flame-inner');
  s.appendChild(innerFlame);

  // Body
  s.appendChild(svgEl('ellipse', {
    cx:'50', cy:'68', rx:'30', ry:'26',
    fill:'#fb923c', stroke:'#c2410c', 'stroke-width':'2'
  }));

  // Belly
  s.appendChild(svgEl('ellipse', { cx:'50', cy:'72', rx:'18', ry:'14', fill:'#fed7aa' }));

  // Cheeks
  const cL = svgEl('ellipse', { cx:'27', cy:'70', rx:'6', ry:'4', fill:'rgba(239,68,68,0.5)' });
  const cR = svgEl('ellipse', { cx:'73', cy:'70', rx:'6', ry:'4', fill:'rgba(239,68,68,0.5)' });
  cL.style.animation = 'creatureGlow 2s ease-in-out infinite';
  cR.style.animation = 'creatureGlow 2s ease-in-out infinite .4s';
  s.appendChild(cL);
  s.appendChild(cR);

  // Eyes
  s.appendChild(svgEl('ellipse', { cx:'40', cy:'63', rx:'6', ry:'7', fill:'white' }));
  s.appendChild(svgEl('ellipse', { cx:'60', cy:'63', rx:'6', ry:'7', fill:'white' }));
  s.appendChild(svgEl('circle', { cx:'41', cy:'63', r:'3.5', fill:'#1a1a1a' }));
  s.appendChild(svgEl('circle', { cx:'61', cy:'63', r:'3.5', fill:'#1a1a1a' }));
  s.appendChild(svgEl('circle', { cx:'42', cy:'61', r:'1.3', fill:'white' }));
  s.appendChild(svgEl('circle', { cx:'62', cy:'61', r:'1.3', fill:'white' }));
  const flidL = svgEl('ellipse', { cx:'40', cy:'57', rx:'6', ry:'6', fill:'#fb923c' });
  const flidR = svgEl('ellipse', { cx:'60', cy:'57', rx:'6', ry:'6', fill:'#fb923c' });
  flidL.classList.add('eye-lid');
  flidR.classList.add('eye-lid');
  s.appendChild(flidL);
  s.appendChild(flidR);

  // Smile
  s.appendChild(svgEl('path', {
    d: 'M41 73 Q50 80 59 73',
    stroke:'#7c2d12', 'stroke-width':'2', fill:'none', 'stroke-linecap':'round'
  }));

  // Tiny paws
  s.appendChild(svgEl('ellipse', { cx:'26', cy:'86', rx:'8', ry:'5', fill:'#fb923c', stroke:'#c2410c', 'stroke-width':'1.5' }));
  s.appendChild(svgEl('ellipse', { cx:'74', cy:'86', rx:'8', ry:'5', fill:'#fb923c', stroke:'#c2410c', 'stroke-width':'1.5' }));

  s.setAttribute('width', size);
  s.setAttribute('height', size * 1.1);
  return s;
}

/* ─────────────────────────────────────────────
   WAVUU  — Water creature
   Teardrop sky-blue body, fin ears, ripple rings,
   sparkly eyes, wave belly marking
───────────────────────────────────────────── */
function buildWavuu(size = 80) {
  const s = svg(100, 110);

  // Water ripple rings
  [38, 30, 22].forEach((r, i) => {
    const ring = svgEl('ellipse', {
      cx:'50', cy:'94', rx: r.toString(), ry: (r * 0.35).toString(),
      fill:'none', stroke:'rgba(56,189,248,0.3)', 'stroke-width':'1.5'
    });
    ring.style.animation = `creaturePulse ${1.6 + i * 0.4}s ease-in-out infinite ${i * 0.3}s`;
    s.appendChild(ring);
  });

  // Fin ears
  s.appendChild(svgEl('path', {
    d:'M28 58 Q18 40 26 32 Q32 44 34 56',
    fill:'#7dd3fc', stroke:'#0ea5e9', 'stroke-width':'1.5'
  }));
  s.appendChild(svgEl('path', {
    d:'M72 58 Q82 40 74 32 Q68 44 66 56',
    fill:'#7dd3fc', stroke:'#0ea5e9', 'stroke-width':'1.5'
  }));

  // Body (teardrop)
  s.appendChild(svgEl('path', {
    d:'M50 25 Q80 40 80 68 Q80 92 50 92 Q20 92 20 68 Q20 40 50 25',
    fill:'#38bdf8', stroke:'#0ea5e9', 'stroke-width':'2'
  }));

  // Belly shimmer
  const belly = svgEl('path', {
    d:'M50 40 Q66 50 66 68 Q66 82 50 84 Q34 82 34 68 Q34 50 50 40',
    fill:'rgba(224,242,254,0.4)'
  });
  belly.classList.add('water-shine');
  s.appendChild(belly);

  // Wave belly marking
  s.appendChild(svgEl('path', {
    d:'M36 72 Q42 66 50 72 Q58 78 64 72',
    stroke:'rgba(14,165,233,0.6)', 'stroke-width':'2.5', fill:'none', 'stroke-linecap':'round'
  }));

  // Eyes
  s.appendChild(svgEl('ellipse', { cx:'40', cy:'58', rx:'7', ry:'8', fill:'white' }));
  s.appendChild(svgEl('ellipse', { cx:'60', cy:'58', rx:'7', ry:'8', fill:'white' }));
  s.appendChild(svgEl('circle', { cx:'41', cy:'58', r:'4', fill:'#0c4a6e' }));
  s.appendChild(svgEl('circle', { cx:'61', cy:'58', r:'4', fill:'#0c4a6e' }));
  // Star sparkles in eyes
  ['43','63'].forEach(cx => {
    s.appendChild(svgEl('circle', { cx, cy:'55', r:'1.5', fill:'white' }));
    s.appendChild(svgEl('circle', { cx: (parseInt(cx)+1).toString(), cy:'57', r:'.8', fill:'rgba(255,255,255,.7)' }));
  });
  // Lids
  const wlidL = svgEl('ellipse', { cx:'40', cy:'51', rx:'7', ry:'7', fill:'#38bdf8' });
  const wlidR = svgEl('ellipse', { cx:'60', cy:'51', rx:'7', ry:'7', fill:'#38bdf8' });
  wlidL.classList.add('eye-lid');
  wlidR.classList.add('eye-lid');
  s.appendChild(wlidL);
  s.appendChild(wlidR);

  // Smile
  s.appendChild(svgEl('path', {
    d:'M41 67 Q50 74 59 67',
    stroke:'#075985', 'stroke-width':'2', fill:'none', 'stroke-linecap':'round'
  }));

  // Water droplet on tip
  s.appendChild(svgEl('path', {
    d:'M50 25 Q54 18 50 12 Q46 18 50 25',
    fill:'#bae6fd', stroke:'#7dd3fc', 'stroke-width':'1'
  }));

  s.setAttribute('width', size);
  s.setAttribute('height', size * 1.1);
  return s;
}

/* ─────────────────────────────────────────────
   BACKGROUND FLOATING CREATURES
   Populates #creature-bg with drifting mascots
───────────────────────────────────────────── */
const BG_CREATURE_CONFIG = [
  { builder: buildZaplet, positions: [{l:3,t:8},{l:55,t:5},{l:85,t:65},{l:30,t:75},{l:70,t:82}], anim:'creatureFloat', size:60 },
  { builder: buildEmbyr,  positions: [{l:18,t:35},{l:78,t:15},{l:42,t:60},{l:88,t:40}], anim:'creatureFloatB', size:58 },
  { builder: buildWavuu,  positions: [{l:8,t:60},{l:62,t:25},{l:48,t:88},{l:92,t:80}], anim:'creatureFloatC', size:56 },
];

function createBgCreatures() {
  const container = document.getElementById('creature-bg');
  if (!container) return;
  container.innerHTML = '';

  const isMobile = window.innerWidth < 768;
  const limit = isMobile ? 4 : 7;

  let count = 0;
  for (const cfg of BG_CREATURE_CONFIG) {
    for (let i = 0; i < cfg.positions.length && count < limit; i++, count++) {
      const pos = cfg.positions[i];
      const el = document.createElement('div');
      el.className = 'bg-creature';
      const dur  = (5 + (count * 1.3) % 5).toFixed(1);
      const del  = -((count * 1.7) % 6).toFixed(1);
      const size = isMobile ? cfg.size * 0.7 : cfg.size;

      el.style.cssText = `
        left:${pos.l}%;
        top:${pos.t}%;
        width:${size}px;
        height:${size}px;
        animation:${cfg.anim} ${dur}s ease-in-out infinite ${del}s;
        opacity: ${isMobile ? 0.13 : 0.09};
      `;
      el.appendChild(cfg.builder(size));
      container.appendChild(el);
    }
  }
}

/* ─────────────────────────────────────────────
   LOGIN SCREEN CREATURES
───────────────────────────────────────────── */
function createLoginCreatures() {
  const container = document.querySelector('.login-cards');
  if (!container) return;
  container.innerHTML = '';

  const configs = [
    { builder: buildZaplet, l:'-20px', t:'20%',  size:90, rot:-12 },
    { builder: buildEmbyr,  l:'auto',  r:'-15px', t:'15%', size:85, rot:10 },
    { builder: buildWavuu,  l:'5%',    b:'-10px', size:80, rot:8 },
    { builder: buildZaplet, l:'auto',  r:'8%',    b:'-5px',size:75, rot:-6 },
  ];

  configs.forEach((cfg, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'login-creature';
    const extra = cfg.r ? `right:${cfg.r};` : '';
    const bExtra = cfg.b ? `bottom:${cfg.b};top:auto;` : '';
    wrap.style.cssText = `
      left:${cfg.l}; top:${cfg.t || 'auto'};
      ${extra} ${bExtra}
      width:${cfg.size}px; height:${cfg.size}px;
      transform:rotate(${cfg.rot}deg);
      animation-delay: -${i * 1.5}s;
    `;
    wrap.appendChild(cfg.builder(cfg.size));
    container.appendChild(wrap);
  });
}

/* ─────────────────────────────────────────────
   FEATURED MASCOT in hero area
   Returns a mascot element for embedding inline
───────────────────────────────────────────── */
function buildHeroMascot(type = 'zaplet', size = 80) {
  const builders = { zaplet: buildZaplet, embyr: buildEmbyr, wavuu: buildWavuu };
  const builder = builders[type] || buildZaplet;
  const wrap = document.createElement('div');
  wrap.className = `creature-mascot`;
  wrap.style.cssText = `display:inline-block; width:${size}px; height:${size}px;`;
  wrap.appendChild(builder(size));
  return wrap;
}

/* ─────────────────────────────────────────────
   CREATURE REACTION ANIMATIONS
   Call these to trigger one-shot reactions
───────────────────────────────────────────── */
function creatureReact(el, type = 'happy') {
  if (!el) return;
  const reactions = {
    happy:   [{ transform:'scale(1.2) rotate(-5deg)' }, { transform:'scale(1) rotate(0)' }],
    excited: [{ transform:'translateY(-12px) scale(1.15)' }, { transform:'translateY(0) scale(1)' }],
    alert:   [{ transform:'scale(0.9)' }, { transform:'scale(1.1)' }, { transform:'scale(1)' }],
  };
  el.animate(reactions[type] || reactions.happy, { duration: 400, easing: 'ease', fill: 'forwards' });
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  createBgCreatures();
  createLoginCreatures();

  // Resize handler
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(createBgCreatures, 400);
  });
});