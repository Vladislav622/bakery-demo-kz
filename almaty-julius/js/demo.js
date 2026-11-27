/* Плашка «Демо-версия сайта…» — только в демо-проектах.
   Убирается одной настройкой в js/config.js: demoBanner: false */
(() => {
  "use strict";
  const S = window.SITE, I = window.I18N;
  if (!S || S.demoBanner === false) return;
  const TEXT = {
    ru: (n) => `Демо-версия сайта, подготовлена для «${n}». Не является официальным сайтом заведения.`,
    kk: (n) => `Сайттың демо-нұсқасы, «${n}» үшін дайындалған. Мекеменің ресми сайты емес.`, // TODO: проверить носителем
  };
  const el = document.createElement("div");
  el.className = "demo-badge";
  el.setAttribute("role", "note");
  const render = () => { el.textContent = (TEXT[I ? I.lang : "ru"] || TEXT.ru)(S.brand.name || ""); };
  render();
  if (I) I.onChange(render);
  const mount = () => document.body.appendChild(el);
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  // Если настоящей цитаты нет (в демо не выдумываем), прячем пустой блок цитаты с «— »
  const tidy = () => {
    const q = document.querySelector(".hero__quote blockquote");
    if (q) q.closest(".hero__quote").hidden = !q.textContent.trim();
    const by = document.querySelector(".hero__quote figcaption");
    if (by) by.hidden = !by.textContent.replace(/[—\s-]/g, "");   // подпись без автора — не показывать
    const about = document.querySelector("[data-about-text]");
    if (about) about.hidden = !about.textContent.trim();
  };
  document.addEventListener("DOMContentLoaded", tidy);
  if (I) I.onChange(() => setTimeout(tidy, 0));
})();
