document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("is-open");
      var expanded = nav.classList.contains("is-open");
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Watches a list of elements and calls onEnter(el) once each scrolls into view.
  // Driven by scroll/resize (not IntersectionObserver, to avoid depending on any
  // single API), backstopped by a poll and a hard timeout so nothing can stay
  // stuck if the element never reports as "in view" for some reason.
  function watchUntilVisible(els, onEnter) {
    var pending = els.slice();
    if (!pending.length) return;

    function sweep() {
      var vh = window.innerHeight;
      pending = pending.filter(function (el) {
        var rect = el.getBoundingClientRect();
        var inView = rect.top < vh - 40 && rect.bottom > 0;
        if (inView) {
          onEnter(el);
          return false;
        }
        return true;
      });
      if (!pending.length) teardown();
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        sweep();
        ticking = false;
      });
    }

    var pollId = setInterval(sweep, 400);
    var timeoutId = setTimeout(function () {
      pending.forEach(onEnter);
      pending = [];
      teardown();
    }, 4000);

    function teardown() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clearInterval(pollId);
      clearTimeout(timeoutId);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    sweep();
  }

  // Scroll reveal: fade + rise into view once, for the site's major content blocks.
  var revealSelectors = [
    ".section-head", ".stat-row", ".credential-list", ".credential-groups",
    ".quote-block", ".icon-row__item", ".module-card", ".trait-item",
    ".feature-list li", ".bio-block", ".teaser-hero__lede", ".diagram-figure",
    ".contact-cta__inner"
  ];
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(revealSelectors.join(",")));

  if (reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add("reveal", "is-visible"); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("reveal"); });

    // Stagger items within a shared row/grid so they cascade rather than pop together.
    ["icon-row", "module-grid", "trait-list", "credential-list", "feature-list"].forEach(function (cls) {
      document.querySelectorAll("." + cls).forEach(function (group) {
        Array.prototype.forEach.call(group.children, function (child, i) {
          child.style.transitionDelay = Math.min(i * 70, 420) + "ms";
        });
      });
    });

    watchUntilVisible(revealEls, function (el) {
      el.classList.add("is-visible");
    });
  }

  // Count up the hero stats' numeric values when they scroll into view.
  var statEls = Array.prototype.slice.call(document.querySelectorAll(".stat__num"));
  if (statEls.length) {
    function setFinal(el) {
      var target = parseInt(el.getAttribute("data-target"), 10);
      if (!isNaN(target)) el.textContent = target;
    }
    if (reduceMotion) {
      statEls.forEach(setFinal);
    } else {
      watchUntilVisible(statEls, function (el) {
        var target = parseInt(el.getAttribute("data-target"), 10);
        if (isNaN(target)) return;
        var start = null;
        var duration = 1100;
        function step(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = target;
        }
        requestAnimationFrame(step);
      });
    }
  }
});
