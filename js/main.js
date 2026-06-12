/* ============================================================
   Trytmi — interactions & scroll choreography
   GSAP + ScrollTrigger + Lenis
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (!prefersReduced && typeof Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // Anchor links through Lenis
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: -70 });
      else target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    });
  });

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById("header");
  function onScrollHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobileMenu");
  function closeMenu() {
    burger.classList.remove("is-open");
    menu.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
  }
  burger.addEventListener("click", function () {
    var open = !menu.classList.contains("is-open");
    burger.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  });

  /* ---------- Custom cursor ---------- */
  if (finePointer && !prefersReduced) {
    var cursor = document.getElementById("cursor");
    var dot = document.getElementById("cursorDot");
    var cx = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3.out" });
    var cy = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3.out" });
    var dx = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3.out" });
    var dy = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3.out" });
    window.addEventListener("mousemove", function (e) {
      cx(e.clientX); cy(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.querySelectorAll("a, button, .module-card, .pillar").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("is-active"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("is-active"); });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll("[data-magnetic]").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener("mouseleave", function () { xTo(0); yTo(0); });
    });
  }

  /* ---------- Pillar hover glow follows mouse ---------- */
  if (finePointer) {
    document.querySelectorAll(".pillar").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Marquee: duplicate group + infinite tween ---------- */
  var marqueeTrack = document.getElementById("marqueeTrack");
  var group = marqueeTrack.querySelector(".marquee__group");
  for (var i = 0; i < 3; i++) {
    var clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    marqueeTrack.appendChild(clone);
  }
  if (!prefersReduced) {
    gsap.to(marqueeTrack, {
      x: function () { return -group.offsetWidth; },
      duration: 22,
      ease: "none",
      repeat: -1,
      modifiers: {
        x: function (x) { return (parseFloat(x) % group.offsetWidth) + "px"; }
      }
    });
  }

  /* ---------- Manifesto word-by-word scrub ---------- */
  var manifesto = document.getElementById("manifestoText");
  (function splitWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
        var span = document.createElement("span");
        span.className = "word";
        span.textContent = part;
        frag.appendChild(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
  })(manifesto);

  if (!prefersReduced) {
    gsap.to(manifesto.querySelectorAll(".word"), {
      opacity: 1,
      stagger: 0.06,
      ease: "none",
      scrollTrigger: {
        trigger: manifesto,
        start: "top 80%",
        end: "bottom 45%",
        scrub: 0.6
      }
    });
  } else {
    gsap.set(manifesto.querySelectorAll(".word"), { opacity: 1 });
  }

  /* ---------- Generic reveals ---------- */
  if (!prefersReduced) {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 34 },
        {
          opacity: 1, y: 0,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" }
        });
    });

    gsap.utils.toArray("[data-pillar]").forEach(function (card, idx) {
      gsap.fromTo(card,
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0,
          duration: 1,
          delay: (idx % 2) * 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 90%" }
        });
    });
  } else {
    gsap.set("[data-reveal], [data-pillar]", { opacity: 1, y: 0 });
  }

  /* ---------- Stat counters ---------- */
  document.querySelectorAll("[data-stat]").forEach(function (stat) {
    var numEl = stat.querySelector("[data-count]");
    var target = parseFloat(numEl.getAttribute("data-count"));
    var decimals = parseInt(numEl.getAttribute("data-decimals") || "0", 10);
    if (prefersReduced) {
      numEl.textContent = target.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      return;
    }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: { trigger: stat, start: "top 88%" },
      onUpdate: function () {
        numEl.textContent = obj.v.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      }
    });
  });

  /* ---------- Modules: pinned horizontal scroll (desktop only) ---------- */
  var mm = gsap.matchMedia();
  mm.add("(min-width: 769px) and (prefers-reduced-motion: no-preference)", function () {
    var track = document.getElementById("modulesTrack");
    var pin = document.getElementById("modulesPin");
    var getDistance = function () {
      return Math.max(0, track.scrollWidth - document.documentElement.clientWidth + 80);
    };
    var tween = gsap.to(track, {
      x: function () { return -getDistance(); },
      ease: "none",
      scrollTrigger: {
        trigger: pin,
        start: "top top",
        end: function () { return "+=" + getDistance(); },
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });
    return function () { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); };
  });

  /* ---------- CTA: ECG line draw + title lines ---------- */
  if (!prefersReduced) {
    gsap.to(".cta__ecg-path", {
      strokeDashoffset: 0,
      duration: 2.4,
      ease: "power2.inOut",
      scrollTrigger: { trigger: ".cta", start: "top 75%" }
    });
    gsap.utils.toArray(".cta__line").forEach(function (line, idx) {
      gsap.fromTo(line,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.1,
          delay: idx * 0.1,
          ease: "power4.out",
          scrollTrigger: { trigger: ".cta", start: "top 78%" }
        });
    });
  }

  /* ---------- Preloader → hero intro ---------- */
  var preloader = document.getElementById("preloader");
  var countEl = document.getElementById("preloaderCount");

  function heroIntro() {
    if (prefersReduced) {
      gsap.set(".hero__line-inner", { y: 0, yPercent: 0 });
      gsap.set(".hero [data-reveal], .hero__meta", { opacity: 1, y: 0 });
      return;
    }
    var tl = gsap.timeline();
    tl.to(".hero__line-inner", {
      yPercent: 0,
      duration: 1.25,
      ease: "power4.out",
      stagger: 0.12
    }, 0.1);
    // hero reveals are handled by ScrollTrigger fromTo above; nudge a refresh
    ScrollTrigger.refresh();
  }

  // initial hero title state — y:0 clears the px offset GSAP parses
  // from the stylesheet's translateY(110%) fallback, so only the
  // yPercent channel remains in play for the intro tween
  gsap.set(".hero__line-inner", { y: 0, yPercent: prefersReduced ? 0 : 110 });

  function hidePreloader() {
    var tl = gsap.timeline({
      onComplete: function () {
        preloader.style.display = "none";
        heroIntro();
      }
    });
    if (prefersReduced) {
      preloader.style.display = "none";
      heroIntro();
      return;
    }
    tl.to(".preloader__inner", { opacity: 0, y: -24, duration: 0.5, ease: "power2.in" })
      .to(preloader, { yPercent: -100, duration: 0.8, ease: "power4.inOut" }, "-=0.1");
  }

  if (prefersReduced) {
    hidePreloader();
  } else {
    var counter = { v: 0 };
    gsap.to(counter, {
      v: 100,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: function () {
        countEl.textContent = String(Math.round(counter.v)).padStart(2, "0");
      },
      onComplete: hidePreloader
    });
  }

  // Safety net: never trap the user behind the preloader
  setTimeout(function () {
    if (preloader.style.display !== "none") hidePreloader();
  }, 4000);

  /* ---------- Recalc on load (fonts/layout settle) ---------- */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
