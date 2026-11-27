/* =====================================================================
   Сборка страниц документов (privacy.html, consent.html, offer.html).
   Какой документ показывать — в <body data-doc="...">.
   Реквизиты — из js/config.js → legal, тексты — из js/legal-texts.js.
   ===================================================================== */
(() => {
  "use strict";
  const S = window.SITE, I = window.I18N;
  const { t, esc } = I;
  const doc = document.body.dataset.doc;
  const L = S.legal || {};

  const ctx = () => ({
    op: I.legalHtml("operatorName"), bin: I.legalHtml("binIin"), addr: I.legalHtml("legalAddress"),
    email: I.legalHtml("email"), phone: I.legalHtml("phone"), dpo: I.legalHtml("dpoName"),
    brand: esc(S.brand.name || ""),
    date: L.docsDate ? esc(new Date(L.docsDate + "T00:00:00").toLocaleDateString(I.lang === "kk" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" })) : I.legalHtml("docsDate"),
    months: esc(L.storageMonths || 12), hold: esc(L.orderHoldHours || 2),
    server: S.orderMode === "server",
    analytics: I.analyticsOn, provider: esc(I.providerName),
  });

  const logo = S.brand.logo
    ? `<img class="logo-mark" src="${esc(S.brand.logo)}" alt="">`
    : `<span class="logo-mark" aria-hidden="true">${esc((S.brand.name || "К").trim()[0])}</span>`;

  function render() {
    const texts = (window.LEGAL_TEXTS[I.lang] || window.LEGAL_TEXTS.ru);
    const body = texts[doc] ? texts[doc](ctx()) : "";
    document.querySelector("[data-doc-body]").innerHTML = body;
    document.querySelector("[data-doc-brand]").innerHTML =
      `${logo}<span><b>${esc(S.brand.name)}</b><small>${esc(t("brand.tagline"))}</small></span>`;
    document.querySelector("[data-doc-back]").textContent = "← " + t("backHome");
    document.querySelector("[data-doc-links]").innerHTML =
      ["privacy", "consent", "offer"].map((d) => d === doc ? `<span>${esc(t("footer.docs." + d))}</span>` : `<a href="${d}.html">${esc(t("footer.docs." + d))}</a>`).join("") +
      `<span>© ${new Date().getFullYear()}, ${esc(S.brand.name)}</span>`;
    const title = (document.querySelector("[data-doc-body] h1") || {}).textContent || "";
    I.setMeta(`${title} — ${S.brand.name}`, title);
    I.applyLang();
  }

  document.querySelector("[data-lang-slot]").innerHTML = I.langSwitchHtml();
  render();
  I.onChange(render);
})();
