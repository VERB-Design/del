/* Hotel del Coronado — site JS
   Keep it lean and progressive: everything degrades without JS. */
(function () {
  "use strict";

  /* ---- Placeholder links: a stray tap on an unwired "#" link must never
     scroll-jump the page and reset the experience ---- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });

  /* ---- Breakpoint refresh: the JS-gated systems (hlock pin, forever-
     carousel clones, mobile arrows) are wired for the device class present
     at load. If a browser window is resized across a breakpoint, reload
     once so the right wiring appears. Width-only, so mobile URL-bar
     show/hide (height changes) never triggers it. ---- */
  var bpClass = function () {
    var w = window.innerWidth;
    return w <= 480 ? "phone" : w <= 900 ? "tablet" : "desktop";
  };
  var bpAtLoad = bpClass(), bpTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(bpTimer);
    bpTimer = window.setTimeout(function () {
      if (bpClass() !== bpAtLoad) window.location.reload();
    }, 250);
  });

  /* ---- Menu bar: condenses to a white fixed nav on scroll ---- */
  var menuBar = document.querySelector(".menu-bar");
  if (menuBar) {
    var onMenuScroll = function () {
      menuBar.classList.toggle("is-condensed", window.scrollY > 120);
    };
    onMenuScroll();
    window.addEventListener("scroll", onMenuScroll, { passive: true });
  }

  /* ---- Menu overlay (Figma 4106): rail + panels + drill-down ---- */
  var mOverlay = document.querySelector("[data-menu]");
  var mToggle = document.querySelector(".menu-toggle");
  if (mOverlay && mToggle) {
    var mClose = mOverlay.querySelector("[data-menu-close]");
    var mRailItems = [].slice.call(mOverlay.querySelectorAll(".menu-rail__item[data-panel]"));
    var mPanels = [].slice.call(mOverlay.querySelectorAll("[data-panel-view]"));
    var mView = "default";

    var mShow = function (name) {
      mView = name;
      mPanels.forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-panel-view") === name);
      });
      /* rail highlight: sub-panels highlight their parent */
      var sub = mOverlay.querySelector('[data-panel-view="' + name + '"]');
      var railName = (sub && sub.getAttribute("data-parent")) || name;
      mRailItems.forEach(function (b) {
        var on = b.getAttribute("data-panel") === railName;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-expanded", on ? "true" : "false");
      });
      mOverlay.classList.toggle("has-panel", name !== "default");
    };

    var mOpen = function () {
      mOverlay.classList.add("is-open");
      mOverlay.removeAttribute("aria-hidden");
      document.body.classList.add("menu-open");
      mToggle.setAttribute("aria-expanded", "true");
      mShow("default");
      if (mClose) mClose.focus();
    };
    var mCloseFn = function () {
      mOverlay.classList.remove("is-open");
      mOverlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-open");
      mToggle.setAttribute("aria-expanded", "false");
      mToggle.focus();
    };

    mToggle.addEventListener("click", mOpen);
    if (mClose) mClose.addEventListener("click", mCloseFn);

    mRailItems.forEach(function (b) {
      b.addEventListener("click", function () { mShow(b.getAttribute("data-panel")); });
    });
    /* drill-down cards + back links */
    mOverlay.addEventListener("click", function (e) {
      var drill = e.target.closest("[data-drill]");
      if (drill) { e.preventDefault(); mShow(drill.getAttribute("data-drill")); return; }
      var back = e.target.closest("[data-menu-back]");
      if (back) {
        var panel = back.closest("[data-panel-view]");
        var parent = panel && panel.getAttribute("data-parent");
        mShow(parent || "default");
        return;
      }
      var closeLink = e.target.closest("[data-menu-close-link]");
      if (closeLink) mCloseFn();
    });

    /* Esc + focus trap */
    mOverlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { mCloseFn(); return; }
      if (e.key !== "Tab") return;
      var f = [].slice.call(mOverlay.querySelectorAll(
        'a[href], button:not([disabled])')).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* mobile: give top-level panels a back-to-menu control */
    mPanels.forEach(function (p) {
      var name = p.getAttribute("data-panel-view");
      if (name === "default" || p.querySelector("[data-menu-back]")) return;
      var b = document.createElement("button");
      b.className = "menu-panel__back menu-panel__back--mobile";
      b.setAttribute("data-menu-back", "");
      b.textContent = "Back";
      p.insertBefore(b, p.firstChild);
    });
  }

  /* ---- Showcase title: drifts down at 1/4 scroll speed and fades ---- */
  var showTitle = document.querySelector(".showcase__title");
  var prefersReducedST = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (showTitle && !prefersReducedST) {
    showTitle.style.willChange = "transform, opacity";
    var stTicking = false;
    var stApply = function () {
      var y = window.scrollY;
      var fade = Math.min(Math.max(1 - y / (window.innerHeight * 0.55), 0), 1);
      showTitle.style.transform = "translateY(" + (y * 0.25) + "px)";
      showTitle.style.opacity = fade;
      stTicking = false;
    };
    window.addEventListener("scroll", function () {
      if (!stTicking) { window.requestAnimationFrame(stApply); stTicking = true; }
    }, { passive: true });
    stApply();
  }

  /* ---- Curtain reveal: panel lifts as the stage scrolls through ---- */
  var stage = document.querySelector("[data-stage]");
  var curtain = document.querySelector("[data-curtain]");
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (stage && curtain && !prefersReduced) {
    var media = curtain.querySelector(".curtain__media img");
    var reveal = stage.querySelector(".reveal");
    document.documentElement.classList.add("is-curtain");
    /* the lift's travel = the reveal's natural height: the curtain stops when
       its bottom edge meets the reveal's top, then everything scrolls as one */
    var liftBudget = 0;
    /* pin geometry: desktop = 90svh stuck at 10svh; ≤480 = full viewport */
    var pinFrac = function () {
      return window.matchMedia("(max-width: 480px)").matches
        ? { top: 0, h: 1 } : { top: 0.1, h: 0.9 };
    };
    var sizeStage = function () {
      var f = pinFrac();
      liftBudget = Math.min(reveal.offsetHeight, window.innerHeight * f.h);
      /* lift runs stick -> release exactly */
      stage.style.height = (window.innerHeight * f.h + liftBudget) + "px";
    };
    var ticking = false;
    var applyCurtain = function () {
      var vh = window.innerHeight;
      var f = pinFrac();
      var top = stage.getBoundingClientRect().top;
      /* 1:1 lift, capped at the budget */
      var p = liftBudget > 0 ? Math.min(Math.max((vh * f.top - top) / liftBudget, 0), 1) : 1;
      var lift = p * liftBudget;
      curtain.style.transform = "translateY(" + (-lift) + "px)";
      /* parallax runs the full journey: panel entering → lift complete */
      if (media) {
        var g = Math.min(Math.max((vh - top) / (vh * f.h + liftBudget), 0), 1);
        media.style.transform = "translateY(" + ((g * 2 - 1) * 0.07 * vh) + "px)";
      }
      curtain.style.pointerEvents = p >= 1 ? "none" : "";
      ticking = false;
    };
    var onCurtainScroll = function () {
      if (!ticking) { window.requestAnimationFrame(applyCurtain); ticking = true; }
    };
    sizeStage(); applyCurtain();
    window.addEventListener("scroll", onCurtainScroll, { passive: true });
    window.addEventListener("resize", function () { sizeStage(); applyCurtain(); });
    window.addEventListener("load", function () { sizeStage(); applyCurtain(); });
  }

  /* ---- Horizontal lock: vertical scroll pans the track while pinned ----
     Desktop only: on mobile the track is a native swipe carousel */
  var hlock = document.querySelector("[data-hlock]");
  if (hlock && !prefersReduced && window.matchMedia("(min-width: 901px)").matches) {
    var hpin = hlock.querySelector(".hlock__pin");
    var htrack = hlock.querySelector(".hlock__track");
    document.documentElement.classList.add("is-hlock");
    /* pan runs 30% slower than scroll (scroll budget = dist / 0.7) and has
       10% dead zones at each end of the pin so the takeover eases in/out */
    var H_SPEED = 0.7, H_PAD = 0.1;
    var hDist = 0, hBudget = 0;
    var hMeasure = function () {
      /* pan distance from the last card's true right edge + a 4% end
         gutter mirroring the front (scrollWidth drops trailing padding) */
      var cards = htrack.children;
      var last = cards[cards.length - 1].getBoundingClientRect();
      var trackLeft = htrack.getBoundingClientRect().left;
      var contentW = (last.right - trackLeft) + window.innerWidth * 0.04;
      hDist = Math.max(contentW - window.innerWidth, 0);
      hBudget = hDist / H_SPEED / (1 - 2 * H_PAD);
      hlock.style.height = (window.innerHeight + hBudget) + "px";
    };
    var hTicking = false;
    var hApply = function () {
      var raw = hBudget > 0 ? Math.min(Math.max(-hlock.getBoundingClientRect().top / hBudget, 0), 1) : 0;
      var p = Math.min(Math.max((raw - H_PAD) / (1 - 2 * H_PAD), 0), 1);
      htrack.style.transform = "translateX(" + (-p * hDist) + "px)";
      hTicking = false;
    };
    var onHScroll = function () {
      if (!hTicking) { window.requestAnimationFrame(hApply); hTicking = true; }
    };
    hMeasure(); hApply();
    window.addEventListener("scroll", onHScroll, { passive: true });
    window.addEventListener("resize", function () { hMeasure(); hApply(); });
    window.addEventListener("load", function () { hMeasure(); hApply(); });
  }

  /* ---- Forever carousels: clone the card set so the track loops ----
     Same pattern as the seasonal carousel below: three congruent copies,
     position normalized to the middle copy, so a wrap is an invisible
     jump of exactly one set-width. Gated to the widths where each track
     actually behaves as a carousel (desktop grids/pans stay untouched). */
  var foreverApis = {};
  [
    { sel: ".neighborhoods", mq: "(max-width: 900px)" },
    { sel: ".hlock__track", mq: "(max-width: 900px)" },
    { sel: ".offers", mq: "(max-width: 480px)" }
  ].forEach(function (def) {
    if (!window.matchMedia(def.mq).matches) return;
    var track = document.querySelector(def.sel);
    if (!track || track.children.length < 2) return;
    var originals = [].slice.call(track.children);
    var count = originals.length;
    for (var fc = 0; fc < 2; fc++) {
      originals.forEach(function (el) {
        var k = el.cloneNode(true);
        k.setAttribute("aria-hidden", "true");
        k.tabIndex = -1;
        k.removeAttribute("data-reveal");
        track.appendChild(k);
      });
    }
    /* a wrap must never land on an unloaded frame */
    [].forEach.call(track.querySelectorAll("img"), function (img) { img.loading = "eager"; });
    var cards = track.children;
    var setW = function () {
      return cards[count].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    };
    var norm = function () {
      var w = setW();
      if (!w) return;
      if (track.scrollLeft < w * 0.5) track.scrollLeft += w;
      else if (track.scrollLeft >= w * 1.5) track.scrollLeft -= w;
    };
    var anim = null, wd = null;
    var go = function (dir) {
      var card = cards[0];
      var gap = parseFloat(getComputedStyle(track).columnGap) || 16;
      var step = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      norm(); /* start from the middle copy so the glide never meets an edge */
      var target = Math.round((track.scrollLeft + dir * step) / step) * step;
      if (prefersReduced) { track.scrollLeft = target; norm(); return; }
      if (anim) window.cancelAnimationFrame(anim);
      /* a rapid re-tap must also disarm the previous watchdog, or it fires
         mid-glide and teleports the track to the stale target (visible flick) */
      if (wd) { window.clearTimeout(wd); wd = null; }
      track.style.scrollSnapType = "none";
      var from = track.scrollLeft, delta = target - from, t0 = null, DUR = 900;
      var done = false;
      var settle = function () { track.style.scrollSnapType = ""; anim = null; norm(); };
      var ease = function (t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; };
      var frame = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / DUR, 1);
        track.scrollLeft = from + delta * ease(p);
        if (p < 1) anim = window.requestAnimationFrame(frame);
        else { done = true; settle(); }
      };
      anim = window.requestAnimationFrame(frame);
      wd = window.setTimeout(function () {
        wd = null;
        if (!done) {
          if (anim) window.cancelAnimationFrame(anim);
          track.scrollLeft = target; done = true; settle();
        }
      }, DUR + 250);
    };
    /* swipe/momentum (tablet widths) stays in the middle copy too */
    track.addEventListener("scroll", function () { if (!anim) norm(); }, { passive: true });
    track.scrollLeft = setW();
    window.addEventListener("load", function () { track.scrollLeft = setW(); });
    foreverApis[def.sel] = { go: go };
  });

  /* ---- Seasonal carousel arrows ---- */
  var sTrack = document.querySelector("[data-scarousel]");
  var sPrev = document.querySelector("[data-scarousel-prev]");
  var sNext = document.querySelector("[data-scarousel-next]");
  if (sTrack && sPrev && sNext) {
    /* Forever scroll: three congruent copies of the card set live in the
       track; the position stays normalized to the middle copy, so a wrap
       is an invisible jump of exactly one set-width. */
    var sOriginals = [].slice.call(sTrack.children);
    var sCount = sOriginals.length;
    for (var sc = 0; sc < 2; sc++) {
      sOriginals.forEach(function (el) {
        var k = el.cloneNode(true);
        k.setAttribute("aria-hidden", "true");
        k.tabIndex = -1;
        k.removeAttribute("data-reveal");
        sTrack.appendChild(k);
      });
    }
    /* eager-load every track image (5 unique URLs shared across copies)
       so a wrap in either direction never lands on an unloaded frame */
    [].forEach.call(sTrack.querySelectorAll("img"), function (img) {
      img.loading = "eager";
    });
    var sCards = sTrack.children;
    /* fractional (getBoundingClientRect) — offsetLeft rounds, and a
       rounded wrap width shows as a pixel jitter at every loop */
    var setW = function () {
      return sCards[sCount].getBoundingClientRect().left - sCards[0].getBoundingClientRect().left;
    };
    var sStep = function () {
      var card = sCards[0];
      return card ? card.getBoundingClientRect().width + 16 : sTrack.clientWidth * 0.8;
    };
    var sNorm = function () {
      var w = setW();
      if (!w) return;
      if (sTrack.scrollLeft < w * 0.5) sTrack.scrollLeft += w;
      else if (sTrack.scrollLeft >= w * 1.5) sTrack.scrollLeft -= w;
    };
    /* element-level smooth scrollBy is unreliable here; tween it ourselves */
    var sAnim = null, sWd = null;
    var sGo = function (dir) {
      var step = sStep();
      /* aim for the next card boundary in the travel direction */
      var target = Math.round((sTrack.scrollLeft + dir * step) / step) * step;
      if (prefersReduced) { sTrack.scrollLeft = target; sNorm(); return; }
      if (sAnim) window.cancelAnimationFrame(sAnim);
      /* disarm the previous tap's watchdog — a stale one firing mid-glide
         teleports the track to the old target (visible flick) */
      if (sWd) { window.clearTimeout(sWd); sWd = null; }
      /* suspend snap while tweening — programmatic scrollLeft sets on a
         snap container get snapped instantly, collapsing the glide */
      sTrack.style.scrollSnapType = "none";
      var from = sTrack.scrollLeft, delta = target - from, t0 = null, DUR = 900;
      var done = false;
      var settle = function () { sTrack.style.scrollSnapType = ""; sNorm(); };
      /* ease-in-out for a silky glide (matches the site's --ease feel) */
      var ease = function (t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; };
      var frame = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / DUR, 1);
        sTrack.scrollLeft = from + delta * ease(p);
        if (p < 1) sAnim = window.requestAnimationFrame(frame);
        else { sAnim = null; done = true; settle(); }
      };
      sAnim = window.requestAnimationFrame(frame);
      /* rAF and scroll events are frozen in throttled/occluded tabs —
         guarantee arrival and state refresh */
      sWd = window.setTimeout(function () {
        sWd = null;
        if (!done) {
          if (sAnim) { window.cancelAnimationFrame(sAnim); sAnim = null; }
          sTrack.scrollLeft = target; done = true;
          settle();
        }
      }, DUR + 250);
    };
    sPrev.addEventListener("click", function () { sGo(-1); });
    sNext.addEventListener("click", function () { sGo(1); });
    /* keep touch/momentum scrolling in the middle copy too */
    sTrack.addEventListener("scroll", function () { if (!sAnim) sNorm(); }, { passive: true });
    /* start on the middle copy */
    sTrack.scrollLeft = setW();
  }

  /* ---- Stay Finder: 3 questions -> one of the five neighborhoods ---- */
  var quizEl = document.querySelector("[data-quiz]");
  var quizOpenBtn = document.querySelector("[data-quiz-open]");
  if (quizEl && quizOpenBtn && curtain) {
    var quizBody = quizEl.querySelector("[data-quiz-body]");
    var quizCloseBtn = quizEl.querySelector("[data-quiz-close]");
    var NBH = {
      victorian: { name: "The Victorian", feel: "Historic & Romantic", video: "assets/img/the_victorian.mp4",
        why: "Red turrets, storied halls, and dinners that feel like occasions — the classic Del was made for you." },
      cabanas: { name: "The Cabanas", feel: "Relaxed & Residential", video: "assets/img/cabanas.mp4",
        why: "Poolside energy, golden-hour cocktails, and the liveliest corner of the shore." },
      shore: { name: "Shore House", feel: "Vibrant & Playful", video: "assets/img/shore-house.mp4",
        why: "Space to spread out, sand at the doorstep, and room for everyone you love." },
      views: { name: "The Views", feel: "Peaceful & Restorative", video: "assets/img/views.mp4",
        why: "Quiet mornings and an endless horizon — the Del at its most restorative." },
      village: { name: "Beach Village", feel: "Exclusive & Residential", video: "assets/img/Beach-Village.mp4",
        why: "Your own stretch of shoreline — private, polished, unhurried." }
    };
    var QUIZ = [
      { q: "Who\u2019s coming along?", opts: [
        { label: "Just the two of us", img: "assets/img/6.webp", w: { victorian: 2, views: 1 } },
        { label: "The whole family", img: "assets/img/13.webp", w: { shore: 2, village: 1 } },
        { label: "Friends & celebrations", img: "assets/img/9.webp", w: { cabanas: 2, shore: 1 } },
        { label: "Flying solo", img: "assets/img/17.webp", w: { views: 2, victorian: 1 } } ] },
      { q: "What\u2019s your pace?", opts: [
        { label: "Slow mornings & spa days", img: "assets/img/12.webp", w: { views: 2, victorian: 1 } },
        { label: "Sun, surf & pool days", img: "assets/img/1.webp", w: { cabanas: 2, shore: 1 } },
        { label: "Private beach time", img: "assets/img/16.webp", w: { village: 2, views: 1 } },
        { label: "Out and about, always", img: "assets/img/2.webp", w: { victorian: 2, cabanas: 1 } } ] },
      { q: "Your perfect evening looks like\u2026", opts: [
        { label: "Candlelit dinner for two", img: "assets/img/4.webp", w: { victorian: 2, village: 1 } },
        { label: "S\u2019mores with the kids", img: "assets/img/roast.avif", w: { shore: 2, cabanas: 1 } },
        { label: "Cocktails & live music", img: "assets/img/11.webp", w: { cabanas: 2 } },
        { label: "Quiet balcony, ocean air", img: "assets/img/15.webp", w: { views: 2, village: 1 } } ] }
    ];
    var quizStep = 0, quizPicks = [];

    var esc = function (s) { return s; }; /* trusted local strings */
    var clearQuizBg = function (instant) {
      var bg = quizEl.querySelector(".stay-quiz__bgvideo");
      if (!bg) return;
      if (instant) { bg.remove(); return; }
      bg.classList.remove("is-on");           /* fade the video back to the image */
      window.setTimeout(function () { bg.remove(); }, 950);
    };
    /* crossfade with a gentle drift + soft blur between states */
    var quizSwap = function (renderFn) {
      quizBody.classList.add("sq-anim-out");
      window.setTimeout(function () {
        renderFn();
        quizBody.classList.add("sq-anim-prep");
        quizBody.classList.remove("sq-anim-out");
        void quizBody.offsetHeight; /* commit the prep state */
        quizBody.classList.remove("sq-anim-prep");
      }, 280);
    };
    var renderStep = function () {
      clearQuizBg();
      var step = QUIZ[quizStep];
      var html = '<p class="stay-quiz__eyebrow">Find your perfect stay \u2014 ' + (quizStep + 1) + ' of ' + QUIZ.length + '</p>' +
        '<h4 class="stay-quiz__q">' + esc(step.q) + '</h4>' +
        '<div class="stay-quiz__opts">' +
        step.opts.map(function (o, i) {
          return '<button class="stay-quiz__opt" data-opt="' + i + '">' +
            '<span class="stay-quiz__opt-media"><img src="' + o.img + '" alt=""></span>' +
            '<span class="stay-quiz__opt-label">' + esc(o.label) + '</span></button>';
        }).join("") + '</div>' +
        '<button class="stay-quiz__back" data-quiz-back' + (quizStep === 0 ? ' style="visibility:hidden" tabindex="-1" aria-hidden="true"' : '') + '>Back</button>';
      quizBody.innerHTML = html;
      var first = quizBody.querySelector(".stay-quiz__opt");
      if (first) first.focus({ preventScroll: true });
    };
    var renderResult = function () {
      var scores = {};
      quizPicks.forEach(function (optIdx, stepIdx) {
        var w = QUIZ[stepIdx].opts[optIdx].w;
        Object.keys(w).forEach(function (k) { scores[k] = (scores[k] || 0) + w[k]; });
      });
      var order = ["victorian", "cabanas", "shore", "views", "village"];
      var best = order[0];
      order.forEach(function (k) { if ((scores[k] || 0) > (scores[best] || 0)) best = k; });
      var n = NBH[best];
      quizBody.innerHTML =
        '<p class="stay-quiz__result-eyebrow">Your Del match</p>' +
        '<h4 class="stay-quiz__name">' + n.name + '</h4>' +
        '<p class="stay-quiz__feel">' + n.feel + '</p>' +
        '<p class="stay-quiz__why">' + n.why + '</p>' +
        '<div class="stay-quiz__actions">' +
        '<a class="stay-quiz__explore link-lined" href="#">Explore ' + n.name + '</a>' +
        '<button class="stay-quiz__retake" data-quiz-retake>Retake</button></div>';
      /* the frame becomes the neighborhood */
      var bg = document.createElement("div");
      bg.className = "stay-quiz__bgvideo";
      bg.innerHTML = '<video autoplay muted loop playsinline src="' + n.video + '"></video>';
      quizEl.insertBefore(bg, quizEl.firstChild);
      window.setTimeout(function () { bg.classList.add("is-on"); }, 30);
    };

    var quizOpen = function (e) {
      if (e) e.preventDefault();
      quizStep = 0; quizPicks = [];
      quizEl.hidden = false;
      window.setTimeout(function () { curtain.classList.add("quiz-open"); }, 20);
      document.body.classList.add("menu-open"); /* hold the page still mid-quiz */
      renderStep();
      /* the opening question rises in like every other step */
      quizBody.classList.add("sq-anim-prep");
      window.setTimeout(function () {
        void quizBody.offsetHeight;
        quizBody.classList.remove("sq-anim-prep");
      }, 80);
    };
    var quizClose = function () {
      curtain.classList.remove("quiz-open");
      document.body.classList.remove("menu-open");
      window.setTimeout(function () { quizEl.hidden = true; quizBody.innerHTML = ""; clearQuizBg(true); }, 500);
      quizOpenBtn.focus();
    };

    quizOpenBtn.addEventListener("click", quizOpen);
    quizCloseBtn.addEventListener("click", quizClose);
    quizEl.addEventListener("keydown", function (e) { if (e.key === "Escape") quizClose(); });
    quizBody.addEventListener("click", function (e) {
      var opt = e.target.closest("[data-opt]");
      if (opt) {
        quizPicks[quizStep] = +opt.getAttribute("data-opt");
        if (quizStep < QUIZ.length - 1) { quizStep++; quizSwap(renderStep); }
        else quizSwap(renderResult);
        return;
      }
      if (e.target.closest("[data-quiz-back]")) { quizStep--; quizSwap(renderStep); return; }
      if (e.target.closest("[data-quiz-retake]")) { quizStep = 0; quizPicks = []; quizSwap(renderStep); }
    });
  }

  /* ---- Neighborhood videos: preload nothing; hover to play on desktop,
          tap to preview on touch (second tap follows the link) ---- */
  var nbhCards = document.querySelectorAll(".nbh");
  if (nbhCards.length && !prefersReduced) {
    var touchMode = window.matchMedia("(hover: none)").matches;
    var nbhPlayers = [];
    nbhCards.forEach(function (card) {
      var media = card.querySelector(".nbh__media");
      var video = card.querySelector(".nbh__video");
      if (!media || !video) return;
      var wantPlay = false;
      var start = function () {
        wantPlay = true;
        media.classList.add("is-playing");
        var p = video.play();                       /* first play() triggers the load */
        if (p && p.catch) p.catch(function () {
          /* interrupted mid-load (enter→leave race) — retry only if still wanted */
          if (wantPlay) { try { video.play().catch(function () {}); } catch (e) {} }
        });
      };
      var stop = function () {
        wantPlay = false;
        media.classList.remove("is-playing");
        video.pause();
      };
      var player = { start: start, stop: stop, isOn: function () { return wantPlay; } };
      nbhPlayers.push(player);

      if (touchMode) {
        /* first tap previews (and stops any other preview); second tap navigates */
        card.addEventListener("click", function (e) {
          if (!player.isOn()) {
            e.preventDefault();
            nbhPlayers.forEach(function (pl) { if (pl !== player) pl.stop(); });
            start();
          }
        });
      } else {
        card.addEventListener("mouseenter", start);
        card.addEventListener("mouseleave", stop);
      }
      card.addEventListener("focusin", start);      /* keyboard parity */
      card.addEventListener("focusout", stop);
    });
  }

  /* ---- Hover stroke: two 1px red lines draw from the top-left corner —
          one right-then-down, one down-then-right — meeting at bottom-right.
          Cards: on the media. Offers: on the full card. ---- */
  var strokeHosts = document.querySelectorAll(".nbh__media, .hcard__media, .scard__media, .offer, .menu-card__media");
  if (strokeHosts.length) {
    var SVGNS = "http://www.w3.org/2000/svg";
    var buildStroke = function (el) {
      var svg = el.querySelector(":scope > .draw-svg");
      if (!svg) {
        svg = document.createElementNS(SVGNS, "svg");
        svg.setAttribute("class", "draw-svg");
        svg.setAttribute("aria-hidden", "true");
        svg.appendChild(document.createElementNS(SVGNS, "path"));
        svg.appendChild(document.createElementNS(SVGNS, "path"));
        el.appendChild(svg);
      }
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      var inset = 0.5;
      var r = Math.max((parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0) - inset, 0);
      var x0 = inset, y0 = inset, x1 = w - inset, y1 = h - inset;
      var paths = svg.querySelectorAll("path");
      /* right-then-down: top edge → TR arc → right edge → BR arc */
      paths[0].setAttribute("d",
        "M" + (x0 + r) + "," + y0 + " H" + (x1 - r) +
        " A" + r + "," + r + " 0 0 1 " + x1 + "," + (y0 + r) +
        " V" + (y1 - r) +
        " A" + r + "," + r + " 0 0 1 " + (x1 - r) + "," + y1);
      /* down-then-right: TL arc → left edge → BL arc → bottom edge */
      paths[1].setAttribute("d",
        "M" + (x0 + r) + "," + y0 +
        " A" + r + "," + r + " 0 0 0 " + x0 + "," + (y0 + r) +
        " V" + (y1 - r) +
        " A" + r + "," + r + " 0 0 0 " + (x0 + r) + "," + y1 +
        " H" + (x1 - r));
      paths[0].setAttribute("pathLength", "1");
      paths[1].setAttribute("pathLength", "1");
      svg.setAttribute("width", w); svg.setAttribute("height", h);
    };
    var buildAll = function () { strokeHosts.forEach(buildStroke); };
    buildAll();
    window.addEventListener("resize", buildAll);
    window.addEventListener("load", buildAll);
  }

  /* ---- Story quote: image parallax + in-frame dim & text fade-up ---- */
  var quote = document.querySelector(".quote");
  if (quote) {
    document.documentElement.classList.add("js-quote");
    var qImg = quote.querySelector(".quote__media img");
    /* dim + fade once the section is meaningfully in frame */
    if ("IntersectionObserver" in window) {
      var qIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            quote.classList.add("is-read");           /* comes on… and stays */
          } else if (en.boundingClientRect.top > 0) {
            quote.classList.remove("is-read");        /* …unless scrolled back above it */
          }
        });
      }, { threshold: 0.85 });
      qIO.observe(quote);
    } else {
      quote.classList.add("is-read");
    }
    /* gentle parallax on the image while the section crosses the viewport */
    if (qImg && !prefersReduced) {
      var qTicking = false;
      var qApply = function () {
        var r = quote.getBoundingClientRect();
        var vh = window.innerHeight;
        if (r.bottom > 0 && r.top < vh) {
          /* -1 → 1 as the section's centre crosses the viewport centre */
          var t = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2);
          qImg.style.transform = "translateY(" + (t * -6) + "%)";
        }
        qTicking = false;
      };
      window.addEventListener("scroll", function () {
        if (!qTicking) { window.requestAnimationFrame(qApply); qTicking = true; }
      }, { passive: true });
      qApply();
    }
  }

  /* ---- Our Story: full-screen local video with custom controls ---- */
  var qWatch = document.querySelector("[data-watch-video]");
  var qLayer = document.querySelector("[data-video-layer]");
  if (qWatch && qLayer && quote) {
    var qFrame = qLayer.querySelector("[data-video-frame]");
    var qCloseBtn = qLayer.querySelector("[data-video-close]");
    var vpPlay = qLayer.querySelector("[data-vp-play]");
    var vpScrub = qLayer.querySelector("[data-vp-scrub]");
    var vpTime = qLayer.querySelector("[data-vp-time]");
    var vpVideo = null, vpScrubbing = false;

    var fmt = function (sec) {
      sec = Math.max(0, Math.floor(sec || 0));
      return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2);
    };
    var vpSync = function () {
      if (!vpVideo) return;
      var d = vpVideo.duration || 0, t = vpVideo.currentTime || 0;
      if (!vpScrubbing && d > 0) vpScrub.value = (t / d) * 100;
      vpTime.textContent = fmt(t) + " / " + fmt(d);
    };

    var openVideo = function () {
      qLayer.hidden = false;
      window.setTimeout(function () { quote.classList.add("is-video"); }, 20);
      vpVideo = document.createElement("video");
      vpVideo.src = "assets/img/del-coronado-overview.mp4";
      vpVideo.autoplay = true; vpVideo.playsInline = true;
      qFrame.innerHTML = ""; qFrame.appendChild(vpVideo);
      vpVideo.addEventListener("timeupdate", vpSync);
      vpVideo.addEventListener("loadedmetadata", vpSync);
      vpVideo.addEventListener("play", function () { vpPlay.classList.remove("is-paused"); vpPlay.setAttribute("aria-label", "Pause"); });
      vpVideo.addEventListener("pause", function () { vpPlay.classList.add("is-paused"); vpPlay.setAttribute("aria-label", "Play"); });
      /* start on the play glyph; the play event flips it — keeps the
         button honest if the browser blocks autoplay */
      vpPlay.classList.add("is-paused");
      var vpKick = vpVideo.play();
      if (vpKick && vpKick.catch) vpKick.catch(function () {});
      qCloseBtn.focus();
    };
    var closeVideo = function () {
      quote.classList.remove("is-video");
      if (vpVideo) { vpVideo.pause(); vpVideo = null; }
      qFrame.innerHTML = "";
      window.setTimeout(function () { qLayer.hidden = true; }, 500);
      qWatch.focus();
    };

    vpPlay.addEventListener("click", function () {
      if (!vpVideo) return;
      if (vpVideo.paused) vpVideo.play(); else vpVideo.pause();
    });
    vpScrub.addEventListener("input", function () { vpScrubbing = true; });
    vpScrub.addEventListener("change", function () {
      if (vpVideo && vpVideo.duration) vpVideo.currentTime = vpVideo.duration * (vpScrub.value / 100);
      vpScrubbing = false;
    });
    qWatch.addEventListener("click", openVideo);
    qCloseBtn.addEventListener("click", closeVideo);
    qLayer.addEventListener("keydown", function (e) { if (e.key === "Escape") closeVideo(); });

    /* the page scrolls freely with the video open: pause the audio
       once the panel has fully left the viewport */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (vpVideo && !vpVideo.paused && !entries[0].isIntersecting) vpVideo.pause();
      }, { threshold: 0 }).observe(quote);
    }
  }

  /* ---- Stay Connected: gentle background parallax ---- */
  var scSection = document.querySelector(".stay-connected");
  var scImg = scSection && scSection.querySelector(".stay-connected__media img");
  if (scSection && scImg && !prefersReduced) {
    var scTicking = false;
    var scApply = function () {
      var r = scSection.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom > 0 && r.top < vh) {
        var t = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2);
        scImg.style.transform = "translateY(" + (t * -5) + "%)";
      }
      scTicking = false;
    };
    window.addEventListener("scroll", function () {
      if (!scTicking) { window.requestAnimationFrame(scApply); scTicking = true; }
    }, { passive: true });
    scApply();
  }

  /* ---- Stay Connected: front-end only; swap in success line ---- */
  var scForm = document.querySelector("[data-sc-form]");
  if (scForm) {
    scForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = scForm.querySelector("input[type=email]");
      if (!email.value || email.validity.typeMismatch || email.validity.valueMissing) {
        email.focus();
        return;
      }
      var done = document.createElement("p");
      done.className = "sc-success";
      done.textContent = "You're on the list — see you at the shore.";
      scForm.replaceWith(done);
    });
  }

  /* ---- Booking widget: Check Availability drawer ---- */
  var bk = document.querySelector("[data-booking]");
  if (bk) {
    var bkBackdrop = document.querySelector("[data-booking-backdrop]");
    var bkCal = bk.querySelector("[data-bk-cal]");
    var bkArrEl = bk.querySelector("[data-bk-arr]");
    var bkDepEl = bk.querySelector("[data-bk-dep]");
    var bkMinstay = bk.querySelector("[data-bk-minstay]");
    var bkCta = bk.querySelector("[data-bk-cta]");
    var bkNbhLabel = bk.querySelector("[data-bk-nbh-label]");
    var bkNbhList = bk.querySelector("[data-bk-nbh-list]");
    var bkNbhToggle = bk.querySelector("[data-bk-nbh-toggle]");
    var bkNbhRow = bk.querySelector("[data-bk-nbh-row]");
    var BK_NBH = [
      { name: "The Victorian", desc: "The original 1888 hotel, inviting its legacy & charm of accommodating.", img: "assets/img/16.webp" },
      { name: "The Views", desc: "Contemporary beachfront rooms & suites.", img: "assets/img/15.webp" },
      { name: "The Cabanas", desc: "Stylish poolside rooms with a laid-back feel.", img: "assets/img/9.webp" },
      { name: "Shore House", desc: "Beachfront Villas featuring up to two bedrooms & private dens.", img: "assets/img/13.webp" },
      { name: "Beach Village", desc: "Beachfront cottages & villas within a private enclave.", img: "assets/img/17.webp" }
    ];
    var BK_CTAS = { stay: "Check Availability", dine: "Book a Table", spa: "Find Your Treatment", activities: "Explore Our Activities" };
    var bkTab = "stay";
    var bkMonth = new Date(2025, 8, 1);       /* September 2025, per the design */
    var bkArr = null, bkDep = null;
    var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var DOWS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

    var bkFmt = function (d) { return MONTHS[d.getMonth()].slice(0,3) + " " + d.getDate() + ", " + d.getFullYear(); };
    var bkRate = function (d) { return 1385 + ((d.getDate() * 7 + d.getMonth() * 3) % 9) * 10; };

    var bkRenderCal = function () {
      var y = bkMonth.getFullYear(), m = bkMonth.getMonth();
      var firstDow = new Date(y, m, 1).getDay();
      var days = new Date(y, m + 1, 0).getDate();
      var html = '<div class="booking__cal-head">' +
        '<button class="booking__cal-nav" data-bk-nav="-1" aria-label="Previous month">&larr;</button>' +
        '<span class="booking__cal-title">' + MONTHS[m] + ' ' + y + '</span>' +
        '<button class="booking__cal-nav" data-bk-nav="1" aria-label="Next month">&rarr;</button></div>' +
        '<div class="booking__cal-grid booking__cal-grid--dow">';
      DOWS.forEach(function (d) { html += '<span class="booking__cal-dow">' + d + '</span>'; });
      html += '</div><div class="booking__cal-grid booking__cal-grid--days">';
      for (var i = 0; i < firstDow; i++) html += '<span class="booking__day--empty"></span>';
      for (var day = 1; day <= days; day++) {
        var date = new Date(y, m, day);
        var cls = "booking__day";
        if (bkArr && date.getTime() === bkArr.getTime()) cls += " is-arr";
        if (bkDep && date.getTime() === bkDep.getTime()) cls += " is-dep";
        if (bkArr && bkDep && date > bkArr && date < bkDep) cls += " is-mid";
        var rate = (bkTab === "stay") ? '<small>$' + bkRate(date).toLocaleString("en-US") + '</small>' : '';
        html += '<button class="' + cls + '" data-bk-day="' + date.getTime() + '">' + day + rate + '</button>';
      }
      /* complete the last row so the lattice ground stays rectangular */
      for (var t = (firstDow + days) % 7; t > 0 && t < 7; t++) html += '<span class="booking__day--empty"></span>';
      html += '</div>';
      bkCal.innerHTML = html;
      bkArrEl.textContent = bkArr ? bkFmt(bkArr) : "\u2014";
      bkDepEl.textContent = bkDep ? bkFmt(bkDep) : "\u2014";
      var oneNight = bkArr && bkDep && (bkDep - bkArr === 86400000);
      bkMinstay.hidden = !(bkTab === "stay" && oneNight);
    };

    var bkRenderNbh = function () {
      bkNbhList.innerHTML = BK_NBH.map(function (n, i) {
        return '<button class="booking__nbh-item" data-bk-nbh="' + i + '">' +
          '<img class="booking__nbh-thumb" src="' + n.img + '" alt="">' +
          '<span><span class="booking__nbh-name">' + n.name + '</span>' +
          '<span class="booking__nbh-desc">' + n.desc + '</span></span></button>';
      }).join("");
      var mapList = bk.querySelector("[data-bk-map-list]");
      mapList.innerHTML = BK_NBH.map(function (n, i) {
        return '<div class="booking__map-item">' +
          '<img class="booking__nbh-thumb" src="' + n.img + '" alt="">' +
          '<span><span class="booking__nbh-name">' + n.name + '</span>' +
          '<span class="booking__nbh-desc">' + n.desc + '</span></span>' +
          '<button class="booking__map-select" data-bk-nbh="' + i + '">Select</button></div>';
      }).join("");
    };

    var bkShowView = function (name) {
      [].forEach.call(bk.querySelectorAll("[data-bk-view]"), function (v) {
        v.hidden = v.getAttribute("data-bk-view") !== name;
      });
    };

    var bkOpen = function (e) {
      if (e) e.preventDefault();
      bk.hidden = false; bkBackdrop.hidden = false;
      window.setTimeout(function () { bk.classList.add("is-open"); bkBackdrop.classList.add("is-on"); }, 20);
      document.body.classList.add("booking-open");
      bkShowView("form");
      bkRenderCal();
      bk.querySelector("[data-booking-close]").focus();
    };
    var bkClose = function () {
      bk.classList.remove("is-open"); bkBackdrop.classList.remove("is-on");
      document.body.classList.remove("booking-open");
      window.setTimeout(function () { bk.hidden = true; bkBackdrop.hidden = true; }, 560);
    };

    /* all Reservations buttons open the drawer */
    [].forEach.call(document.querySelectorAll(".btn-reserve"), function (b) {
      b.addEventListener("click", bkOpen);
    });
    bk.querySelector("[data-booking-close]").addEventListener("click", bkClose);
    bkBackdrop.addEventListener("click", bkClose);
    bk.addEventListener("keydown", function (e) { if (e.key === "Escape") bkClose(); });

    /* tabs */
    [].forEach.call(bk.querySelectorAll("[data-bk-tab]"), function (t) {
      t.addEventListener("click", function () {
        bkTab = t.getAttribute("data-bk-tab");
        [].forEach.call(bk.querySelectorAll("[data-bk-tab]"), function (x) {
          var on = x === t;
          x.classList.toggle("is-active", on);
          x.setAttribute("aria-selected", on ? "true" : "false");
        });
        bkNbhRow.style.display = bkTab === "stay" ? "" : "none";
        bkCta.textContent = BK_CTAS[bkTab];
        bkRenderCal();
      });
    });

    /* calendar interactions (delegated) */
    bkCal.addEventListener("click", function (e) {
      var nav = e.target.closest("[data-bk-nav]");
      if (nav) {
        bkMonth = new Date(bkMonth.getFullYear(), bkMonth.getMonth() + (+nav.getAttribute("data-bk-nav")), 1);
        bkRenderCal(); return;
      }
      var dayBtn = e.target.closest("[data-bk-day]");
      if (dayBtn) {
        var date = new Date(+dayBtn.getAttribute("data-bk-day"));
        if (!bkArr || (bkArr && bkDep) || date <= bkArr) { bkArr = date; bkDep = null; }
        else bkDep = date;
        bkRenderCal();
      }
    });

    /* guests */
    var bkGuests = { adults: 1, children: 0 };
    [].forEach.call(bk.querySelectorAll("[data-bk-step]"), function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-bk-step");
        var min = key === "adults" ? 1 : 0;
        bkGuests[key] = Math.min(8, Math.max(min, bkGuests[key] + (+b.getAttribute("data-dir"))));
        bk.querySelector('[data-bk-count="' + key + '"]').textContent = bkGuests[key];
      });
    });

    /* neighborhood selector + map */
    bkNbhToggle.addEventListener("click", function (e) {
      if (e.target.closest("[data-bk-map-open]")) return; /* view-map link handles itself */
      var open = bkNbhList.hidden;
      bkNbhList.hidden = !open;
      bkNbhToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    bk.querySelector("[data-bk-map-open]").addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation(); bkShowView("map");
    });
    bk.addEventListener("click", function (e) {
      var pick = e.target.closest("[data-bk-nbh]");
      if (pick) {
        bkNbhLabel.textContent = BK_NBH[+pick.getAttribute("data-bk-nbh")].name;
        bkNbhList.hidden = true;
        bkNbhToggle.setAttribute("aria-expanded", "false");
        bkShowView("form");
        return;
      }
      if (e.target.closest("[data-bk-map-close]")) { bkShowView("form"); return; }
      if (e.target.closest("[data-bk-map-reset]")) { bkNbhLabel.textContent = "Search all Neighborhoods"; }
    });

    bkRenderNbh();
  }

  /* ---- AI Concierge: right drawer (booking-widget pattern) ---- */
  var cg = document.querySelector("[data-concierge]");
  if (cg) {
    var cgBackdrop = document.querySelector("[data-concierge-backdrop]");
    var cgInput = cg.querySelector("[data-concierge-input]");
    var cgOpen = function (e) {
      if (e) e.preventDefault();
      cg.hidden = false; cgBackdrop.hidden = false;
      window.setTimeout(function () { cg.classList.add("is-open"); cgBackdrop.classList.add("is-on"); }, 20);
      document.body.classList.add("concierge-open");
      cg.querySelector("[data-concierge-close]").focus();
    };
    var cgClose = function () {
      cg.classList.remove("is-open"); cgBackdrop.classList.remove("is-on");
      document.body.classList.remove("concierge-open");
      window.setTimeout(function () { cg.hidden = true; cgBackdrop.hidden = true; }, 560);
    };

    [].forEach.call(document.querySelectorAll("[data-concierge-open]"), function (b) {
      b.addEventListener("click", cgOpen);
    });
    cg.querySelector("[data-concierge-close]").addEventListener("click", cgClose);
    cgBackdrop.addEventListener("click", cgClose);
    cg.addEventListener("keydown", function (e) { if (e.key === "Escape") cgClose(); });

    /* popular questions load the search field (the engine comes later) */
    [].forEach.call(cg.querySelectorAll("[data-concierge-q]"), function (q) {
      q.addEventListener("click", function () {
        cgInput.value = q.textContent;
        cgInput.focus();
      });
    });
    cg.querySelector("[data-concierge-form]").addEventListener("submit", function (e) {
      e.preventDefault(); /* demo: no engine wired yet */
    });

    /* hand-off: the stay-finder quiz */
    cg.querySelector("[data-concierge-quiz]").addEventListener("click", function (e) {
      e.preventDefault();
      cgClose();
      var stage = document.querySelector("[data-stage]");
      if (stage) window.scrollTo({ top: stage.getBoundingClientRect().top + window.scrollY, behavior: "smooth" });
      window.setTimeout(function () {
        var qz = document.querySelector("[data-quiz-open]");
        if (qz) qz.click();
      }, 900);
    });
  }

  /* ---- Mobile carousel arrow: one leading control over the imagery ---- */
  var MCAR_NEXT_SVG = '<svg width="22" height="10" viewBox="0 0 22 10" fill="none" aria-hidden="true"><path d="M1 5H21M21 5L16.5 1M21 5L16.5 9" stroke="currentColor" stroke-width="1.2"/></svg>';
  [
    { track: ".neighborhoods", media: ".nbh__media" },
    { track: ".hlock__track", media: ".hcard__media" },
    { track: ".offers", media: ".offer__media" },
    { track: ".seasonal__track", media: ".scard__media" }
  ].forEach(function (def) {
    var track = document.querySelector(def.track);
    if (!track) return;
    var host = track.parentElement;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    var btn = document.createElement("button");
    btn.className = "mcar-next";
    btn.setAttribute("aria-label", "Next");
    btn.innerHTML = MCAR_NEXT_SVG;
    host.appendChild(btn);
    /* pin the arrow to the vertical middle of the card imagery, and
       horizontally to the middle of the seam between card 1 and card 2
       (at rest the loop is normalized, so the seam sits at pad + cardW) */
    var place = function () {
      /* measure a CLONE when the loop is active: originals carry data-reveal
         and sit 24px low until revealed, which would misplace the arrow */
      var media = track.querySelector('[aria-hidden="true"] ' + def.media) ||
                  track.querySelector(def.media);
      if (!media) return;
      var hostR = host.getBoundingClientRect(), mR = media.getBoundingClientRect();
      btn.style.top = (mR.top - hostR.top + mR.height / 2) + "px";
      var cs = getComputedStyle(track);
      var card = track.firstElementChild;
      if (card) {
        var seam = (track.getBoundingClientRect().left - hostR.left) +
          (parseFloat(cs.paddingLeft) || 0) +
          card.getBoundingClientRect().width +
          (parseFloat(cs.columnGap) || 16) / 2;
        btn.style.left = (seam - btn.offsetWidth / 2) + "px";
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("load", place);
    btn.addEventListener("click", function () {
      /* forever tracks glide via their own tween (wrap-safe) */
      var api = foreverApis[def.track];
      if (api) { api.go(1); return; }
      /* seasonal has its own forever machinery — reuse its tween */
      if (def.track === ".seasonal__track" && typeof sGo === "function") { sGo(1); return; }
      var card = track.firstElementChild;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 12;
      var w = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      /* mandatory snap collapses the smooth glide to a jump — suspend it */
      track.style.scrollSnapType = "none";
      track.scrollBy({ left: w, behavior: "smooth" });
      window.setTimeout(function () { track.style.scrollSnapType = ""; }, 700);
    });
  });

  /* ---- Scroll reveal ---- */
  var reveals = document.querySelectorAll("[data-reveal]");
  if (reveals.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }
})();
