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
    ".feature-list li", ".bio-block", ".pull-quote",
    ".teaser-hero__tagline", ".teaser-hero__body", ".diagram-figure",
    ".contact-cta__inner", ".media-card"
  ];
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(revealSelectors.join(",")));

  if (reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add("reveal", "is-visible"); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("reveal"); });

    // Stagger items within a shared row/grid so they cascade rather than pop together.
    ["icon-row", "module-grid", "trait-list", "credential-list", "feature-list", "media-grid"].forEach(function (cls) {
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

  // Hero photo: subtle parallax as the page scrolls. The image is sized
  // taller than its frame (see .hero__photo-bg img in style.css), so
  // nudging it reveals more of the real photo rather than blank space.
  var heroImg = document.querySelector(".hero__photo-bg img");
  if (heroImg && !reduceMotion) {
    var heroFrame = heroImg.closest(".hero--photo");
    var heroRange = 36;
    var heroTicking = false;

    function updateHeroParallax() {
      heroTicking = false;
      var rect = heroFrame.getBoundingClientRect();
      var elementCenter = rect.top + rect.height / 2;
      var viewportCenter = window.innerHeight / 2;
      var progress = (viewportCenter - elementCenter) / viewportCenter;
      var offset = Math.max(-1, Math.min(1, progress)) * heroRange;
      heroImg.style.transform = "translateY(calc(-50% + " + offset.toFixed(1) + "px))";
    }

    window.addEventListener("scroll", function () {
      if (!heroTicking) {
        heroTicking = true;
        requestAnimationFrame(updateHeroParallax);
      }
    }, { passive: true });
    window.addEventListener("resize", updateHeroParallax);
    updateHeroParallax();
  }

  // Ajax form submit: shared by every Formspree-backed form on the site, so
  // a successful send shows an inline message instead of navigating away to
  // Formspree's own page.
  function bindAjaxForm(form, successMsg, errorMsg) {
    if (!form) return;
    var status = form.querySelector('[role="status"]');
    var submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (status) {
        status.textContent = "";
        status.removeAttribute("data-state");
      }
      if (submitBtn) submitBtn.disabled = true;
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            if (status) {
              status.textContent = successMsg;
              status.setAttribute("data-state", "ok");
            }
          } else {
            throw new Error("submit failed");
          }
        })
        .catch(function () {
          if (status) {
            status.textContent = errorMsg;
            status.setAttribute("data-state", "error");
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  bindAjaxForm(
    document.querySelector(".contact-form"),
    "문의가 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.",
    "전송에 실패했습니다. contact@chaejeongho.com으로 직접 메일 부탁드립니다."
  );
  bindAjaxForm(
    document.querySelector(".waitlist-form"),
    "신청이 접수되었습니다. 개원 소식을 가장 먼저 알려드리겠습니다.",
    "전송에 실패했습니다. 잠시 후 다시 시도해 주세요."
  );

  // Book carousel: arrows scroll the native horizontal track (smooth
  // scroll + scroll-snap does the easing), and disable themselves at
  // either end instead of scrolling past the last card.
  var carousel = document.querySelector(".book-carousel");
  if (carousel) {
    var track = carousel.querySelector(".book-carousel__track");
    var prevBtn = carousel.querySelector(".book-carousel__nav--prev");
    var nextBtn = carousel.querySelector(".book-carousel__nav--next");
    var firstItem = track.querySelector(".book-carousel__item");

    function stepDistance() {
      if (!firstItem) return track.clientWidth;
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      return (firstItem.getBoundingClientRect().width + gap) * 2;
    }

    function updateNavState() {
      var max = track.scrollWidth - track.clientWidth - 1;
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 0;
      if (nextBtn) nextBtn.disabled = track.scrollLeft >= max;
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        track.scrollBy({ left: -stepDistance(), behavior: reduceMotion ? "auto" : "smooth" });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        track.scrollBy({ left: stepDistance(), behavior: reduceMotion ? "auto" : "smooth" });
      });
    }
    track.addEventListener("scroll", updateNavState, { passive: true });
    window.addEventListener("resize", updateNavState);
    updateNavState();
  }
});
