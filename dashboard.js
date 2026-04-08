/* ===============================
   MEMORY VAULT — DASHBOARD JS
   =============================== */

document.addEventListener('DOMContentLoaded', () => {

  // ── Sidebar toggle (mobile) ──────────────────────────
  window.toggleSidebar = function () {
    document.getElementById('sidebar').classList.toggle('open');
  };

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.querySelector('.menu-toggle');
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      sidebar.classList.remove('open');
    }
  });

  // ── Active nav item ──────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // ── Chart tab switching ──────────────────────────────
  const tabData = {
    '7D': {
      path1: 'M0,120 C50,100 80,60 120,55 C160,50 180,90 220,70 C260,50 290,20 340,25 C390,30 420,70 460,55 C500,40 540,15 600,10 L600,160 L0,160 Z',
      path2: 'M0,120 C50,100 80,60 120,55 C160,50 180,90 220,70 C260,50 290,20 340,25 C390,30 420,70 460,55 C500,40 540,15 600,10',
      points: [[120,55],[220,70],[340,25],[460,55],[600,10]]
    },
    '1M': {
      path1: 'M0,140 C60,130 100,100 150,85 C200,70 230,95 280,80 C330,65 370,40 420,45 C470,50 510,70 550,50 C570,40 590,20 600,15 L600,160 L0,160 Z',
      path2: 'M0,140 C60,130 100,100 150,85 C200,70 230,95 280,80 C330,65 370,40 420,45 C470,50 510,70 550,50 C570,40 590,20 600,15',
      points: [[150,85],[280,80],[420,45],[550,50],[600,15]]
    },
    '3M': {
      path1: 'M0,150 C80,140 130,120 180,100 C230,80 260,110 320,90 C380,70 420,35 470,30 C520,25 560,45 600,20 L600,160 L0,160 Z',
      path2: 'M0,150 C80,140 130,120 180,100 C230,80 260,110 320,90 C380,70 420,35 470,30 C520,25 560,45 600,20',
      points: [[180,100],[320,90],[470,30],[600,20]]
    }
  };

  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      const key  = this.textContent.trim();
      const data = tabData[key];
      if (!data) return;

      const svg    = document.querySelector('.sparkline');
      const area   = svg.querySelector('path:first-of-type');
      const line   = svg.querySelector('path:last-of-type');
      const circles = svg.querySelectorAll('circle');

      area.setAttribute('d', data.path1);
      line.setAttribute('d', data.path2);

      circles.forEach((c, i) => {
        const pt = data.points[i];
        if (pt) {
          c.setAttribute('cx', pt[0]);
          c.setAttribute('cy', pt[1]);
          c.style.opacity = '1';
        } else {
          c.style.opacity = '0';
        }
      });
    });
  });

  // ── Copy wallet address ──────────────────────────────
  window.copyWallet = async function () {
    const addr = document.getElementById('walletAddr')?.textContent;
    try {
      await navigator.clipboard.writeText(addr);
      showToast('Address copied!');
    } catch {
      showToast('Copied!');
    }
  };

  // ── Stat counters animation ──────────────────────────
  function animateCounter(el, target, suffix = '', decimals = 0) {
    const duration  = 1200;
    const start     = performance.now();
    const startVal  = 0;

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = startVal + (target - startVal) * eased;
      el.textContent = current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── Reveal on scroll ────────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.stat-card, .card, .security-item').forEach(el => {
    el.classList.add('reveal-up');
    observer.observe(el);
  });

  // ── Animate stat values on load ──────────────────────
  const statValues = document.querySelectorAll('.stat-card-value');

  const counterConfig = [
    { target: 142.80, suffix: ' SOL', decimals: 2 },
    { target: 4,      suffix: '',     decimals: 0 },
    { target: 389.00, suffix: ' SOL', decimals: 2 },
    { target: 27,     suffix: '',     decimals: 0 },
  ];

  statValues.forEach((el, i) => {
    const cfg    = counterConfig[i];
    if (!cfg) return;
    const span   = el.querySelector('span');
    const spanHTML = span ? span.outerHTML : '';
    el.innerHTML = '0' + spanHTML;
    const textNode = el.childNodes[0];

    const duration = 1200;
    const start    = performance.now();

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = cfg.target * eased;
      textNode.textContent = current.toFixed(cfg.decimals) + cfg.suffix + ' ';
      if (progress < 1) requestAnimationFrame(tick);
    }
    setTimeout(() => requestAnimationFrame(tick), 300 + i * 80);
  });

  // ── Toast notification ───────────────────────────────
  function showToast(msg) {
    const existing = document.querySelector('.mv-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'mv-toast';
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed;
      bottom: 28px;
      right: 28px;
      background: #1E2332;
      color: #fff;
      padding: 10px 20px;
      border-radius: 999px;
      font-family: 'THICCCBOI', system-ui, sans-serif;
      font-size: 13.5px;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideUp 0.22s ease forwards;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 220);
    }, 2200);
  }

});
