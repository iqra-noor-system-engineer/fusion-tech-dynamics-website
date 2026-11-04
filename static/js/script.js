// Same-page navigation and compact header state.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a[href^='#']").forEach(link => {
    link.addEventListener("click", event => {
      const selector = link.getAttribute("href");
      if (!selector || selector === "#") return;
      const target = document.querySelector(selector);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const navbar = document.querySelector("header.navbar");
  if (navbar) {
    const updateNavbar = () => navbar.classList.toggle("is-scrolled", window.scrollY > 18);
    window.addEventListener("scroll", updateNavbar, { passive: true });
    updateNavbar();
  }
});

// In static/js/script.js
document.addEventListener("DOMContentLoaded", () => {
  const elements = document.querySelectorAll('.fade-on-scroll');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
});

// Hero: rotating headline word + live "Systems Monitor" widget
document.addEventListener("DOMContentLoaded", () => {
  // --- rotating word ---
  const rotator = document.getElementById("rotator");
  if (rotator) {
    const words = [
      "Complete Products", "Embedded Systems", "Edge AI",
      "Aerospace", "Industrial Automation", "Connected Operations"
    ];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      rotator.style.opacity = "0";
      setTimeout(() => {
        rotator.textContent = words[i];
        rotator.style.opacity = "1";
      }, 350);
    }, 2600);
  }

  // --- live systems-monitor widget ---
  const clock = document.getElementById("sysmon-clock");
  if (clock) {
    const dateEl = document.getElementById("sysmon-date");
    const latEl  = document.getElementById("sysmon-lat");
    const altEl  = document.getElementById("sysmon-alt");
    const line   = document.getElementById("sysmon-line");
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const pad = n => String(n).padStart(2, "0");
    const data = Array.from({ length: 44 }, () => 28 + Math.random() * 22);

    const points = arr => arr.map((v, idx) => {
      const x = (idx / (arr.length - 1)) * 300;
      const y = 60 - (v / 60) * 60;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");

    function tick() {
      const d = new Date();
      clock.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
      if (dateEl) dateEl.textContent = pad(d.getDate()) + " " + months[d.getMonth()] + " " + d.getFullYear();
      if (latEl) latEl.textContent = (18 + Math.floor(Math.random() * 9)) + " ms";
      if (altEl) altEl.textContent = (1240 + Math.floor(Math.random() * 18)).toLocaleString() + " m";
      data.push(28 + Math.random() * 22);
      data.shift();
      if (line) line.setAttribute("points", points(data));
    }
    tick();
    setInterval(tick, 1000);
  }
});

// Mobile navigation toggle
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  if (!toggle || !menu) return;

  const close = () => {
    menu.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
});

// Count-up stats + site-wide scroll reveal
document.addEventListener("DOMContentLoaded", () => {
  // --- count-up stats ---
  const statsBar = document.querySelector(".stats-bar");
  if (statsBar) {
    let done = false;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !done) {
          done = true;
          document.querySelectorAll(".stat strong").forEach(el => {
            const raw = el.textContent.trim();
            const target = parseInt(raw, 10) || 0;
            const suffix = raw.replace(/[0-9]/g, "");
            let cur = 0;
            const inc = Math.max(1, target / 40);
            const t = setInterval(() => {
              cur += inc;
              if (cur >= target) { cur = target; clearInterval(t); }
              el.textContent = Math.round(cur) + suffix;
            }, 28);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.4 });
    obs.observe(statsBar);
  }

  // --- scroll reveal (progressive enhancement: only hides once JS runs) ---
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const targets = document.querySelectorAll(
      ".service-card, .service-band, .product-card, .featured-product, .category-heading > *, .flagship-visual, .flagship-copy, .product-intro-grid > *, .service-intro-grid > *, .process-grid > div, .home-pillar, .testimonial, .engagement-card, .tech-group, .why-card, .expertise-item, .solution-card, .job-card, .case-visual, .case-details, .audience-card, .team-card, .insight-card, .pipeline-step, .milestone-item, .photo-band-copy, .light-card, .home-section h2, .home-clients-head p, .home-clients-head .btn-secondary, .home-cap, .home-fact, .home-news-card, .ab-card, .svc, .ab-intro figure, .ab-intro-grid > div, .ab-panel, .ab-team li, .home-cta-grid > *"
    );
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("reveal-in"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    targets.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + "ms";
      ro.observe(el);
    });
  }
});

// Hero animated particle network (free, code-built "video" background)
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector(".hero-canvas");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dots = [];
  const COUNT = 90, LINK = 150;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  function seed() {
    dots = [];
    for (let i = 0; i < COUNT; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.7
      });
    }
  }
  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < dots.length; i++) {
      const p = dots[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      for (let j = i + 1; j < dots.length; j++) {
        const q = dots[j], dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK) {
          ctx.strokeStyle = "rgba(96,165,250," + (0.14 * (1 - d / LINK)).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 6;
    ctx.shadowColor = "#60a5fa";
    ctx.fillStyle = "rgba(120,180,255,0.9)";
    for (const p of dots) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    requestAnimationFrame(frame);
  }
  resize();
  seed();
  frame();
  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => { resize(); seed(); }, 200);
  });
});

// Scroll progress bar
document.addEventListener("DOMContentLoaded", () => {
  const bar = document.getElementById("scrollProgress");
  if (!bar) return;
  const update = () => {
    const st = document.documentElement.scrollTop || document.body.scrollTop;
    const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
});

// Draw-in underlines under section headings (on scroll)
document.addEventListener("DOMContentLoaded", () => {
  const titles = document.querySelectorAll(".section-title, .section-heading");
  if (!titles.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("underline-in"); obs.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  titles.forEach(t => obs.observe(t));
});

// Gentle parallax on the hero network background
document.addEventListener("DOMContentLoaded", () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.querySelector(".hero-canvas");
  if (!canvas) return;
  let ticking = false;
  const apply = () => {
    canvas.style.transform = "translateY(" + (window.scrollY * 0.3) + "px)";
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(apply); ticking = true; }
  }, { passive: true });
});

// Secure static-site forms with inline feedback.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-secure-form]").forEach(form => {
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector("[data-form-status]");
    const defaultLabel = button?.dataset.submitLabel || button?.textContent || "Submit";

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      if (form.elements._honey?.value) return;

      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "Sending…";
      status.className = "form-status is-pending";
      status.textContent = "Sending your message securely…";

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" }
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === "false" || result.success === false) {
          throw new Error(result.message || "Submission failed");
        }

        form.reset();
        status.className = "form-status is-success";
        status.textContent = form.dataset.successMessage || "Thank you — your message has been sent.";
      } catch (error) {
        status.className = "form-status is-error";
        status.textContent =
          "We couldn’t send your message right now. Please email contact@fusiontechdynamics.com.";
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        button.textContent = defaultLabel;
      }
    });
  });
});

// Homepage: full-screen hero slider.
document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const slider = document.getElementById("heroSlider");
  if (!slider) return;

  const slides = [...slider.querySelectorAll(".hs-slide")];
  const dots = [...slider.querySelectorAll(".hs-dot")];
  const pauseButton = slider.querySelector(".hs-pause");
  const moveTime = reduceMotion ? 0 : 900;
  let current = 0;
  let moving = false;
  let timer = null;
  let userPaused = reduceMotion;
  let hovering = false;

  const setHidden = (slide, hidden) => {
    slide.inert = hidden;
    slide.setAttribute("aria-hidden", hidden ? "true" : "false");
  };

  slides.forEach((slide, i) => setHidden(slide, i !== 0));

  const goTo = (next, direction) => {
    if (moving || next === current) return;
    moving = true;
    const from = slides[current];
    const to = slides[next];

    to.style.transform = `translateX(${direction * 100}%)`;
    to.getBoundingClientRect();
    from.classList.add("is-moving");
    to.classList.add("is-moving");
    from.style.transform = `translateX(${direction * -100}%)`;
    to.style.transform = "translateX(0)";
    to.classList.add("is-active");
    setHidden(to, false);
    setHidden(from, true);
    dots[current].classList.remove("is-active");
    dots[next].classList.add("is-active");
    current = next;

    setTimeout(() => {
      from.classList.remove("is-active", "is-moving");
      to.classList.remove("is-moving");
      from.style.transform = "";
      to.style.transform = "";
      moving = false;
    }, moveTime);
  };

  const step = direction => goTo((current + direction + slides.length) % slides.length, direction);

  const stop = () => {
    clearInterval(timer);
    timer = null;
  };

  const start = () => {
    stop();
    if (!userPaused && !hovering && !document.hidden) timer = setInterval(() => step(1), 6000);
  };

  const showPauseState = () => {
    pauseButton.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
    pauseButton.querySelector("i").className = `fas ${userPaused ? "fa-play" : "fa-pause"}`;
  };

  slider.querySelector(".hs-prev").addEventListener("click", () => { step(-1); start(); });
  slider.querySelector(".hs-next").addEventListener("click", () => { step(1); start(); });
  dots.forEach((dot, i) => dot.addEventListener("click", () => { goTo(i, i > current ? 1 : -1); start(); }));
  pauseButton.addEventListener("click", () => {
    userPaused = !userPaused;
    showPauseState();
    start();
  });

  slider.addEventListener("mouseenter", () => { hovering = true; start(); });
  slider.addEventListener("mouseleave", () => { hovering = false; start(); });
  slider.addEventListener("focusin", () => { hovering = true; start(); });
  slider.addEventListener("focusout", () => { hovering = false; start(); });
  document.addEventListener("visibilitychange", start);

  let touchStart = null;
  slider.addEventListener("touchstart", event => { touchStart = event.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", event => {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    touchStart = null;
    if (Math.abs(distance) < 50) return;
    step(distance < 0 ? 1 : -1);
    start();
  }, { passive: true });

  showPauseState();
  start();
});

// Services page: open a section when it is linked to directly.
document.addEventListener("DOMContentLoaded", () => {
  const openFromHash = () => {
    const target = location.hash && document.querySelector(`details.svc${location.hash}`);
    if (!target) return;
    target.open = true;
    target.scrollIntoView({ block: "start", behavior: "instant" });
  };
  document.querySelectorAll(".svc-pills a").forEach(link => {
    link.addEventListener("click", () => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) target.open = true;
    });
  });
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
});
