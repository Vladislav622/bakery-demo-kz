/* =====================================================================
   Логика главной страницы. Данные — window.SITE (js/config.js),
   тексты и язык — window.I18N (js/i18n.js).
   ===================================================================== */
(() => {
  "use strict";
  const S = window.SITE;
  const I = window.I18N;
  const { t, esc, rich, money } = I;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // Уменьшать движение только если это включено в настройках сайта (config.js → motion)
  const reduceMotion = !!(S.motion && S.motion.respectReducedMotion) && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.toggle("reduce-motion", reduceMotion);

  const html = (el, v) => { if (el) el.innerHTML = v; };
  const text = (el, v) => { if (el) el.textContent = v; };

  const PH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4 4 3 3-2 4 3"/></svg>';
  // Фото или заглушка. small = true — мелкое место: берём копию из img/thumbs/
  // (её делает tools/make-thumbs.py); если копии нет — оригинал.
  const thumb = (src) => (/^img\/(?!thumbs\/)/.test(src) ? src.replace(/^img\//, "img/thumbs/") : src);
  const ph = (img, label, cls = "", small = false) => {
    const src = small ? thumb(img) : img;
    const fallback = src !== img ? `this.onerror=function(){this.remove()};this.src='${esc(img)}'` : "this.remove()";
    return `<div class="ph ${cls}"><div class="ph__label">${PH_ICON}<span>${esc(label || t("photo"))}</span></div>` +
      (img ? `<img src="${esc(src)}" alt="${esc(label)}" loading="lazy" decoding="async" onerror="${fallback}">` : "") + `</div>`;
  };
  const logoMark = () => S.brand.logo
    ? `<img class="logo-mark" src="${esc(S.brand.logo)}" alt="">`
    : `<span class="logo-mark" aria-hidden="true">${esc((S.brand.name || "К").trim()[0])}</span>`;
  const telHref = (p) => "tel:" + String(p || "").replace(/[^\d+]/g, "");

  /* ---------- Меню ---------- */
  const M = S.menu;
  const products = M.products;
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const pName = (id) => t(`products.${id}.name`) || id;
  const pDesc = (id) => t(`products.${id}.desc`);
  const tagText = (tag) => (tag ? t(`tags.${tag}`) : "");
  const branches = S.branches || [];
  const bText = (b, k) => t(`branches.${b.id}.${k}`);
  const NAV = [["about", "#about"], ["menu", "#menu"], ["order", "#order"], ["branches", "#contacts"]];

  // Переключатель языка в шапке
  $$("[data-lang-slot]").forEach((el) => { el.innerHTML = I.langSwitchHtml(); });

  /* ---------- Зёрна для запасной CSS-версии (один раз) ---------- */
  const BEAN = (id) => `<svg viewBox="0 0 40 56"><defs><radialGradient id="bg${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#6B4230"/><stop offset=".55" stop-color="#3A2117"/><stop offset="1" stop-color="#1C0F0A"/></radialGradient></defs><ellipse cx="20" cy="28" rx="18" ry="26" fill="url(#bg${id})"/><path d="M20 4c-7 9 7 15 0 24s7 15 0 24" fill="none" stroke="#140A06" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const placeBeans = (host, list, p) => {
    if (!host) return;
    host.innerHTML = list.map(([x, y, s, r, depth, blur], i) =>
      `<span class="bean" data-depth="${depth}" style="left:${x}%;top:${y}%;--s:${s}px;--r:${r}deg;--d:${6 + (i % 4)}s;--dl:-${i * 0.7}s;--b:${blur}px">${BEAN(p + i)}</span>`).join("");
  };
  placeBeans($("[data-beans]"), [
    [36, 37, 18, 20, 1.4, 0], [58, 30, 14, -30, 2, 1.5], [62, 52, 20, 60, 1.2, 0], [34, 62, 16, -50, 1.8, 0],
    [25, 48, 12, 10, 2.6, 2.5], [72, 40, 10, 40, 2.8, 3], [47, 72, 13, -10, 1.6, 1], [80, 70, 22, 120, 2.2, 4], [14, 26, 26, -70, 3, 5],
  ], "h");
  placeBeans($("[data-coffee-beans]"), [[8, 14, 46, -25, 1, 0], [30, 30, 64, 30, 1.6, 0], [48, 12, 36, 75, 2, 0.6]], "c");

  /* =====================================================================
     РЕНДЕР (вызывается при загрузке и при смене языка)
     ===================================================================== */
  const SHAPES = ["", "row__tile--w", "", "", "row__tile--w", ""];
  const rowHtml = (arr, shift = 0) => {
    const tl = arr.map((g, i) => `<div class="row__tile ${SHAPES[(i + shift) % SHAPES.length]}">${ph(g.img, t("photos." + g.key), "", true)}</div>`).join("");
    return tl + tl + tl;
  };
  const splitRows = (arr) => { const h = Math.ceil(arr.length / 2); return [arr.slice(0, h), arr.slice(h)]; };

  function renderPage() {
    I.setMeta(t("seo.title"), t("seo.description"));

    // Шапка и бренд
    $$("[data-brand]").forEach((el) => {
      el.innerHTML = `${logoMark()}<span><b>${esc(S.brand.name)}</b><small>${esc(t("brand.tagline"))}</small></span>`;
      el.setAttribute("aria-label", S.brand.name);
    });
    html($("[data-nav]"), NAV.map(([k, href]) => `<a href="${href}">${esc(t("nav." + k))}</a>`).join(""));
    html($("[data-dd-panel]"),
      branches.map((b) => `<a href="${telHref(b.phone)}"><b>${esc(bText(b, "address"))}</b><span>${esc(bText(b, "hours"))} · ${esc(b.phone)}</span></a>`).join("") +
      (S.contacts.email ? `<a href="mailto:${esc(S.contacts.email)}"><b>${esc(S.contacts.email)}</b><span>${esc(t("footer.emailHint"))}</span></a>` : ""));

    // Первый экран
    html($("[data-hero-l1]"), rich(t("hero.line1")));
    html($("[data-hero-l2]"), rich(t("hero.line2")));
    text($("[data-hero-quote]"), t("hero.quote"));
    text($("[data-hero-author]"), "— " + t("hero.quoteAuthor"));
    text($("[data-hero-primary] span"), t("hero.primaryButton"));
    text($("[data-hero-secondary]"), t("hero.secondaryButton"));
    text($("[data-cup-text]"), (t("brand.cupText") + " • ").repeat(2));
    html($("[data-cup-logo]"), S.brand.logo ? `<img src="${esc(S.brand.logo)}" alt="">` : esc((S.brand.name || "К").trim()[0]));
    text($("[data-cup-name]"), S.brand.name);

    // О нас
    text($("[data-about-label]"), t("about.label"));
    html($("[data-about-title]"), rich(t("about.title")));
    text($("[data-about-text]"), t("about.text"));
    html($("[data-about-media]"), ph(S.aboutImg || "", t("about.imgLabel"), "ph--tall"));
    text($("[data-badge-text]"), t("about.badge").repeat(3));
    html($("[data-about-stats]"), (t("about.stats") || []).map((s) => `<div><dt>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`).join(""));

    // Ленты мелких фото
    const [ga, gb] = splitRows(S.gallery);
    html($("[data-gallery-a]"), rowHtml(ga));
    html($("[data-gallery-b]"), rowHtml(gb, 3));
    const [sa, sb] = splitRows(S.strip || [...S.gallery].reverse());
    html($("[data-strip-a]"), rowHtml(sa, 1));
    html($("[data-strip-b]"), rowHtml(sb, 4));

    // Выпечка и кофе
    html($("[data-show-title]"), rich(t("showcase.title")));
    text($("[data-show-sub]"), t("showcase.subtitle"));
    html($("[data-show-list]"), M.showcase.map((it, i) => {
      const p = byId[it.productId] || {};
      const tag = tagText(it.tag || p.tag);
      return `<article class="show-item">
        <div class="show-item__media">${tag ? `<span class="tag">${esc(tag)}</span>` : ""}${ph(it.img || p.img, pName(it.productId))}</div>
        <div class="show-item__text">
          <span class="show-item__num">${String(i + 1).padStart(2, "0")}</span>
          <h3>${esc(pName(it.productId))}</h3>
          <p>${esc(t(`showcase.descs.${it.productId}`) || pDesc(it.productId))}</p>
          <div class="show-item__row"><span>${esc(p.meta || "")}</span><b>${money(p.price)}</b></div>
          <button class="add-link" data-add="${esc(it.productId)}"><i>+</i> ${esc(t("order.add"))}</button>
        </div>
      </article>`;
    }).join(""));

    // Кофейная карта
    text($("[data-coffee-label]"), t("coffee.label"));
    html($("[data-coffee-title]"), rich(t("coffee.title")));
    text($("[data-coffee-text]"), t("coffee.text"));
    html($("[data-coffee-list]"), M.coffee.map((id, i) => {
      const p = byId[id] || {};
      return `<li data-preview="${i}"><div><h3>${esc(pName(id))}</h3><p>${esc(t(`coffee.descs.${id}`) || pDesc(id))}</p></div><b>${money(p.price)}</b></li>`;
    }).join(""));

    // Круговая витрина
    text($("[data-vitrine-label]"), t("vitrine.label"));
    html($("[data-vitrine-title]"), rich(t("vitrine.title")));
    text($("[data-vitrine-ring]"), t("vitrine.ring").toUpperCase().repeat(6));
    const namesRow = M.vitrine.map((v) => `<span>${esc(pName(v.productId))}</span>`).join("");
    html($("[data-vitrine-names]"), namesRow + namesRow);
    html($("[data-orbit]"), M.vitrine.map((v) => {
      const p = byId[v.productId] || {};
      return `<figure class="orb">${ph(v.img || p.img, pName(v.productId), "ph--round", true)}
        <figcaption>${esc(pName(v.productId))} · ${money(p.price)}</figcaption></figure>`;
    }).join(""));

    // Заказ
    html($("[data-order-title]"), rich(t("order.title")));
    html($("[data-order-steps]"), (t("order.steps") || []).map((s) => `<li>${esc(s)}</li>`).join(""));
    const sel = $("[data-branch-select]"); const cur = sel.value || "0";
    html(sel, branches.map((b, i) => `<option value="${i}">${esc(bText(b, "address"))}</option>`).join(""));
    sel.value = cur;
    text($("[data-checkout]"), t("cart.checkout"));
    text($("[data-cart-note]"), t("cart.note"));
    renderKaspi();

    // Подвал
    const tel = S.contacts.phone;
    const phoneEl = $("[data-phone]"); text(phoneEl, tel || ""); phoneEl.href = telHref(tel); phoneEl.hidden = !tel;
    const mailEl = $("[data-email]"); text(mailEl, S.contacts.email || ""); mailEl.href = "mailto:" + (S.contacts.email || ""); mailEl.hidden = !S.contacts.email;
    html($("[data-branches]"), branches.map((b) => `<div><h4>${esc(bText(b, "name"))}</h4><p>${esc(bText(b, "address"))}<br>${esc(bText(b, "hours"))}<br>` +
      `<a href="${telHref(b.phone)}">${esc(b.phone)}</a>${b.whatsapp ? ` · <a href="https://wa.me/${I.digits(b.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</p></div>`).join(""));
    text($("[data-timezone]"), t("timezone"));
    const C = S.contacts;
    const socials = [["Instagram", C.instagram], ["WhatsApp", C.whatsapp ? "https://wa.me/" + I.digits(C.whatsapp) : ""], ["Telegram", C.telegram], ["2ГИС", C.twoGis]]
      .filter(([, href]) => href);
    html($("[data-socials]"), socials.map(([label, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`).join(""));
    html($("[data-docs]"), ["privacy", "consent", "offer"].map((d) => `<a href="${d}.html">${esc(t("footer.docs." + d))}</a>`).join(""));
    html($("[data-legal]"),
      `<span>${esc(t("footer.seller"))}: ${I.legalHtml("operatorName")}</span>` +
      `<span>${esc(t("footer.binIin"))}: ${I.legalHtml("binIin")}</span>` +
      `<span>${esc(t("footer.address"))}: ${I.legalHtml("legalAddress")}</span>` +
      `<span>© ${new Date().getFullYear()}, ${esc(S.brand.name)}</span>`);

    renderModalTexts();
    renderChips(); renderGrid(); renderCart();
    I.applyLang();
  }

  function renderKaspi() {
    const K = S.kaspi || {};
    const parts = [];
    if (K.qrImage) parts.push(`<img src="${esc(K.qrImage)}" alt="Kaspi QR" loading="lazy"><span>${esc(t("footer.kaspiQr"))}</span>`);
    if (K.shopUrl) parts.push(`<a href="${esc(K.shopUrl)}" target="_blank" rel="noopener">${esc(t("footer.kaspiShop"))}</a>`);
    $$("[data-kaspi]").forEach((el) => { el.innerHTML = parts.join(""); el.hidden = !parts.length; });
  }

  /* =====================================================================
     КАТАЛОГ И КОРЗИНА
     ===================================================================== */
  const sizeIdx = {}; // выбранный объём по id товара
  let filter = "all";
  const STORE = "cart:" + (S.brand.name || "site");
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { cart = []; }
  cart = cart.filter((l) => byId[l.id]);

  const unitPrice = (p, si) => (p.sizes && p.sizes[si] && p.sizes[si].price != null ? p.sizes[si].price : p.price);
  const sizeLabel = (p, si) => (p.sizes && p.sizes[si] ? p.sizes[si].label : "");

  function renderChips() {
    const count = (id) => products.filter((p) => id === "all" || p.cat === id).length;
    const all = [["all", t("order.all")], ...M.categories.map((c) => [c, t("categories." + c)])];
    html($("[data-chips]"), all.map(([id, label]) =>
      `<button class="chip" role="tab" aria-selected="${id === filter}" data-chip="${esc(id)}">${esc(label)}<sup>${count(id)}</sup></button>`).join(""));
  }
  function renderGrid() {
    html($("[data-grid]"), products.filter((p) => filter === "all" || p.cat === filter).map((p, i) => {
      const si = sizeIdx[p.id] || 0;
      const sizes = p.sizes ? `<div class="sizes" role="group" aria-label="${esc(t("order.sizeAria"))}">${p.sizes.map((s, k) =>
        `<button aria-pressed="${k === si}" data-size="${esc(p.id)}:${k}">${esc(s.label)}</button>`).join("")}</div>` : "";
      const tag = tagText(p.tag);
      return `<article class="card" style="animation-delay:${Math.min(i, 10) * 35}ms">
        ${tag ? `<span class="tag">${esc(tag)}</span>` : ""}${ph(p.img, pName(p.id), "", true)}
        <div class="card__body">
          <h3>${esc(pName(p.id))}</h3><p>${esc(pDesc(p.id))}</p>
          ${p.meta ? `<span class="card__meta">${esc(p.meta)}</span>` : ""}${sizes}
          <div class="card__foot"><b>${money(unitPrice(p, si))}</b>
            <button class="plus" data-add="${esc(p.id)}" aria-label="${esc(t("order.addAria"))}: ${esc(pName(p.id))}">+</button></div>
        </div></article>`;
    }).join(""));
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(cart)); } catch (e) { /* ничего */ } }
  function totals() {
    let qty = 0, sum = 0, unknown = false;
    cart.forEach((l) => { const pr = unitPrice(byId[l.id], l.size); qty += l.qty; if (pr == null) unknown = true; else sum += pr * l.qty; });
    return { qty, total: unknown ? null : sum };
  }
  function renderCart() {
    const list = $("[data-cart-items]");
    if (!cart.length) list.innerHTML = `<li class="empty">${esc(t("cart.empty"))}</li>`;
    else list.innerHTML = cart.map((l, i) => {
      const p = byId[l.id]; const sz = sizeLabel(p, l.size); const pr = unitPrice(p, l.size);
      return `<li><span>${esc(pName(p.id))}${sz ? `<br><small>${esc(sz)}</small>` : ""}</span>
        <span class="qty"><button data-dec="${i}" aria-label="${esc(t("cart.less"))}">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="${esc(t("cart.more"))}">+</button></span>
        <small>${money(pr)} ${esc(t("cart.perUnit"))}</small><small style="text-align:right">${pr == null ? "—" : money(pr * l.qty)}</small></li>`;
    }).join("");
    const tt = totals();
    text($("[data-cart-qty]"), tt.qty);
    text($("[data-cart-total]"), money(tt.total));
    const cnt = $("[data-cart-count]"); text(cnt, tt.qty);
    cnt.classList.remove("bump"); void cnt.offsetWidth; if (tt.qty) cnt.classList.add("bump");
    $("[data-checkout]").disabled = !cart.length;
    $("[data-cart-bar]").hidden = !cart.length;
    text($("[data-cart-bar-total]"), `${tt.qty} ${t("cart.pcs")} · ${money(tt.total)}`);
    save();
  }
  function add(id, btn) {
    const p = byId[id]; if (!p) return;
    const si = sizeIdx[id] || 0;
    const line = cart.find((l) => l.id === id && l.size === si);
    line ? line.qty++ : cart.push({ id, size: si, qty: 1 });
    renderCart();
    if (btn) { btn.classList.add("done"); const old = btn.innerHTML; if (btn.classList.contains("plus")) btn.textContent = "✓"; setTimeout(() => { btn.classList.remove("done"); btn.innerHTML = old; }, 900); }
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button, a"); if (!b) return;
    if (b.dataset.add !== undefined) { if (b.dataset.add) add(b.dataset.add, b); else location.hash = "#order"; }
    else if (b.dataset.chip) { filter = b.dataset.chip; renderChips(); renderGrid(); }
    else if (b.dataset.size) { const [id, k] = b.dataset.size.split(":"); sizeIdx[id] = +k; renderGrid(); }
    else if (b.dataset.inc) { cart[+b.dataset.inc].qty++; renderCart(); }
    else if (b.dataset.dec) { const l = cart[+b.dataset.dec]; if (--l.qty <= 0) cart.splice(+b.dataset.dec, 1); renderCart(); }
    else if (b.hasAttribute("data-open-cart")) openCart();
    else if (b.hasAttribute("data-close-cart")) closeCart();
    else if (b.hasAttribute("data-checkout")) openModal();
    else if (b.hasAttribute("data-modal-close")) closeModal();
    else if (b.hasAttribute("data-clear-cart")) { cart = []; renderCart(); closeModal(); }
    else if (b.hasAttribute("data-dd-toggle")) { const dd = b.parentElement; const o = dd.classList.toggle("open"); b.setAttribute("aria-expanded", o); }
    else if (b.hasAttribute("data-burger")) $("#nav").classList.toggle("menu-open");
    if (b.closest("[data-nav]")) $("#nav").classList.remove("menu-open");
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".contacts-dd")) $(".contacts-dd").classList.remove("open"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $(".contacts-dd").classList.remove("open"); closeCart(); $("#nav").classList.remove("menu-open"); } });

  const isDrawer = () => matchMedia("(max-width: 1080px)").matches;
  function closeCart() { $("[data-cart]").classList.remove("open"); document.body.classList.remove("cart-open"); }
  function openCart() {
    if (isDrawer()) { $("[data-cart]").classList.add("open"); document.body.classList.add("cart-open"); }
    else if (window.__lenis) window.__lenis.scrollTo($("#order"), { duration: 1.4 });
    else $("#order").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* =====================================================================
     ОФОРМЛЕНИЕ ЗАКАЗА
     whatsapp — сайт ничего не сохраняет и не отправляет: собирает текст и открывает WhatsApp филиала.
     server   — POST на submitUrl (сервер должен быть в РК), обязательное согласие на обработку ПД.
     ===================================================================== */
  const MODE = S.orderMode === "server" ? "server" : "whatsapp";
  const modal = $("[data-modal]");
  const form = $("[data-form]");
  const submitBtn = form.querySelector('[type="submit"]');
  const errBox = $("[data-form-error]");
  $$("[data-server-only]").forEach((el) => { el.hidden = MODE !== "server"; });
  if (MODE !== "server") $$("[data-server-only] input").forEach((i) => { i.disabled = true; });

  // ссылка внутри текста: «… {link}условиями заказа{/link}»
  const withLink = (str, href) => esc(str).replace("{link}", `<a href="${href}" target="_blank">`).replace("{/link}", "</a>");
  function renderModalTexts() {
    text($("[data-modal-title]"), t(MODE === "server" ? "modal.titleServer" : "modal.titleWa"));
    html($("[data-agree-offer]"), withLink(t("modal.agreeOffer"), "offer.html"));
    html($("[data-agree-pd]"), withLink(t("modal.agreePd"), "consent.html"));
    text($("[data-modal-fine]"), t(MODE === "server" ? "modal.fineServer" : "modal.fineWa"));
    if (!submitBtn.dataset.busy) text(submitBtn, t(MODE === "server" ? "modal.submitServer" : "modal.submitWa"));
    if (modal.open) updateSummary();
  }
  // Кнопка активна, только когда отмечены все обязательные галочки
  const requiredChecks = () => $$('input[type="checkbox"][data-required]', form).filter((i) => !i.disabled);
  const syncSubmit = () => { submitBtn.disabled = !requiredChecks().every((i) => i.checked) || !!submitBtn.dataset.busy; };
  form.addEventListener("change", syncSubmit);

  // Маска телефона Казахстана: +7 (7XX) XXX-XX-XX
  const phoneInput = form.elements.phone;
  const formatKz = (v) => {
    let d = I.digits(v);
    if (d.startsWith("8")) d = "7" + d.slice(1);
    if (d && !d.startsWith("7")) d = "7" + d;
    // 10 цифр без кода страны (701 123 45 67): первая 7 — это начало номера, а не код
    if (d.length === 10 && d[1] !== "7") d = "7" + d;
    d = d.slice(0, 11);
    const p = d.slice(1);
    let out = "+7";
    if (p.length) out += " (" + p.slice(0, 3);
    if (p.length >= 3) out += ")";
    if (p.length > 3) out += " " + p.slice(3, 6);
    if (p.length > 6) out += "-" + p.slice(6, 8);
    if (p.length > 8) out += "-" + p.slice(8, 10);
    return out;
  };
  const validKz = (v) => /^77\d{9}$/.test(I.digits(v));
  phoneInput.addEventListener("input", () => { phoneInput.value = formatKz(phoneInput.value); });
  phoneInput.addEventListener("focus", () => { if (!phoneInput.value) phoneInput.value = "+7 (7"; });

  const branchNow = () => branches[+$("[data-branch-select]").value] || branches[0];
  function updateSummary() {
    const tt = totals(), b = branchNow();
    text($("[data-modal-summary]"), t("modal.summary", { qty: tt.qty, total: money(tt.total), branch: b ? bText(b, "address") : "" }));
  }
  function openModal() {
    updateSummary();
    form.hidden = false; $("[data-done]").hidden = true; errBox.hidden = true;
    requiredChecks().forEach((i) => { i.checked = false; });
    syncSubmit();
    closeCart();
    modal.showModal();
  }
  function closeModal() { modal.close(); }
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  const orderLines = () => cart.map((l) => {
    const p = byId[l.id]; const pr = unitPrice(p, l.size); const sz = sizeLabel(p, l.size);
    return { id: p.id, name: pName(p.id), size: sz, qty: l.qty, price: pr, sum: pr == null ? null : pr * l.qty };
  });
  function waUrl(orderNo, comment) {
    const b = branchNow(), tt = totals();
    const lines = [
      t("wa.hello", { brand: S.brand.name, no: orderNo }),
      `${t("wa.branch")}: ${bText(b, "address")}`,
      "",
      ...orderLines().map((l) => `— ${l.name}${l.size ? ` (${l.size})` : ""} × ${l.qty} = ${money(l.sum)}`),
      "",
      `${t("wa.total")}: ${money(tt.total)}`,
    ];
    if (comment) lines.push(`${t("wa.comment")}: ${comment}`);
    lines.push(t("wa.pay"));
    return `https://wa.me/${I.digits(b.whatsapp)}?text=${encodeURIComponent(lines.join("\n"))}`;
  }
  const showError = (msg) => { errBox.textContent = msg; errBox.hidden = false; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    if (!requiredChecks().every((i) => i.checked)) return;
    const orderNo = String(Date.now()).slice(-5);
    const comment = (form.elements.comment.value || "").trim();

    if (MODE === "whatsapp") {
      const b = branchNow();
      if (!b || !I.digits(b.whatsapp)) { showError(t("modal.noWa", { phone: (b && b.phone) || S.contacts.phone })); return; }
      const url = waUrl(orderNo, comment);
      window.open(url, "_blank", "noopener");
      text($("[data-done-title]"), t("modal.doneWaTitle"));
      text($("[data-done-text]"), t("modal.doneWaText", { no: orderNo }));
      const again = $("[data-wa-again]"); again.href = url; again.hidden = false; text(again, t("modal.openWaAgain"));
      $("[data-clear-cart]").hidden = false;
      form.hidden = true; $("[data-done]").hidden = false;
      return; // ничего не сохраняем и никуда не отправляем
    }

    // ---- режим server ----
    const name = (form.elements.name.value || "").trim();
    if (!name) { showError(t("modal.errName")); return; }
    if (!validKz(phoneInput.value)) { showError(t("modal.errPhone")); return; }
    const payload = {
      orderNo, lang: I.lang, name, phone: "+" + I.digits(phoneInput.value), comment,
      branch: bText(branchNow(), "address"), items: orderLines(), total: totals().total,
      consent: { offer: true, personalData: true, docsDate: (S.legal || {}).docsDate || "" },
    };
    submitBtn.dataset.busy = "1"; syncSubmit(); text(submitBtn, t("modal.sending"));
    try {
      if (!S.submitUrl) throw new Error("submitUrl не задан в js/config.js");
      const r = await fetch(S.submitUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(String(r.status));
    } catch (err) {
      console.warn("Заказ не отправлен:", err);
      delete submitBtn.dataset.busy; syncSubmit(); text(submitBtn, t("modal.submitServer"));
      showError(t("modal.errServer", { phone: S.contacts.phone }));
      return;
    }
    delete submitBtn.dataset.busy; text(submitBtn, t("modal.submitServer"));
    text($("[data-done-title]"), t("modal.doneServerTitle"));
    text($("[data-done-text]"), t("modal.doneServerText", { no: orderNo }));
    $("[data-wa-again]").hidden = true; $("[data-clear-cart]").hidden = true;
    form.hidden = true; $("[data-done]").hidden = false;
    form.reset(); cart = []; renderCart();
  });

  renderPage();

  /* =====================================================================
     АНИМАЦИИ — один общий цикл на всю страницу.
     Размеры блоков замеряются заранее (при загрузке и изменении окна),
     а в каждом кадре только считаем и записываем.
     ===================================================================== */
  requestAnimationFrame(() => document.body.classList.add("ready"));

  // Общий «тикер»: сюда же подключается 3D-сцена из cup3d.js (window.__ticker.add)
  const tasks = new Set();
  window.__ticker = { add: (fn) => { tasks.add(fn); return () => tasks.delete(fn); } };

  /* ---------- Плавная прокрутка (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1, syncTouch: false });
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute("href"); if (id.length < 2) return;
      const el = document.querySelector(id); if (!el) return;
      e.preventDefault();
      lenis.scrollTo(id === "#top" ? 0 : flowTop(el), { lerp: 0.08 });
    });
  }
  window.__lenis = lenis;

  let lastT = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
    if (lenis) lenis.raf(now);
    tasks.forEach((fn) => fn(now, dt));
  }
  requestAnimationFrame(tick);

  /* ---------- Замеры (только здесь читаем размеры) ---------- */
  const nav = $("#nav");
  const hero = $("#hero");
  const sheet = $(".sheet");
  const footer = $("#contacts");
  const progress = $("[data-progress]");
  const showPath = $("[data-show-path]");
  if (showPath) { showPath.setAttribute("pathLength", "1"); showPath.style.strokeDasharray = "1"; }

  const docTop = (el) => { let tp = 0; for (let e = el; e; e = e.offsetParent) tp += e.offsetTop; return tp; };
  let vh = innerHeight, maxScroll = 1, layers = [], linkTops = [], showTop = 0, showH = 1, flow = new Map();
  const flowTop = (el) => (flow.has(el) ? flow.get(el) : docTop(el));
  const navLinks = () => $$("[data-nav] a");

  function measure() {
    vh = innerHeight;
    flow = new Map();
    let tp = docTop(sheet);
    const secs = [...sheet.children].map((el) => {
      tp += parseFloat(getComputedStyle(el).marginTop) || 0;
      const top = tp, h = el.offsetHeight; tp += h;
      flow.set(el, top);
      const stick = el.classList.contains("stack") ? Math.min(0, vh - h) : null;
      if (stick !== null) el.style.top = stick + "px";
      return { el, top, h, stick, dark: el.classList.contains("dark") };
    });
    const fTop = docTop(footer); flow.set(footer, fTop);
    layers = [{ el: hero, top: 0, h: hero.offsetHeight, stick: 0, dark: true }, ...secs,
              { el: footer, top: fTop, h: footer.offsetHeight, stick: null, dark: true }];
    secs.forEach((s, i) => { s.next = secs[i + 1] || null; });
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    linkTops = navLinks().map((a) => { const el = document.querySelector(a.getAttribute("href")); return el ? flowTop(el) : Infinity; });
    const sc = $("#menu"); if (sc) { showTop = flowTop(sc); showH = sc.offsetHeight; }
    measureRows(); layoutRing();
    lastY = -1; lastActive = -2;
  }
  const visTop = (L, y) => (L.stick === null ? L.top - y : Math.max(L.top - y, L.stick));

  /* ---------- Всё, что зависит от прокрутки — раз за кадр ---------- */
  let lastY = -1, lastDark = null, lastActive = -2;
  window.__ticker.add(() => {
    const y = scrollY; if (y === lastY) return; lastY = y;
    let top = layers[0];
    for (const L of layers) { const vt = visTop(L, y); if (vt <= 34 && vt + L.h > 34) top = L; }
    const dark = top.dark;
    if (dark !== lastDark) { nav.classList.toggle("is-light", !dark); lastDark = dark; }
    nav.classList.toggle("is-dark", dark && y > 40);
    progress.style.transform = `scaleY(${Math.min(1, y / maxScroll).toFixed(4)})`;
    let active = -1; linkTops.forEach((lt, i) => { if (lt - y < vh * 0.4) active = i; });
    if (active !== lastActive) { navLinks().forEach((a, i) => a.classList.toggle("is-active", i === active)); lastActive = active; }
    if (showPath) showPath.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, (vh * 0.6 - (showTop - y)) / showH)));
    layers.forEach((L) => {
      if (L.stick === null || !L.next) return;
      const k = Math.min(1, Math.max(0, 1 - visTop(L.next, y) / vh));
      const v = Math.round(k * 0.35 * 100) / 100;
      if (v !== L.dim) { L.el.style.setProperty("--dim", v); L.dim = v; }
    });
    if (!cssRows) moveRows(y);
  });

  /* ---------- Ленты фото: их двигает прокрутка ----------
     В Chrome/Edge — сам браузер (CSS animation-timeline), иначе — запасной вариант ниже. */
  const cssRows = !reduceMotion && window.CSS && CSS.supports && CSS.supports("animation-timeline: view()");
  document.documentElement.classList.toggle("css-rows", !!cssRows);
  const rows = $$(".row__track").map((el, i) => ({ el, dir: i % 2 ? -1 : 1, w: 0, vis: false, shift: i * 137 }));
  function measureRows() { rows.forEach((r) => { r.w = r.el.scrollWidth / 3; }); }
  const rowIO = new IntersectionObserver((ens) => ens.forEach((en) => {
    const r = rows.find((x) => x.el === en.target); if (r) r.vis = en.isIntersecting;
  }), { rootMargin: "200px 0px" });
  if (!cssRows) rows.forEach((r) => rowIO.observe(r.el));
  const ROW_SPEED = 0.45;
  function moveRows(y) {
    if (reduceMotion) return;
    rows.forEach((r) => {
      if (!r.vis || !r.w) return;
      const off = (((r.dir * y * ROW_SPEED + r.shift) % r.w) + r.w) % r.w;
      r.el.style.transform = `translate3d(${(off - r.w).toFixed(1)}px,0,0)`;
    });
  }

  /* ---------- Элементы, которые пересоздаются при смене языка ---------- */
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.25 });

  const pv = $("[data-hover-preview]");
  let pvX = 0, pvY = 0, tx = 0, ty = 0, pvOn = false;
  window.__ticker.add(() => {
    if (!pvOn) return;
    pvX += (tx - pvX) * 0.18; pvY += (ty - pvY) * 0.18;
    pv.style.transform = `translate3d(${(pvX + 24).toFixed(1)}px, ${(pvY - 110).toFixed(1)}px, 0)`;
  });

  let orbs = [], orbZ = [];
  function bindDynamic() {
    $$(".show-item").forEach((el) => io.observe(el));
    $$("[data-preview]").forEach((li) => {
      li.addEventListener("pointerenter", (e) => {
        const id = M.coffee[+li.dataset.preview]; const p = byId[id] || {};
        pv.innerHTML = ph(p.img, pName(id), "", true);
        tx = pvX = e.clientX; ty = pvY = e.clientY;
        pv.classList.add("show"); pvOn = true;
      });
      li.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });
      li.addEventListener("pointerleave", () => { pv.classList.remove("show"); pvOn = false; });
    });
    orbs = $$(".orb"); orbZ = orbs.map(() => -1);
  }
  bindDynamic();

  /* ---------- Витрина: кольцо в перспективе ---------- */
  const vStage = $("[data-vitrine-stage]");
  const ringText = $("[data-vitrine-ring]");
  const ringPath = $("#ringEllipse");
  const ringSvg = $(".vitrine__ring");
  const names = $("[data-vitrine-names]");
  let RX = 400, RY = 130, CX = 500, CY = 220, namesW = 1, ringUnit = 0;
  function layoutRing() {
    if (!vStage) return;
    const w = vStage.clientWidth, h = vStage.clientHeight;
    CX = w / 2; CY = h * 0.47; RX = Math.min(w * 0.36, 560); RY = Math.min(h * 0.26, RX * 0.36);
    ringSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    ringPath.setAttribute("d", `M ${CX - RX * 1.08} ${CY} A ${RX * 1.08} ${RY * 1.12} 0 0 0 ${CX + RX * 1.08} ${CY}`);
    const tr = $(".vitrine__track");
    tr.setAttribute("cx", CX); tr.setAttribute("cy", CY); tr.setAttribute("rx", RX); tr.setAttribute("ry", RY);
    namesW = names ? names.scrollWidth / 2 || 1 : 1;
    ringUnit = ringText ? ringText.getComputedTextLength() / 6 || 0 : 0;
  }
  let ringA = 0, ringVis = false, ringLastY = scrollY;
  if (vStage) new IntersectionObserver(([en]) => { ringVis = en.isIntersecting; }).observe(vStage);
  window.__ticker.add((now, dt) => {
    const dy = scrollY - ringLastY; ringLastY = scrollY;
    if (!ringVis) return;
    if (!reduceMotion) ringA += dt * 0.13 + dy * 0.0016;
    const n = orbs.length;
    orbs.forEach((o, i) => {
      const a = ringA + (i / n) * Math.PI * 2;
      const depth = (Math.cos(a) + 1) / 2;
      const x = CX + Math.sin(a) * RX, y = CY + Math.cos(a) * RY;
      const sc = 0.55 + depth * 0.55;
      o.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      o.style.opacity = (0.35 + depth * 0.65).toFixed(2);
      const z = Math.round(depth * 20);
      if (z !== orbZ[i]) { o.style.zIndex = String(z); orbZ[i] = z; }
    });
    if (ringText && ringUnit) ringText.setAttribute("startOffset", (-(((ringA * 260) % ringUnit) + ringUnit) % ringUnit - ringUnit).toFixed(1));
    if (names) names.style.transform = `translate3d(${(-(ringA * 220) % namesW).toFixed(1)}px,0,0)`;
  });

  /* ---------- Фото заранее, в паузах (замирает, пока страницу крутят) ---------- */
  let lastScrollT = 0;
  addEventListener("scroll", () => { lastScrollT = performance.now(); }, { passive: true });
  addEventListener("wheel", () => { lastScrollT = performance.now(); }, { passive: true });
  addEventListener("load", () => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 60));
    const queue = $$("img").filter((img) => !img.complete);
    const step = () => {
      if (!queue.length) return;
      if (performance.now() - lastScrollT < 800) { setTimeout(step, 400); return; }
      idle(async (d) => {
        if (d.timeRemaining() < 6 || performance.now() - lastScrollT < 800) { setTimeout(step, 200); return; }
        const img = queue.shift();
        if (img.isConnected) { img.loading = "eager"; try { await img.decode(); } catch (e) { /* заглушка */ } }
        setTimeout(step, 120);
      }, { timeout: 2000 });
    };
    setTimeout(step, 1200);
  });

  /* ---------- Когда пересчитывать размеры ---------- */
  let measureQueued = false;
  const queueMeasure = () => { if (measureQueued) return; measureQueued = true; requestAnimationFrame(() => { measureQueued = false; measure(); }); };
  addEventListener("resize", queueMeasure);
  addEventListener("load", queueMeasure);
  if (document.fonts) document.fonts.ready.then(queueMeasure);
  new ResizeObserver(queueMeasure).observe(sheet);
  measure();

  /* ---------- Смена языка: перерисовать тексты, не трогая анимации ---------- */
  I.onChange(() => { renderPage(); bindDynamic(); queueMeasure(); });
})();
