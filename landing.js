/* ===================================================
   MINTYNEX LANDING PAGE - JavaScript
   Full HD Pokemon Character Floating Background
   Unified Pokéball Logo | Enhanced Animations
   =================================================== */

// High-quality official Pokemon artwork PNGs from PokeAPI
const POKEMON_CHARS = [
  { name:'pikachu',    src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' },
  { name:'charizard',  src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png' },
  { name:'bulbasaur',  src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png' },
  { name:'squirtle',   src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png' },
  { name:'mewtwo',     src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png' },
  { name:'eevee',      src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png' },
  { name:'snorlax',    src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png' },
  { name:'gengar',     src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png' },
  { name:'mew',        src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png' },
  { name:'jigglypuff', src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png' },
  { name:'psyduck',    src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/54.png' },
  { name:'lucario',    src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png' },
  { name:'dragonite',  src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png' },
  { name:'umbreon',    src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/197.png' },
  { name:'rayquaza',   src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/384.png' },
  { name:'gardevoir',  src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/282.png' },
  { name:'arcanine',   src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/59.png' },
  { name:'vaporeon',   src:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/134.png' },
];

// Positions spread evenly
const POSITIONS = [
  { l:2,   t:5  }, { l:18,  t:72 }, { l:35,  t:8  }, { l:52,  t:68 },
  { l:68,  t:3  }, { l:82,  t:60 }, { l:8,   t:40 }, { l:44,  t:35 },
  { l:76,  t:28 }, { l:25,  t:52 }, { l:60,  t:45 }, { l:90,  t:80 },
  { l:14,  t:85 }, { l:48,  t:82 }, { l:72,  t:82 }, { l:38,  t:58 },
  { l:5,   t:58 }, { l:92,  t:18 },
];

const ANIMS = ['pkFloatA','pkFloatB','pkFloatC'];
const GLOWS = [
  'drop-shadow(0 0 18px rgba(255,215,0,0.55))',
  'drop-shadow(0 0 18px rgba(255,90,30,0.55))',
  'drop-shadow(0 0 18px rgba(50,210,100,0.55))',
  'drop-shadow(0 0 18px rgba(80,160,255,0.55))',
  'drop-shadow(0 0 18px rgba(210,100,255,0.55))',
  'drop-shadow(0 0 18px rgba(255,160,200,0.55))',
];

function createFloatingPokemon() {
  const container = document.getElementById('pokemon-bg');
  if (!container) return;
  container.innerHTML = '';

  const isMobile = window.innerWidth < 768;
  const list = isMobile ? POKEMON_CHARS.slice(0, 10) : POKEMON_CHARS;

  list.forEach((pkm, i) => {
    const pos   = POSITIONS[i % POSITIONS.length];
    const anim  = ANIMS[i % ANIMS.length];
    const glow  = GLOWS[i % GLOWS.length];
    const dur   = (6 + (i * 1.3) % 6).toFixed(1);
    const del   = -((i * 1.7) % 7).toFixed(1);
    const size  = isMobile ? (70 + (i * 17) % 50) : (90 + (i * 23) % 80);

    const el = document.createElement('div');
    el.className = 'pkm-float';
    el.style.cssText = `
      position:absolute;
      left:${pos.l}%;
      top:${pos.t}%;
      width:${size}px;
      height:${size}px;
      pointer-events:none;
      user-select:none;
      animation:${anim} ${dur}s ease-in-out infinite;
      animation-delay:${del}s;
      will-change:transform;
      z-index:0;
    `;

    const img = document.createElement('img');
    img.src = pkm.src;
    img.alt = pkm.name;
    img.loading = 'lazy';
    img.style.cssText = `
      width:100%;
      height:100%;
      object-fit:contain;
      opacity:0;
      transition:opacity 0.8s ease, filter 0.5s ease;
      filter:${glow} brightness(1.05) saturate(1.15);
    `;

    img.onload = () => {
      img.style.opacity = isMobile ? '0.22' : '0.16';
    };
    img.onerror = () => { el.style.display = 'none'; };

    el.appendChild(img);
    container.appendChild(el);
  });
}

// CTA section Pokemon
function createCtaPokemon() {
  const container = document.querySelector('.cta-pokemon-bg');
  if (!container) return;
  container.innerHTML = '';
  const mini = POKEMON_CHARS.slice(0, 6);
  mini.forEach((pkm, i) => {
    const el = document.createElement('div');
    const size = 80 + (i * 20) % 60;
    el.style.cssText = `
      position:absolute;
      left:${(i * 17) % 90}%;
      top:${(i * 23) % 80}%;
      width:${size}px;height:${size}px;
      pointer-events:none;user-select:none;
      animation:${ANIMS[i%ANIMS.length]} ${(5+i*1.2).toFixed(1)}s ease-in-out infinite;
      animation-delay:-${(i*1.5).toFixed(1)}s;
    `;
    const img = document.createElement('img');
    img.src = pkm.src;
    img.alt = pkm.name;
    img.loading = 'lazy';
    img.style.cssText = `width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 0.8s;filter:drop-shadow(0 0 14px rgba(255,255,255,0.3)) brightness(1.1);`;
    img.onload = () => { img.style.opacity = '0.12'; };
    img.onerror = () => { el.style.display='none'; };
    el.appendChild(img);
    container.appendChild(el);
  });
}

// Inject the blue SVG pokeball logo everywhere
const BLUE_POKEBALL_SVG = `<svg width="36" height="36" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 10px rgba(0,210,255,0.55));flex-shrink:0">
  <circle cx="40" cy="40" r="40" fill="url(#lndPb1)"/>
  <circle cx="40" cy="40" r="40" fill="url(#lndPb2)" opacity="0.5"/>
  <line x1="6" y1="40" x2="74" y2="40" stroke="rgba(255,255,255,0.95)" stroke-width="4"/>
  <circle cx="40" cy="40" r="14" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.95)" stroke-width="4"/>
  <circle cx="40" cy="40" r="7" fill="white"/>
  <circle cx="40" cy="40" r="4" fill="url(#lndPb1)"/>
  <defs>
    <linearGradient id="lndPb1" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
      <stop stop-color="#00f5a0"/>
      <stop offset="0.5" stop-color="#00d2ff"/>
      <stop offset="1" stop-color="#0ea5e9"/>
    </linearGradient>
    <linearGradient id="lndPb2" x1="80" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
      <stop stop-color="#00f5a0" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#0ea5e9" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
</svg>`;

function replaceAllLogosWithPokeball() {
  // Replace CSS pokeball divs and leaf emoji icons with the blue SVG pokeball
  document.querySelectorAll('.pokeball-logo, .pokeball-logo-lg').forEach(el => {
    const wrapper = document.createElement('span');
    wrapper.innerHTML = BLUE_POKEBALL_SVG;
    el.replaceWith(wrapper.firstChild);
  });

  // Replace any remaining 🌿 leaf icon spans
  document.querySelectorAll('.logo-icon').forEach(icon => {
    if (icon.textContent.includes('🌿') || !icon.textContent.trim()) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = BLUE_POKEBALL_SVG;
      icon.replaceWith(wrapper.firstChild);
    }
  });
}

// ============== NAVBAR SCROLL ==============
function initNavbar() {
  const nav = document.getElementById('mnav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

// ============== MOBILE MENU ==============
function initMobileMenu() {
  const burger = document.getElementById('burger');
  const menu   = document.getElementById('mobileMenu');
  if (!burger || !menu) return;
  burger.addEventListener('click', () => menu.classList.toggle('open'));
}
window.closeMobile = function() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.remove('open');
};

// ============== SCROLL REVEAL ==============
function initReveal() {
  const els = document.querySelectorAll(
    '.feat-card,.step-card,.cf-post,.trust-list li,.verify-card,.trust-badges .tb'
  );
  els.forEach(el => el.classList.add('reveal'));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin:'0px 0px -30px 0px' });
  els.forEach(el => observer.observe(el));
}

// ============== PARALLAX CARDS ==============
function initParallax() {
  const cards = document.querySelectorAll('.showcase-card[data-depth]');
  if (!cards.length) return;
  document.addEventListener('mousemove', e => {
    const dx = (e.clientX - window.innerWidth / 2)  / (window.innerWidth / 2);
    const dy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    cards.forEach(card => {
      const d = parseFloat(card.getAttribute('data-depth') || '0.2');
      card.style.transform = `translate(${dx*d*20}px,${dy*d*20}px)`;
    });
  });
}

// ============== COUNTER ANIM ==============
function initCounters() {
  const stats = document.querySelectorAll('.hstat-val');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const raw = el.textContent;
      const num = parseFloat(raw.replace(/[^0-9.]/g,''));
      const sfx = raw.replace(/[\d.]/g,'');
      const isF = raw.includes('.');
      let start = null;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1500, 1);
        const v = (1 - Math.pow(1-p, 3)) * num;
        el.textContent = (isF ? v.toFixed(1) : Math.floor(v)) + sfx;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  stats.forEach(el => observer.observe(el));
}

// ============== SMOOTH LINKS ==============
function initSmoothLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) { 
        e.preventDefault(); 
        target.scrollIntoView({ behavior:'smooth' }); 
        closeMobile(); 
      }
    });
  });
}

// ============== ADDITIONAL ANIMATIONS ==============
function initHoverAnimations() {
  // Add floating animation to stat cards on hover
  const statCards = document.querySelectorAll('.stat-b, .feat-card');
  statCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.3s ease';
      card.style.transform = 'translateY(-5px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
    });
  });
}

// ============== INIT ==============
document.addEventListener('DOMContentLoaded', () => {
  createFloatingPokemon();
  createCtaPokemon();
  initNavbar();
  initMobileMenu();
  initReveal();
  initParallax();
  initCounters();
  initSmoothLinks();
  initHoverAnimations();
  replaceAllLogosWithPokeball();
  
  // Add animation classes to elements
  document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => {
    btn.addEventListener('click', function(e) {
      this.style.transform = 'scale(0.98)';
      setTimeout(() => { this.style.transform = ''; }, 150);
    });
  });
});