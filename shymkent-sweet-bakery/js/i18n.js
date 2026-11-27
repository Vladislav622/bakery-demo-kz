/* =====================================================================
   Общее ядро для всех страниц: язык (kk/ru), тексты, формат тенге,
   реквизиты оператора, предупреждения, иконка, cookie-баннер и аналитика.
   Подключается после js/config.js на главной и на юридических страницах.
   ===================================================================== */
window.I18N = (() => {
  "use strict";
  const S = window.SITE;
  const LANGS = (S.languages && S.languages.list) || ["ru", "kk"];
  const KEY = "lang:" + (S.brand.name || "site");
  const listeners = new Set();

  /* ---------- Помощники ---------- */
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // {текст} → курсив акцентным цветом (переносы строк задаются "\n" и CSS white-space)
  const rich = (v) => esc(v).replace(/\{([^}]+)\}/g, "<em>$1</em>");
  // «1 500 ₸»: неразрывный пробел между разрядами и перед знаком валюты
  const money = (n) => (n == null || n === "" ? "—"
    : String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + (S.brand.currency || "₸"));
  const fill = (str, vars = {}) => String(str ?? "").replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const digits = (v) => String(v || "").replace(/\D/g, "");

  /* ---------- Язык ---------- */
  let lang = (() => {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* приватный режим — не страшно */ }
    if (LANGS.includes(saved)) return saved;
    const def = S.languages && S.languages.default;
    return LANGS.includes(def) ? def : LANGS[0];
  })();
  const dict = (l) => (S.i18n && S.i18n[l]) || {};
  // t("modal.name") — текст на текущем языке; если перевода нет — русский вариант
  function t(path, vars) {
    const get = (o) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
    let v = get(dict(lang));
    if (v == null) v = get(dict("ru"));
    if (v == null) v = "";
    return typeof v === "string" ? fill(v, vars) : v;
  }
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.setAttribute("placeholder", t(el.dataset.i18nPh)); });
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }
  function setLang(l) {
    if (!LANGS.includes(l) || l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) { /* ничего */ }
    applyLang();
    listeners.forEach((fn) => { try { fn(lang); } catch (e) { console.error(e); } });
  }
  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  // Переключатель «Қаз / Рус»: кнопки с data-lang в любом месте страницы
  function langSwitchHtml() {
    return `<div class="lang-switch" role="group" aria-label="${esc(t("langLabel"))}">` +
      LANGS.map((l) => `<button type="button" data-lang="${l}" aria-pressed="${l === lang}" lang="${l}">${esc(dict(l).langName || l)}</button>`).join("") +
      `</div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (b) setLang(b.dataset.lang);
  });

  /* ---------- Цвета из настроек ---------- */
  const cssVar = { dark: "--dark", darker: "--darker", glow: "--glow", light: "--light", accent: "--accent", accentDark: "--accent-dark", sleeve: "--sleeve" };
  Object.entries(S.colors || {}).forEach(([k, v]) => cssVar[k] && document.documentElement.style.setProperty(cssVar[k], v));

  /* ---------- Реквизиты оператора ПД ---------- */
  const LEGAL_FIELDS = ["operatorName", "binIin", "legalAddress", "email", "phone", "dpoName"];
  const L = S.legal || {};
  const missingLegal = LEGAL_FIELDS.filter((k) => !String(L[k] || "").trim());
  // значение реквизита или заметная заглушка «[заполнить]»
  const legalHtml = (k) => (String(L[k] || "").trim() ? esc(L[k]) : `<span class="legal-missing">${esc(t("missing"))}</span>`);

  /* ---------- Предупреждения для разработчика (один раз) ---------- */
  if (missingLegal.length) console.warn("LEGAL: не заполнены реквизиты — js/config.js → legal:", missingLegal.join(", "));
  if (S.demoPhotos) console.warn("DEMO PHOTOS: на сайте демо-фото Unsplash из шаблона. Замените их фото заказчика и поставьте demoPhotos: false в js/config.js.");

  /* ---------- Иконка вкладки ---------- */
  (function favicon() {
    let href = S.brand.favicon;
    if (!href) {
      const letter = esc((S.brand.name || "К").trim()[0] || "К");
      const bg = (S.colors && S.colors.dark) || "#0E3A2E", fg = (S.colors && S.colors.light) || "#F2EFE7";
      href = "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/>` +
        `<text x="32" y="43" font-family="Georgia,serif" font-style="italic" font-size="34" text-anchor="middle" fill="${fg}">${letter}</text></svg>`);
    }
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = href;
  })();

  /* ---------- Мета-теги (title, description, Open Graph) ---------- */
  function setMeta(title, description) {
    document.title = title;
    const set = (sel, attr, val) => { const m = document.querySelector(sel); if (m) m.setAttribute(attr, val); };
    set('meta[name="description"]', "content", description);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", description);
    set('meta[property="og:locale"]', "content", lang === "kk" ? "kk_KZ" : "ru_RU");
    set('meta[property="og:site_name"]', "content", S.brand.name || "");
    if (S.brand.ogImage) {
      const base = S.siteUrl ? S.siteUrl.replace(/\/$/, "") + "/" : "";
      set('meta[property="og:image"]', "content", base + S.brand.ogImage);
    }
    if (S.siteUrl) set('meta[property="og:url"]', "content", S.siteUrl);
  }

  /* ---------- Cookie-баннер и аналитика ----------
     Счётчик грузится только после «Принять». Решение запоминается. */
  const A = S.analytics || {};
  const CKEY = "cookie-consent:" + (S.brand.name || "site");
  const analyticsOn = !!(A.enabled && A.id);
  const providerName = A.provider === "ym" ? "Яндекс Метрика" : "Google Analytics";
  function loadAnalytics() {
    if (window.__analyticsLoaded) return; window.__analyticsLoaded = true;
    const s = document.createElement("script"); s.async = true;
    if (A.provider === "ym") {
      window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); }; window.ym.l = Date.now();
      s.src = "https://mc.yandex.ru/metrika/tag.js";
      window.ym(Number(A.id), "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
    } else {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date()); window.gtag("config", A.id, { anonymize_ip: true });
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(A.id);
    }
    document.head.appendChild(s);
  }
  function cookieBanner() {
    if (!analyticsOn) return;
    let choice = null;
    try { choice = localStorage.getItem(CKEY); } catch (e) { /* ничего */ }
    if (choice === "accept") { loadAnalytics(); return; }
    if (choice === "decline") return;
    const box = document.createElement("div");
    box.className = "cookie"; box.setAttribute("role", "dialog"); box.setAttribute("aria-live", "polite");
    const render = () => {
      box.innerHTML = `<p>${esc(t("cookie.text", { provider: providerName }))} <a href="privacy.html">${esc(t("cookie.more"))}</a></p>` +
        `<div class="cookie__btns"><button type="button" class="btn btn--line-dark" data-cookie="decline">${esc(t("cookie.decline"))}</button>` +
        `<button type="button" class="btn btn--dark" data-cookie="accept">${esc(t("cookie.accept"))}</button></div>`;
    };
    render(); onChange(render);
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cookie]"); if (!b) return;
      try { localStorage.setItem(CKEY, b.dataset.cookie); } catch (err) { /* ничего */ }
      if (b.dataset.cookie === "accept") loadAnalytics();
      box.remove();
    });
    document.body.appendChild(box);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", cookieBanner); else cookieBanner();

  return {
    get lang() { return lang; }, langs: LANGS, t, setLang, onChange, applyLang, langSwitchHtml,
    esc, rich, money, fill, digits, legalHtml, missingLegal, setMeta, analyticsOn, providerName,
  };
})();
