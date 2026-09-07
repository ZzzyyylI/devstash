/* ===================================================================
   DevStash — homepage prototype
   - navbar opacity on scroll
   - scroll-reveal via IntersectionObserver
   - pricing monthly/yearly toggle
   - chaos-field icon physics (requestAnimationFrame)
   =================================================================== */

(function () {
  "use strict";

  /* ---------- footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- navbar: more opaque on scroll ---------- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- scroll reveal ----------
     Plain scroll check rather than IntersectionObserver: an element that is
     flicked past quickly (or skipped by an in-page anchor jump) still reveals,
     because we only ask "is its top above the fold yet?". */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var revealTicking = false;
  var revealCheck = function () {
    revealTicking = false;
    var trigger = window.innerHeight * 0.92;
    for (var i = revealEls.length - 1; i >= 0; i--) {
      if (revealEls[i].getBoundingClientRect().top < trigger) {
        revealEls[i].classList.add("is-visible");
        revealEls.splice(i, 1);
      }
    }
  };
  var onRevealScroll = function () {
    if (revealTicking) return;
    revealTicking = true;
    requestAnimationFrame(revealCheck);
  };
  revealCheck();
  window.addEventListener("scroll", onRevealScroll, { passive: true });
  window.addEventListener("resize", onRevealScroll, { passive: true });

  /* ---------- pricing toggle ---------- */
  var toggle = document.getElementById("billingToggle");
  var proAmount = document.getElementById("proAmount");
  var proCycle = document.getElementById("proCycle");
  var proPeriod = document.getElementById("proPeriod");
  var PRICES = {
    monthly: { amount: "$8", cycle: "/mo", period: "billed monthly" },
    yearly: { amount: "$72", cycle: "/yr", period: "billed yearly ($6/mo)" }
  };
  if (toggle) {
    toggle.addEventListener("click", function (e) {
      var btn = e.target.closest(".toggle__opt");
      if (!btn) return;
      var period = btn.getAttribute("data-period");
      var conf = PRICES[period];
      if (!conf) return;
      toggle.querySelectorAll(".toggle__opt").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      if (proAmount) proAmount.textContent = conf.amount;
      if (proCycle) proCycle.textContent = conf.cycle;
      if (proPeriod) proPeriod.textContent = conf.period;
    });
  }

  /* ---------- chaos-field physics ---------- */
  var field = document.getElementById("chaosField");
  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (field && !prefersReduced) {
    var icons = Array.prototype.slice.call(
      field.querySelectorAll(".chaos-icon")
    );
    var ICON = 56;
    var mouse = { x: -9999, y: -9999, active: false };
    var bounds = { w: field.clientWidth, h: field.clientHeight };

    var particles = icons.map(function (el, i) {
      return {
        el: el,
        x: Math.random() * Math.max(1, bounds.w - ICON),
        y: Math.random() * Math.max(1, bounds.h - ICON),
        vx: (Math.random() - 0.5) * 0.9,
        vy: (Math.random() - 0.5) * 0.9,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.6
      };
    });

    var measure = function () {
      bounds.w = field.clientWidth;
      bounds.h = field.clientHeight;
    };
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("load", measure);
    requestAnimationFrame(measure);

    field.addEventListener("mousemove", function (e) {
      var rect = field.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    field.addEventListener("mouseleave", function () {
      mouse.active = false;
      mouse.x = mouse.y = -9999;
    });

    var MAX_V = 1.15;
    var REPEL_RADIUS = 122;

    var tick = function (t) {
      var time = t * 0.001;
      // while hovering, damp harder and cap lower so icons ease away slowly
      var damp = mouse.active ? 0.9 : 0.992;
      var cap = mouse.active ? 0.62 : MAX_V;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        // gentle drift wander — keeps a little life when idle
        p.vx += (Math.random() - 0.5) * 0.045;
        p.vy += (Math.random() - 0.5) * 0.045;

        // repel from cursor — soft push, not a shove
        if (mouse.active) {
          var cx = p.x + ICON / 2;
          var cy = p.y + ICON / 2;
          var dx = cx - mouse.x;
          var dy = cy - mouse.y;
          var dist = Math.hypot(dx, dy);
          if (dist < REPEL_RADIUS && dist > 0.01) {
            var force = (1 - dist / REPEL_RADIUS) * 0.42;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // damping + clamp
        p.vx *= damp;
        p.vy *= damp;
        p.vx = Math.max(-cap, Math.min(cap, p.vx));
        p.vy = Math.max(-cap, Math.min(cap, p.vy));

        p.x += p.vx;
        p.y += p.vy;

        // bounce off walls
        var maxX = bounds.w - ICON;
        var maxY = bounds.h - ICON;
        if (p.x <= 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx);
        } else if (p.x >= maxX) {
          p.x = maxX;
          p.vx = -Math.abs(p.vx);
        }
        if (p.y <= 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy);
        } else if (p.y >= maxY) {
          p.y = maxY;
          p.vy = -Math.abs(p.vy);
        }

        // subtle rotation + scale pulse
        var rot = Math.sin(time * 0.8 + p.phase) * 10 + p.spin * 6;
        var scale = 1 + Math.sin(time * 1.4 + p.phase) * 0.06;

        p.el.style.transform =
          "translate(" +
          p.x.toFixed(2) +
          "px," +
          p.y.toFixed(2) +
          "px) rotate(" +
          rot.toFixed(2) +
          "deg) scale(" +
          scale.toFixed(3) +
          ")";
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
})();
