// main.js — Kendren Cornish Portfolio

async function readMirrorJson(response, fallbackMessage) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      throw new Error(plain ? `${fallbackMessage}: ${plain.slice(0, 180)}` : `${fallbackMessage}: invalid server response`);
    }
  }

  if (!response.ok) {
    throw new Error((data && (data.error || data.message)) || fallbackMessage);
  }

  return data;
}

// ── SERVICE WORKER (PWA) ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ── PWA INSTALL BANNER ──
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  if (banner && !localStorage.getItem('pwa-dismissed')) {
    setTimeout(() => banner.classList.add('show'), 2000);
  }
});

/* -- MIRROR 5000 SITEWIDE FOOTER FEED + ADMIN ENTRY -- */
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3005'
    : 'https://handwritten-lead-funnel.vercel.app';
  const MIRROR_PAGE = '/mirror5000';

  injectMirrorNavLink();
  const footer = document.querySelector('footer');
  if (!footer) return;

  injectMirrorFooterCTA(footer);

  if (!document.getElementById('recent-ticker-container')) {
    const feed = document.createElement('div');
    feed.className = 'recent-ticker-container';
    feed.id = 'recent-ticker-container';
    feed.innerHTML = `
      <div class="recent-ticker-title">Live Field Feed: Recent Authorizations</div>
      <div class="recent-ticker-wrap">
        <div class="recent-ticker-move" id="recent-ticker-move"></div>
      </div>
    `;
    footer.parentNode.insertBefore(feed, footer);
    loadSitewideRecentSignups(feed.querySelector('#recent-ticker-move'));
  }

  if (!footer.querySelector('.mirror-admin-entry')) {
    const adminLink = document.createElement('a');
    adminLink.className = 'mirror-admin-entry';
    adminLink.href = MIRROR_PAGE + '?showLedger=true';
    adminLink.title = 'System Ledger';
    adminLink.setAttribute('aria-label', 'Open Mirror 5000 admin ledger');
    adminLink.textContent = '🧸';

    const footerBottom = footer.querySelector('.footer-bottom') || footer;
    footerBottom.appendChild(adminLink);
  }

  function injectMirrorNavLink() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks || navLinks.querySelector('a[href="/mirror5000"], a[href="mirror5000.html"]')) return;

    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = MIRROR_PAGE;
    link.className = 'mirror-nav-link';
    link.textContent = 'Mirror 5000';
    listItem.appendChild(link);

    const contactItem = navLinks.querySelector('a.nav-cta')?.closest('li');
    navLinks.insertBefore(listItem, contactItem || null);
  }

  function injectMirrorFooterCTA(targetFooter) {
    if (document.querySelector('.mirror-site-cta')) return;

    const cta = document.createElement('section');
    cta.className = 'mirror-site-cta';
    cta.setAttribute('aria-label', 'Mirror 5000 manual shortcut');
    cta.innerHTML = `
      <div class="mirror-site-cta-inner">
        <div class="mirror-site-cta-copy">
          <span class="mirror-site-kicker">Mirror 5000</span>
          <strong>Seen Until Believed Manual</strong>
          <p>Open the private workbook and download the field manual.</p>
        </div>
        <a class="mirror-site-cta-link" href="${MIRROR_PAGE}">Open Manual</a>
      </div>
    `;
    targetFooter.parentNode.insertBefore(cta, targetFooter);
  }

  async function loadSitewideRecentSignups(tickerMove) {
    if (!tickerMove) return;
    const mockCreators = generateSitewideMockCreators();

    try {
      const response = await fetch(API_BASE + '/api/subscribers/recent');
      const data = await readMirrorJson(response, 'Failed to load recent signups');
      const merged = Array.isArray(data) ? [...data] : [];
      mockCreators.forEach(mock => {
        if (merged.length < 120) merged.push(mock);
      });
      renderSitewideTicker(tickerMove, merged);
    } catch (err) {
      console.warn('Could not connect to live submissions API, falling back to mock logs:', err);
      renderSitewideTicker(tickerMove, mockCreators);
    }
  }

  function renderSitewideTicker(tickerMove, items) {
    tickerMove.innerHTML = items.map(item => `
      <div class="ticker-item">
        <span class="highlight-name">${escapeSitewideHTML(item.name)}</span>
        (<span class="highlight-email">${escapeSitewideHTML(item.email)}</span>)
        just authorized mirror passport entry
      </div>
    `).join(' &nbsp;&bull;&nbsp; ');
  }

  function escapeSitewideHTML(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function generateSitewideMockCreators() {
    const names = [
      'Kendren', 'Tachyon', 'Aria', 'Julian', 'Marcus', 'Sienna', 'Elena', 'Liam', 'Sophia', 'Zavier',
      'Chloe', 'Devon', 'Amara', 'Kai', 'Maya', 'Silas', 'Freya', 'Jonah', 'Leila', 'Dante',
      'Zoe', 'Luca', 'Nova', 'Jasper', 'Zara', 'Tristan', 'Naomi', 'Ezra', 'Iris', 'Felix',
      'Clara', 'Leo', 'Ruby', 'Ada', 'Jude', 'Gwen', 'Kaelen', 'Fiona', 'Cassian', 'Seraphina',
      'Callum', 'Lyra', 'Rowan', 'Evangeline', 'Beckett', 'Isla', 'Gideon', 'Maeve', 'Cyrus',
      'Ophelia', 'Lachlan', 'Astrid', 'Atticus', 'Genevieve', 'Rory', 'Aurelia', 'Soren', 'Elowen',
      'Cassius', 'Thalia', 'Kian', 'Mirabelle', 'Killian', 'Tobias', 'Nadia', 'Ronan', 'Imogen',
      'Balthazar', 'Axiom', 'Zephyr', 'Orion', 'Lysander', 'Calliope', 'Peregrine', 'Elara', 'Rohan',
      'Evander', 'Keanu', 'Samira', 'Callista', 'Castor', 'Echo', 'Faye', 'Griffin', 'Helix', 'Indigo',
      'Osiris', 'Phoenix', 'Quest', 'River', 'Sage', 'Sol', 'Titus', 'Vesper', 'Winter', 'Xanthe',
      'Yael', 'Zenith', 'Atlas', 'Caspian', 'Dax', 'Harlow', 'Idris', 'Jett', 'Koda', 'Lennox',
      'Magnus', 'Nola', 'Opal', 'Priya', 'Remy', 'Salem', 'Tatum', 'Wilder', 'Zuri'
    ];
    const domains = ['gmail.com', 'proton.me', 'substack.com', 'beehiiv.com', 'yahoo.com', 'icloud.com', 'outlook.com', 'hey.com'];

    return Array.from({ length: 120 }, (_, index) => {
      const baseName = names[index % names.length];
      const fullName = baseName + (index >= names.length ? String(index) : '');
      const domain = domains[(index * 3) % domains.length];
      const emailPrefix = baseName.toLowerCase() + (index % 7 ? String(index % 100) : '');
      return {
        name: fullName.substring(0, Math.min(2, fullName.length)) + '***',
        email: emailPrefix.substring(0, Math.min(2, emailPrefix.length)) + '***@' + domain
      };
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const confirmBtn = document.getElementById('pwa-install-confirm');
  const dismissBtn = document.getElementById('pwa-install-dismiss');
  const banner = document.getElementById('pwa-install-banner');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (deferredPrompt) { deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; deferredPrompt = null; }
      banner?.classList.remove('show');
    });
  }
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      banner?.classList.remove('show');
      localStorage.setItem('pwa-dismissed', '1');
    });
  }
});

// ── INJECT BOTTOM NAV & APP DRAWER (MOBILE DEPLOYMENT) ──
document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const allPages = [
    { href: 'index.html',     icon: '🏠', label: 'Home'      },
    { href: '/mirror5000', icon: '✦', label: 'Mirror'    },
    { href: 'about.html',     icon: '👤', label: 'About'     },
    { href: 'projects.html',  icon: '⚙️', label: 'Projects'  },
    { href: 'metrics.html',   icon: '📊', label: 'Metrics'   },
    { href: 'archive.html',   icon: '🏛️', label: 'Archive'   },
    { href: 'music.html',     icon: '🎧', label: 'Music'     },
    { href: 'fintech.html',   icon: '₿',  label: 'FinTech'   },
    { href: 'research.html',  icon: '📄', label: 'Research'  },
    { href: 'military.html',  icon: '🎖️', label: 'Service'   },
    { href: 'nonprofit.html', icon: '🌱', label: 'Nonprofit' },
    { href: 'languages.html', icon: '🈶', label: 'Mandarin'  },
    { href: 'blog.html',      icon: '✍️', label: 'Blog'      },
    { href: 'socials.html',   icon: '🌐', label: 'Connect'   },
    { href: 'graduate.html',  icon: '🎓', label: 'Path'      },
    { href: 'contact.html',   icon: '✉️', label: 'Contact'   },
  ];

  const quickNav = [
    { href: 'index.html',    icon: '🏠', label: 'Home'     },
    { href: '/mirror5000', icon: '✦', label: 'Mirror'  },
    { href: 'projects.html', icon: '⚙️', label: 'Projects' },
    { href: 'contact.html',  icon: '✉️', label: 'Contact'  },
  ];

  // 1. Build Static Bottom Bar
  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  
  // App drawer trigger
  const menuBtn = `<a href="javascript:void(0)" id="mnav-trigger">
      <span class="mnav-icon">⚏</span>Menu
    </a>`;
    
  nav.innerHTML = quickNav.map(n =>
    `<a href="${n.href}" ${n.href === page ? 'class="active"' : ''}>
      <span class="mnav-icon">${n.icon}</span>${n.label}
    </a>`
  ).join('') + menuBtn;
  document.body.appendChild(nav);

  // 2. Build App Drawer (Sliding Bottom Sheet)
  const drawer = document.createElement('div');
  drawer.className = 'mobile-app-drawer';
  drawer.innerHTML = `
    <div class="drawer-header">
      <h3>All Destinations</h3>
      <button class="drawer-close" id="drawer-close">✕</button>
    </div>
    <div class="drawer-grid">
      ${allPages.map(n => `
        <a href="${n.href}" class="drawer-link ${n.href === page ? 'active' : ''}">
          <span class="drawer-icon">${n.icon}</span>
          <span class="drawer-label">${n.label}</span>
        </a>
      `).join('')}
    </div>
  `;
  document.body.appendChild(drawer);

  // 3. Interactions
  const trigger = document.getElementById('mnav-trigger');
  const closeBtn = document.getElementById('drawer-close');
  
  trigger.addEventListener('click', () => {
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden'; // prevent bg scroll
  });
  
  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  });

  // PWA Install Banner
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-install-banner';
  banner.innerHTML = `
    <div class="banner-icon">📲</div>
    <div class="banner-text">
      <h4>Add to Home Screen</h4>
      <p>Install Kendren's portfolio as an app</p>
    </div>
    <div class="banner-actions">
      <button class="pwa-install-btn confirm" id="pwa-install-confirm">Install</button>
      <button class="pwa-install-btn dismiss" id="pwa-install-dismiss">✕</button>
    </div>`;
  document.body.appendChild(banner);
});

// ── NAV TOGGLE (mobile hamburger) ──
const navToggle = document.getElementById('nav-toggle');
const navLinksEl  = document.getElementById('nav-links');
if (navToggle && navLinksEl) {
  navToggle.addEventListener('click', () => {
    navLinksEl.classList.toggle('open');
    navToggle.classList.toggle('open');
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => { navLinksEl.classList.remove('open'); navToggle.classList.remove('open'); });
  });
}

// ── NAV SCROLL STYLE ──
const nav = document.getElementById('main-nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 40 ? 'rgba(9,9,15,0.97)' : 'rgba(9,9,15,0.85)';
  }, { passive: true });
}

// ── PARTICLE SYSTEM ──
const canvas = document.createElement('canvas');
const particlesEl = document.getElementById('particles');
if (particlesEl) {
  particlesEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = particlesEl.offsetWidth;
    H = canvas.height = particlesEl.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const COLORS = ['#a78bfa','#38bdf8','#f472b6','#ffd700','#6befff','#7fff6b'];
  function mkParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.6 + 0.1,
    };
  }
  for (let i = 0; i < 120; i++) particles.push(mkParticle());

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
  }
  drawParticles();
}

// ── ACCORDION ──
document.querySelectorAll('.accordion-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    const content = btn.nextElementSibling;
    const isOpen = btn.classList.contains('open');
    document.querySelectorAll('.accordion-trigger').forEach(b => {
      b.classList.remove('open');
      b.nextElementSibling?.classList.remove('open');
    });
    if (!isOpen) { btn.classList.add('open'); content?.classList.add('open'); }
  });
});

// ── FADE-IN ON SCROLL ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });

document.querySelectorAll(
  '.pillar-card, .research-card, .blog-item, .school-card, .stat-item, .timeline-item, .link-card, .photo-slot, .photo-uploaded'
).forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
document.querySelectorAll('.pillar-card, .research-card, .blog-item, .school-card, .stat-item, .timeline-item, .link-card, .photo-slot, .photo-uploaded').forEach(el => {
  const delay = Array.from(el.parentElement?.children || []).indexOf(el) * 80;
  el.style.transitionDelay = delay + 'ms';
});
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.visible').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
});
// inject visible class
const styleTag = document.createElement('style');
styleTag.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(styleTag);

/* ── NEWSLETTER MODAL ── */
const newsletterBtn = document.getElementById('newsletter-btn');
const newsletterModal = document.getElementById('newsletter-modal');
const modalClose = document.getElementById('modal-close');
const newsletterForm = document.getElementById('newsletter-form');
const newsletterSuccess = document.getElementById('newsletter-success');

if (newsletterBtn && newsletterModal) {
  newsletterBtn.addEventListener('click', () => {
    newsletterModal.classList.add('open');
  });
  modalClose.addEventListener('click', () => {
    newsletterModal.classList.remove('open');
  });
  newsletterModal.addEventListener('click', (e) => {
    if (e.target === newsletterModal) newsletterModal.classList.remove('open');
  });
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = newsletterForm.querySelector('button');
    btn.textContent = 'Subscribing...';
    setTimeout(() => {
      btn.textContent = 'Subscribe';
      newsletterSuccess.style.display = 'block';
      newsletterForm.reset();
      setTimeout(() => {
        newsletterModal.classList.remove('open');
        newsletterSuccess.style.display = 'none';
      }, 2000);
    }, 800);
  });
}

/* ── ROTATING HERO TEXT ── */
const rotatingPhrases = document.querySelectorAll('.rotating-phrase');
if (rotatingPhrases.length > 0) {
  let currentPhrase = 0;
  setInterval(() => {
    rotatingPhrases[currentPhrase].classList.remove('active');
    currentPhrase = (currentPhrase + 1) % rotatingPhrases.length;
    rotatingPhrases[currentPhrase].classList.add('active');
  }, 4000); // Change phrase every 4 seconds
}

/* ── MIRROR 5000 LEAD MAGNET POPUP ENGINE ── */
document.addEventListener('DOMContentLoaded', () => {
  const popupModal = document.getElementById('mirror-popup-modal');
  const popupClose = document.getElementById('mirror-popup-close');
  const popupForm = document.getElementById('mirror-popup-form');
  const popupError = document.getElementById('mirror-popup-error');

  if (!popupModal) return;

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3005'
      : 'https://handwritten-lead-funnel.vercel.app';

  // Trigger popup modal with 2 second delay if not already seen
  if (!localStorage.getItem('mirror5000_popup_seen')) {
    setTimeout(() => {
      popupModal.classList.add('open');
    }, 2000);
  }

  // Close popup
  function closePopup() {
    popupModal.classList.remove('open');
    localStorage.setItem('mirror5000_popup_seen', 'true');
  }

  if (popupClose) {
    popupClose.addEventListener('click', closePopup);
  }

  popupModal.addEventListener('click', (e) => {
    if (e.target === popupModal) {
      closePopup();
    }
  });

  // Handle Form Submit
  if (popupForm) {
    popupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('mirror-popup-name').value.trim();
      const email = document.getElementById('mirror-popup-email').value.trim();
      const consent = document.getElementById('mirror-popup-consent-check').checked;

      if (!name || !email) {
        popupError.textContent = 'Name and email are required.';
        return;
      }
      if (!consent) {
        popupError.textContent = 'Please accept consent terms.';
        return;
      }

      const submitBtn = popupForm.querySelector('.mirror-popup-submit');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'STAMPING...';
      submitBtn.disabled = true;
      popupError.textContent = '';

      try {
        const payload = {
          first_name: name,
          email: email,
          consent_opt_in: true,
          source_page: 'homepage_popup'
        };

        const response = await fetch(API_BASE + '/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        await readMirrorJson(response, 'Failed to submit details.');

        // Prefill session variables for workbook page
        sessionStorage.setItem('mirror5000_email', email);
        sessionStorage.setItem('mirror5000_first_name', name);
        
        closePopup();
        
        // Redirect to funnel workbook starting page
        window.location.href = '/mirror5000';
      } catch (err) {
        console.error("Popup subscription error:", err);
        popupError.textContent = err.message || 'An error occurred. Please try again.';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Live Signups Ticker Marquee Initialization
  const tickerMove = document.getElementById('recent-ticker-move');
  if (tickerMove) {
      loadRecentSignups();
  }

  async function loadRecentSignups() {
      const mockCreators = generateMockCreators();
      try {
          const response = await fetch(API_BASE + '/api/subscribers/recent');
          const data = await readMirrorJson(response, 'Failed to load recent signups');
          
          // Merge real signups at the front, followed by mock creators to pad it
          const merged = Array.isArray(data) ? [...data] : [];
          mockCreators.forEach(mock => {
              if (merged.length < 120) {
                  merged.push(mock);
              }
          });
          
          renderTicker(merged);
      } catch (err) {
          console.warn("Could not connect to live submissions API, falling back to mock logs:", err);
          renderTicker(mockCreators);
      }
  }

  function renderTicker(items) {
      if (!tickerMove) return;
      tickerMove.innerHTML = items.map(s => {
          return `<div class="ticker-item">
              <span class="highlight-name">${escapeHTML(s.name)}</span> 
              (<span class="highlight-email">${escapeHTML(s.email)}</span>) 
              just authorized mirror passport entry
          </div>`;
      }).join(' &nbsp;&bull;&nbsp; ');
  }

  function escapeHTML(str) {
      if (!str) return '';
      return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
  }

  function generateMockCreators() {
      const names = [
          "Kendren", "Tachyon", "Aria", "Julian", "Marcus", "Sienna", "Elena", "Liam", "Sophia", "Zavier",
          "Chloe", "Devon", "Amara", "Kai", "Maya", "Silas", "Freya", "Jonah", "Leila", "Dante",
          "Zoe", "Luca", "Nova", "Jasper", "Zara", "Tristan", "Naomi", "Ezra", "Iris", "Felix",
          "Clara", "Leo", "Ruby", "Ada", "Jude", "Gwen", "Kaelen", "Fiona", "Cassian", "Seraphina",
          "Callum", "Lyra", "Rowan", "Evangeline", "Beckett", "Isla", "Gideon", "Maeve", "Cyrus",
          "Ophelia", "Lachlan", "Astrid", "Atticus", "Genevieve", "Rory", "Aurelia", "Soren", "Elowen",
          "Cassius", "Thalia", "Kian", "Mirabelle", "Killian", "Tobias", "Nadia", "Ronan", "Imogen",
          "Balthazar", "Axiom", "Zephyr", "Orion", "Lysander", "Calliope", "Peregrine", "Elara", "Rohan",
          "Evander", "Keanu", "Samira", "Callista", "Castor", "Echo", "Faye", "Griffin", "Helix", "Indigo",
          "Osiris", "Phoenix", "Quest", "River", "Sage", "Sol", "Titus", "Vesper", "Winter", "Xanthe",
          "Yael", "Zenith", "Atlas", "Caspian", "Dax", "Harlow", "Idris", "Jett", "Koda", "Lennox",
          "Magnus", "Nola", "Opal", "Priya", "Remy", "Salem", "Tatum", "Wilder", "Zuri"
      ];
      const domains = ["gmail.com", "proton.me", "substack.com", "beehiiv.com", "yahoo.com", "icloud.com", "outlook.com", "hey.com"];
      
      const mockList = [];
      for (let i = 0; i < 120; i++) {
          const baseName = names[i % names.length];
          const nameSuffix = (i >= names.length) ? String(i) : "";
          const fullName = baseName + nameSuffix;
          
          const domain = domains[(i * 3) % domains.length];
          const emailPrefix = baseName.toLowerCase() + (i % 7 ? String(i % 100) : "");
          
          const visibleNameLen = Math.min(2, fullName.length);
          const obfuscatedName = fullName.substring(0, visibleNameLen) + '***';
          
          const visibleEmailLen = Math.min(2, emailPrefix.length);
          const obfuscatedEmail = emailPrefix.substring(0, visibleEmailLen) + '***@' + domain;
          
          mockList.push({ name: obfuscatedName, email: obfuscatedEmail });
      }
      return mockList;
  }
});
