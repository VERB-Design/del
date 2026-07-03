/* Hotel del Coronado — site JS
   Keep it lean and progressive: everything degrades without JS. */
(function () {
  "use strict";

  /* ---- Menu bar: condenses to a white fixed nav on scroll ---- */
  var menuBar = document.querySelector(".menu-bar");
  if (menuBar) {
    var onMenuScroll = function () {
      menuBar.classList.toggle("is-condensed", window.scrollY > 120);
    };
    onMenuScroll();
    window.addEventListener("scroll", onMenuScroll, { passive: true });
  }

  /* ---- Overlay nav ---- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var overlay = document.querySelector("[data-overlay-nav]");
  var closeBtn = document.querySelector("[data-overlay-close]");

  function focusables(el) {
    return Array.prototype.slice.call(
      el.querySelectorAll('a[href], button:not([disabled])')
    );
  }
  function openNav() {
    if (!overlay) return;
    overlay.classList.add("is-open");
    overlay.removeAttribute("aria-hidden");
    document.body.classList.add("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    var f = focusables(overlay);
    if (f.length) f[0].focus();
  }
  function closeNav() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("nav-open");
    if (toggle) { toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
  }
  if (toggle) toggle.addEventListener("click", openNav);
  if (closeBtn) closeBtn.addEventListener("click", closeNav);
  if (overlay) {
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeNav(); return; }
      if (e.key !== "Tab") return;
      var f = focusables(overlay);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    /* close when an overlay link is followed (in-page anchors) */
    overlay.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (a) closeNav();
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
    var sizeStage = function () {
      liftBudget = Math.min(reveal.offsetHeight, window.innerHeight);
      stage.style.height = (window.innerHeight + liftBudget) + "px";
    };
    var ticking = false;
    var applyCurtain = function () {
      var vh = window.innerHeight;
      var top = stage.getBoundingClientRect().top;
      /* 1:1 lift, capped at the budget */
      var p = liftBudget > 0 ? Math.min(Math.max(-top / liftBudget, 0), 1) : 1;
      var lift = p * liftBudget;
      curtain.style.transform = "translateY(" + (-lift) + "px)";
      /* parallax runs the full journey: panel entering → lift complete */
      if (media) {
        var g = Math.min(Math.max((vh - top) / (vh + liftBudget), 0), 1);
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

  /* ---- Horizontal lock: vertical scroll pans the track while pinned ---- */
  var hlock = document.querySelector("[data-hlock]");
  if (hlock && !prefersReduced) {
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
    var sAnim = null;
    var sGo = function (dir) {
      var step = sStep();
      /* aim for the next card boundary in the travel direction */
      var target = Math.round((sTrack.scrollLeft + dir * step) / step) * step;
      if (prefersReduced) { sTrack.scrollLeft = target; sNorm(); return; }
      if (sAnim) window.cancelAnimationFrame(sAnim);
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
      window.setTimeout(function () {
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
  var strokeHosts = document.querySelectorAll(".nbh__media, .hcard__media, .scard__media, .offer");
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
