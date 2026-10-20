/* Site behaviour: theme toggle, mobile nav, publication filters, BibTeX copy.
   The initial theme is set by an inline <head> script (no flash); this file
   only handles interaction. */
(function () {
  "use strict";
  var root = document.documentElement;

  // ---- Theme toggle ----
  var toggle = document.querySelector(".theme-toggle");
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    if (toggle) {
      toggle.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      toggle.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }
  if (toggle) {
    setTheme(root.getAttribute("data-theme") || "light");
    toggle.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }
  // Follow OS changes only if the visitor never chose explicitly.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      var saved = null;
      try { saved = localStorage.getItem("theme"); } catch (err) {}
      if (!saved) root.setAttribute("data-theme", e.matches ? "dark" : "light");
    });
  }

  // ---- Mobile nav ----
  var navBtn = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (navBtn && nav) {
    navBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ---- Publication filters ----
  var list = document.querySelector("[data-pub-list]");
  if (list) {
    var pubs = Array.prototype.slice.call(list.querySelectorAll(".pub"));
    var years = Array.prototype.slice.call(list.querySelectorAll(".pub-year"));
    var search = document.getElementById("pub-search");
    var countEl = document.querySelector(".pub-count");
    var state = { theme: "all", type: "all", q: "" };

    function apply() {
      var shown = 0;
      pubs.forEach(function (p) {
        var ok = (state.theme === "all" || (" " + p.dataset.themes + " ").indexOf(" " + state.theme + " ") > -1) &&
                 (state.type === "all" || p.dataset.type === state.type) &&
                 (!state.q || p.dataset.search.indexOf(state.q) > -1);
        p.hidden = !ok;
        if (ok) shown++;
      });
      years.forEach(function (y) {
        var sib = y.nextElementSibling;
        var any = sib && Array.prototype.some.call(sib.querySelectorAll(".pub"), function (p) { return !p.hidden; });
        y.hidden = !any;
        if (sib) sib.hidden = !any;
      });
      if (countEl) countEl.textContent = shown + " / " + pubs.length;
    }

    document.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.dataset.filter;
        state[kind] = btn.dataset.value;
        document.querySelectorAll('[data-filter="' + kind + '"]').forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        apply();
      });
    });
    if (search) search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); apply(); });

    // Deep link: /academic/publications/?theme=space
    var params = new URLSearchParams(location.search);
    var t = params.get("theme");
    if (t) {
      var b = document.querySelector('[data-filter="theme"][data-value="' + t + '"]');
      if (b) b.click();
    }
    apply();
  }

  // ---- Copy BibTeX ----
  document.querySelectorAll(".copy-bib").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tpl = document.getElementById(btn.dataset.bib);
      if (!tpl) return;
      var text = tpl.textContent.trim();
      var done = function () { var o = btn.textContent; btn.textContent = "copied ✓"; setTimeout(function () { btn.textContent = o; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done);
      else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); done(); }
    });
  });
})();
