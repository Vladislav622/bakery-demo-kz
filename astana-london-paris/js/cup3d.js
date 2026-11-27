/* =====================================================================
   3D-сцена первого экрана: стаканчик и кофейные зёрна (Three.js).
   Надписи и эмблема на стаканчике рисуются из js/config.js, поэтому
   модель не нужно перерисовывать под каждого клиента.
   Если Three.js не загрузился, остаётся CSS-стаканчик (запасной вариант).
   ===================================================================== */
(() => {
  "use strict";
  // Пока 3D готовится, CSS-стаканчик не показываем (иначе он мелькнёт и сменится 3D-версией)
  const heroEl = document.getElementById("hero");
  const canWebGL = !!(window.THREE && window.WebGLRenderingContext);
  if (heroEl && canWebGL) heroEl.classList.add("has-3d");
  const fallback = () => { if (heroEl) heroEl.classList.remove("has-3d"); };

  const boot = () => {
  const T = window.THREE;
  const S = window.SITE;
  if (!T || !S) { console.warn("3D: библиотека Three.js не загрузилась (js/vendor/three.min.js) — показан запасной CSS-стаканчик"); return; }
  // HEX-цвета в sRGB, как в CSS
  if (T.ColorManagement) { if ("enabled" in T.ColorManagement) T.ColorManagement.enabled = true; else T.ColorManagement.legacyMode = false; }
  // С r155 свет считается физически: прежние яркости нужно умножить на π, чтобы картинка не изменилась
  const LI = (v) => v * (T.REVISION && +T.REVISION >= 155 ? Math.PI : 1);
  const srgb = (tex) => { if ("colorSpace" in tex) tex.colorSpace = T.SRGBColorSpace; else tex.encoding = T.sRGBEncoding; return tex; };

  // Уменьшать движение только если это включено в настройках сайта (config.js → motion)
  const reduceMotion = !!(window.SITE && window.SITE.motion && window.SITE.motion.respectReducedMotion)
    && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const DARK = () => css("--dark") || "#0E3A2E";
  const LIGHT = () => css("--light") || "#F2EFE7";
  const SLEEVE = () => css("--sleeve") || "#C9A47A";
  const SERIF = '"Cormorant Garamond", serif';
  const SANS = 'Manrope, "Segoe UI", sans-serif';
  // Надписи на стаканчике — на текущем языке сайта (js/config.js → i18n.*.brand)
  const TX = (k) => (window.I18N ? window.I18N.t("brand." + k) : "") || "";

  /* -------------------------------------------------------------------
     Общие помощники
     ------------------------------------------------------------------- */
  // Шейдеры собираются в фоне (KHR_parallel_shader_compile): ждём готовности,
  // не блокируя страницу, и только потом начинаем рисовать.
  function whenCompiled(r, cb) {
    const gl = r.getContext();
    const ext = gl.getExtension("KHR_parallel_shader_compile");
    if (!ext) { cb(); return; }
    const t0 = performance.now();
    const check = () => {
      const progs = r.info.programs || [];
      const done = progs.every((p) => gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR));
      if (done || performance.now() - t0 > 4000) cb(); else setTimeout(check, 40);
    };
    check();
  }

  // r158+: compileAsync собирает шейдеры в фоне и не держит страницу; иначе — обычная сборка
  function compileInBackground(r, sc, cam, cb) {
    if (r.compileAsync) r.compileAsync(sc, cam).then(cb, cb);
    else { r.compile(sc, cam); whenCompiled(r, cb); }
  }

  function makeRenderer(canvas) {
    const r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "default" });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    if ("outputColorSpace" in r) r.outputColorSpace = T.SRGBColorSpace; else r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.setClearColor(0x000000, 0);
    // не спрашиваем у драйвера статус сборки шейдера сразу — иначе страница ждёт его
    r.debug.checkShaderErrors = false;
    return r;
  }

  // Студийное окружение для отражений: тёмная комната с несколькими софтбоксами.
  function studioEnv(renderer, tint = 0xffffff) {
    const scene = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(20, 20, 20), new T.MeshBasicMaterial({ color: 0x1a1a1a, side: T.BackSide }));
    scene.add(room);
    const panel = (w, h, color, intensity, pos, look) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), side: T.DoubleSide }));
      m.position.set(...pos); m.lookAt(...look); scene.add(m);
    };
    panel(8, 5, 0xffffff, 5.5, [-6, 5, 6], [0, 0, 0]);   // ключевой свет слева-спереди
    panel(4, 9, 0xffffff, 2.2, [7, 1, 3], [0, 0, 0]);    // заполняющий справа
    panel(10, 3, tint, 2.6, [0, 9, -2], [0, 0, 0]);      // сверху
    panel(6, 6, tint, 1.6, [0, -2, -8], [0, 0, 0]);      // контровой сзади
    const pm = new T.PMREMGenerator(renderer);
    const tex = pm.fromScene(scene, 0.035).texture;
    pm.dispose();
    return tex;
  }

  // Мягкое пятно (тень, пар)
  function softTexture(inner = "rgba(0,0,0,.55)", size = 256) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d", { willReadFrequently: true });
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, inner); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, size, size);
    return srgb(new T.CanvasTexture(c));
  }

  function noise(g, w, h, amount, alpha) {
    const img = g.getImageData(0, 0, w, h); const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * amount;
      d[i] += n; d[i + 1] += n; d[i + 2] += n; d[i + 3] = alpha ?? d[i + 3];
    }
    g.putImageData(img, 0, 0);
  }

  function spacedText(g, text, x, y, spacing) {
    // текст с разрядкой, центрированный по x
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = x - total / 2;
    chars.forEach((ch, i) => { g.fillText(ch, cx + widths[i] / 2, y); cx += widths[i] + spacing; });
  }

  function circleText(g, text, cx, cy, r, size, color) {
    g.save(); g.fillStyle = color; g.font = `600 ${size}px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle";
    const chars = [...text]; const step = (Math.PI * 2) / chars.length;
    chars.forEach((ch, i) => {
      const a = -Math.PI / 2 + i * step;
      g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
    });
    g.restore();
  }

  /* -------------------------------------------------------------------
     Геометрия кофейного зерна: эллипсоид с плоской стороной и S-бороздкой
     ------------------------------------------------------------------- */
  function beanGeometry() {
    const geo = new T.SphereGeometry(1, 48, 32);
    const p = geo.attributes.position; const v = new T.Vector3();
    const colors = [];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      let x = v.x * 0.6, y = v.y * 0.43, z = v.z * 0.86;
      let shade = 1;
      if (y > 0) {
        y *= 0.62;                                       // плоская сторона
        const curve = 0.07 * Math.sin(z * 3.4);          // S-изгиб бороздки
        const d = (x - curve) / 0.085;
        const groove = Math.exp(-d * d) * (1 - Math.pow(Math.abs(z) / 0.86, 6));
        y -= 0.2 * groove;
        shade = 1 - 0.75 * groove;
      }
      p.setXYZ(i, x, y, z);
      colors.push(shade, shade, shade);
    }
    geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }

  function beanMaterial(env) {
    return new T.MeshStandardMaterial({
      color: 0x3a1f12, roughness: 0.34, metalness: 0, vertexColors: true, envMap: env, envMapIntensity: 1.15,
    });
  }

  /* -------------------------------------------------------------------
     Текстуры стаканчика (рисуются из настроек)
     ------------------------------------------------------------------- */
  const BODY_W = 2048, BODY_H = 1024;
  const SLEEVE_W = 2048, SLEEVE_H = 440;
  // Высоты (доля от верха корпуса)
  const SLEEVE_TOP = 0.25, SLEEVE_BOT = 0.67;

  function drawBody(c, logoImg) {
    const g = c.getContext("2d", { willReadFrequently: true }); const w = BODY_W, h = BODY_H; const dark = DARK();
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#FBFAF6"); grd.addColorStop(1, "#F3F1EA");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    noise(g, w, h, 6);
    g.fillStyle = dark; g.textAlign = "center"; g.textBaseline = "middle";
    // Надпись над манжетой — дважды по окружности (перед/зад)
    g.font = `600 30px ${SANS}`;
    const top = TX("cupText").toUpperCase();
    [0.25, 0.75].forEach((u) => spacedText(g, top, u * w, h * 0.16, 14));
    // Тонкие линии
    g.fillRect(0, h * 0.075, w, 3);
    // Под манжетой: название
    g.font = `600 22px ${SANS}`;
    const name = `${(S.brand.name || "").toUpperCase()}  ·  ${new Date().getFullYear()}`;
    [0.25, 0.75].forEach((u) => spacedText(g, name, u * w, h * 0.735, 12));
    // Зелёная полоса и тонкая линия
    g.fillRect(0, h * 0.8, w, h * 0.055);
    g.fillRect(0, h * 0.885, w, 4);
    // Мелкий текст на полосе
    g.fillStyle = "rgba(255,255,255,.85)"; g.font = `600 16px ${SANS}`;
    for (let i = 0; i < 6; i++) spacedText(g, TX("tagline").toUpperCase(), (i + 0.5) * (w / 6), h * 0.8275, 10);
  }

  function drawSleeve(c, logoImg) {
    const g = c.getContext("2d", { willReadFrequently: true }); const w = SLEEVE_W, h = SLEEVE_H; const dark = DARK(); const light = "#F5F1E8";
    const base = new T.Color(SLEEVE()).lerp(new T.Color("#B9AE9E"), 0.3);
    const col = (k) => { const cc = base.clone().multiplyScalar(k); return `rgb(${Math.min(255, cc.r * 255) | 0},${Math.min(255, cc.g * 255) | 0},${Math.min(255, cc.b * 255) | 0})`; };
    g.fillStyle = col(1); g.fillRect(0, 0, w, h);
    // Волокна картона
    for (let i = 0; i < 2600; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? "60,35,15" : "255,240,220"},${0.03 + Math.random() * 0.05})`;
      g.lineWidth = Math.random() * 1.6;
      const x = Math.random() * w, y = Math.random() * h, l = 6 + Math.random() * 30;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (Math.random() - 0.5) * 3); g.stroke();
    }
    // Гофра — мелкие горизонтальные рёбра
    for (let y = 0; y < h; y += 7) { g.fillStyle = "rgba(60,35,15,.07)"; g.fillRect(0, y, w, 2); }
    noise(g, w, h, 16);
    // Кромки
    g.fillStyle = col(0.82); g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5);

    // Эмблема — дважды по окружности
    [0.25, 0.75].forEach((u) => {
      const cx = u * w, cy = h / 2, R = h * 0.42;
      g.save();
      g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 8;
      g.fillStyle = dark; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
      g.restore();
      g.strokeStyle = light; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, R * 0.92, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R * 0.6, 0, Math.PI * 2); g.stroke();
      const ring = (TX("cupText") + " • ").toUpperCase();
      circleText(g, ring.repeat(Math.max(1, Math.round(44 / ring.length))), cx, cy, R * 0.76, 17, light);
      // Центр: логотип или первая буква названия
      if (logoImg) {
        const s = R * 0.95;
        try { g.drawImage(logoImg, cx - s / 2, cy - s / 2, s, s); } catch (e) { /* файл с другого адреса */ }
      } else {
        g.fillStyle = light; g.font = `italic 500 ${R * 0.75}px ${SERIF}`; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText((S.brand.name || "Л").trim()[0], cx, cy + R * 0.04);
      }
    });
  }

  /* -------------------------------------------------------------------
     Сцена первого экрана
     ------------------------------------------------------------------- */
  const hero = document.getElementById("hero");
  if (!hero) return;
  const canvas = document.createElement("canvas");
  canvas.className = "hero__3d";
  canvas.setAttribute("aria-hidden", "true");
  hero.appendChild(canvas);

  let renderer;
  try { renderer = makeRenderer(canvas); } catch (e) { console.warn("3D: браузер не дал WebGL — показан запасной CSS-стаканчик", e); canvas.remove(); fallback(); return; } // нет WebGL — остаётся CSS-версия
  hero.classList.add("has-3d");

  const scene = new T.Scene();
  const darkCol = new T.Color(DARK());
  scene.fog = new T.Fog(darkCol, 11, 21);
  const env = studioEnv(renderer, 0xcfe8dc);
  scene.environment = env;

  const camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.25, 12);

  // Свет
  scene.add(new T.HemisphereLight(0xffffff, 0x0d2a21, LI(0.55)));
  const key = new T.DirectionalLight(0xfff4e6, LI(1.9)); key.position.set(-4, 5, 6); scene.add(key);
  const rim = new T.DirectionalLight(0x9ed2b4, LI(1.6)); rim.position.set(5, 2, -5); scene.add(rim);
  const fill = new T.DirectionalLight(0xffffff, LI(0.35)); fill.position.set(4, -2, 5); scene.add(fill);

  /* ---- Стаканчик ---- */
  const H = 3.0, RT = 1.08, RB = 0.8;
  const rAt = (fromTop) => RT + (RB - RT) * fromTop; // радиус на доле высоты от верха

  const cupRoot = new T.Group();   // позиция, наклон, парение
  const cupSpin = new T.Group();   // вращение вокруг оси
  cupRoot.add(cupSpin); scene.add(cupRoot);

  const bodyCanvas = document.createElement("canvas"); bodyCanvas.width = BODY_W; bodyCanvas.height = BODY_H;
  const sleeveCanvas = document.createElement("canvas"); sleeveCanvas.width = SLEEVE_W; sleeveCanvas.height = SLEEVE_H;
  const bodyTex = new T.CanvasTexture(bodyCanvas);
  const sleeveTex = new T.CanvasTexture(sleeveCanvas);
  [bodyTex, sleeveTex].forEach((t) => { srgb(t); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); });

  let logoImg = null;
  const paint = () => { drawBody(bodyCanvas, logoImg); drawSleeve(sleeveCanvas, logoImg); bodyTex.needsUpdate = true; sleeveTex.needsUpdate = true; };
  paint();
  if (document.fonts) document.fonts.ready.then(paint);
  if (window.I18N) window.I18N.onChange(paint); // смена языка — новые надписи
  if (S.brand.logo) {
    const im = new Image();
    im.onload = () => { logoImg = im; paint(); };
    im.src = S.brand.logo;
  }

  const SEG = 96;
  // Корпус
  const body = new T.Mesh(
    new T.CylinderGeometry(RT, RB, H, SEG, 1, true),
    new T.MeshStandardMaterial({ map: bodyTex, roughness: 0.46, envMapIntensity: 0.6 })
  );
  cupSpin.add(body);
  // Внутренняя стенка (бумага с лёгким кофейным налётом) — чтобы стакан не был «пустым» изнутри
  const inner = new T.Mesh(
    new T.CylinderGeometry(RT - 0.012, RB - 0.012, H - 0.01, SEG, 1, true),
    new T.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.8, side: T.BackSide })
  );
  cupSpin.add(inner);
  // Напиток: капучино с пенкой, уровень чуть ниже края
  const DRINK_Y = H / 2 - 0.2;
  const drinkR = RT + (RB - RT) * (0.2 / H) - 0.015;
  const cremaCanvas = document.createElement("canvas"); cremaCanvas.width = cremaCanvas.height = 512;
  (() => {
    const g = cremaCanvas.getContext("2d", { willReadFrequently: true });
    const grd = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grd.addColorStop(0, "#d9b48a"); grd.addColorStop(0.55, "#b9834f"); grd.addColorStop(0.85, "#8a5530"); grd.addColorStop(1, "#5e3519");
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    // латте-арт: сердечко из молочной пены
    g.fillStyle = "rgba(246,236,220,.92)";
    g.beginPath(); g.moveTo(256, 360);
    g.bezierCurveTo(130, 270, 150, 150, 230, 170); g.bezierCurveTo(250, 175, 256, 195, 256, 210);
    g.bezierCurveTo(256, 195, 262, 175, 282, 170); g.bezierCurveTo(362, 150, 382, 270, 256, 360); g.fill();
    noise(g, 512, 512, 10);
  })();
  const cremaTex = srgb(new T.CanvasTexture(cremaCanvas));
  const drink = new T.Mesh(new T.CircleGeometry(drinkR, SEG), new T.MeshStandardMaterial({ map: cremaTex, roughness: 0.5 }));
  drink.rotation.x = -Math.PI / 2; drink.position.y = DRINK_Y; cupSpin.add(drink);
  // Дно
  const bottom = new T.Mesh(new T.CircleGeometry(RB, SEG), new T.MeshStandardMaterial({ color: 0xe9e6de, roughness: 0.6, side: T.DoubleSide }));
  bottom.rotation.x = Math.PI / 2; bottom.position.y = -H / 2; cupSpin.add(bottom);
  const bottomRim = new T.Mesh(new T.TorusGeometry(RB - 0.01, 0.025, 12, SEG), new T.MeshStandardMaterial({ color: 0xdcd8cf, roughness: 0.5 }));
  bottomRim.rotation.x = Math.PI / 2; bottomRim.position.y = -H / 2 + 0.02; cupSpin.add(bottomRim);

  // Манжета — чуть шире корпуса
  const sTop = rAt(SLEEVE_TOP) + 0.028, sBot = rAt(SLEEVE_BOT) + 0.028;
  const sleeveH = H * (SLEEVE_BOT - SLEEVE_TOP);
  const sleeve = new T.Mesh(
    new T.CylinderGeometry(sTop, sBot, sleeveH, SEG, 1, true),
    new T.MeshStandardMaterial({ map: sleeveTex, roughness: 0.9, metalness: 0, envMapIntensity: 0.3 })
  );
  sleeve.position.y = H / 2 - H * (SLEEVE_TOP + SLEEVE_BOT) / 2;
  cupSpin.add(sleeve);
  // Торцы манжеты (толщина картона)
  [[sTop, sleeve.position.y + sleeveH / 2], [sBot, sleeve.position.y - sleeveH / 2]].forEach(([r, y]) => {
    const ring = new T.Mesh(new T.TorusGeometry(r - 0.012, 0.014, 8, SEG), new T.MeshStandardMaterial({ color: new T.Color(SLEEVE()).multiplyScalar(0.75), roughness: 0.9 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = y; cupSpin.add(ring);
  });

  // Крышка: профиль вращения
  // Профиль задаётся снизу вверх — так у LatheGeometry лицевые грани смотрят наружу
  const lidPts = [
    [1.075, -0.06], [1.085, -0.095], [1.12, -0.1], [1.145, -0.085], [1.155, -0.05], [1.16, 0.02],
    [1.155, 0.08], [1.13, 0.12], [1.06, 0.165], [0.99, 0.2], [0.94, 0.215], [0.74, 0.225],
    [0.69, 0.245], [0.66, 0.29], [0.63, 0.32], [0.58, 0.335], [0.5, 0.34], [0.0, 0.34],
  ].map(([x, y]) => new T.Vector2(x, y));
  const lidMat = new T.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.3, metalness: 0, envMapIntensity: 0.85, side: T.DoubleSide });
  const lid = new T.Mesh(new T.LatheGeometry(lidPts, SEG), lidMat);
  lid.position.y = H / 2; cupSpin.add(lid);
  // Нижняя сторона крышки — плотно закрывает стакан
  const lidUnder = new T.Mesh(new T.CircleGeometry(RT - 0.005, SEG), new T.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, side: T.DoubleSide }));
  lidUnder.rotation.x = Math.PI / 2; lidUnder.position.y = H / 2 - 0.055; cupSpin.add(lidUnder);
  // Носик для питья
  const spoutGeo = new T.CapsuleGeometry(0.075, 0.34, 8, 24);
  const spout = new T.Mesh(spoutGeo, lidMat);
  spout.rotation.z = Math.PI / 2; spout.scale.set(1, 1, 0.75);
  spout.position.set(0, H / 2 + 0.36, -0.5); cupSpin.add(spout);
  const hole = new T.Mesh(new T.CapsuleGeometry(0.028, 0.14, 6, 16), new T.MeshBasicMaterial({ color: 0x000000 }));
  hole.rotation.z = Math.PI / 2; hole.position.set(0, H / 2 + 0.432, -0.5); hole.scale.set(1, 1, 0.5); cupSpin.add(hole);

  cupSpin.position.y = -0.15;

  // Тень под стаканчиком
  const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: softTexture("rgba(0,0,0,.6)"), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(3.4, 1.3, 1); shadow.position.set(0.2, -2.75, 0);
  scene.add(shadow);

  // Пар
  const steamTex = softTexture("rgba(255,255,255,.9)", 128);
  // Пар живёт в мировых координатах: облачко рождается над отверстием крышки
  // (там, где оно сейчас) и дальше поднимается само, не повторяя движений стакана.
  const STEAM_N = 9;
  const steamSrc = new T.Vector3(0, H / 2 + 0.47, -0.5);   // над отверстием в крышке (локально)
  const steam = [...Array(STEAM_N)].map((_, i) => {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
    sp.userData = { phase: i / STEAM_N, last: 1, origin: new T.Vector3(), seed: Math.random() * 10 };
    scene.add(sp); return sp;
  });
  /* ---- Зёрна вокруг ---- */
  const beanGeo = beanGeometry();
  const beanMat = beanMaterial(env);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const BEANS = innerWidth < 700 ? 8 : 12;
  const beans = [...Array(BEANS)].map((_, i) => {
    const m = new T.Mesh(beanGeo, beanMat);
    const s = rnd(0.11, 0.2);
    m.scale.setScalar(s);
    m.userData = {
      a: (i / BEANS) * Math.PI * 2 + rnd(-0.3, 0.3),     // угол на орбите
      r: rnd(1.9, 4.2),                                  // радиус орбиты
      y: rnd(-1.7, 1.9),                                 // высота
      z: rnd(-3.5, 2.8),                                 // глубина
      sp: rnd(0.04, 0.12) * (Math.random() < 0.5 ? 1 : -1),
      rot: new T.Vector3(rnd(0.4, 1.1) * (Math.random() < 0.5 ? 1 : -1), rnd(0.6, 1.4) * (Math.random() < 0.5 ? 1 : -1), rnd(0.2, 0.7)),
      bob: rnd(0, Math.PI * 2),
    };
    m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
    scene.add(m); return m;
  });

  /* ---- Размеры ---- */
  /* Автоподстройка качества: если кадры не успевают (медленная видеокарта, батарея),
     сцена снижает разрешение; когда запас появляется — возвращает. */
  const DPR_MAX = Math.min(devicePixelRatio || 1, 1.5), DPR_MIN = 0.75;
  let dpr = DPR_MAX, slow = 0, fast = 0;
  function adaptQuality(dt) {
    if (dt > 1 / 45) { slow++; fast = 0; } else if (dt < 1 / 57) { fast++; slow = Math.max(0, slow - 1); }
    if (slow > 40 && dpr > DPR_MIN) { dpr = Math.max(DPR_MIN, dpr - 0.25); slow = 0; renderer.setPixelRatio(dpr); resize(); }
    if (fast > 240 && dpr < DPR_MAX) { dpr = Math.min(DPR_MAX, dpr + 0.125); fast = 0; renderer.setPixelRatio(dpr); resize(); }
  }

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // на узких экранах камеру отодвигаем, чтобы стаканчик и зёрна помещались
    camera.position.z = w / h < 0.8 ? 20 : w / h < 1.2 ? 16.5 : 14.5;
    scene.fog.near = camera.position.z - 2.5; scene.fog.far = camera.position.z + 8;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  /* ---- Взаимодействие ---- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; });
    document.addEventListener("pointerleave", () => { mouse.tx = 0; mouse.ty = 0; });
  }
  // первый экран «залипает», поэтому рисуем, пока его не закрыл следующий блок
  const heroVisible = () => scrollY < innerHeight * 0.9;

  /* ---- Анимация ---- */
  let t = 0;
  const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  let ready = false;
  function frame(now, dt) {
    if (!ready || !heroVisible() || document.hidden) return;
    t += dt;
    adaptQuality(dt);

    const intro = reduceMotion ? 1 : easeOut((t - 0.15) / 1.6);
    mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
    const m = reduceMotion ? 0 : 1;

    // стаканчик: эмблемой к зрителю, покачивается и поворачивается за курсором.
    // При прокрутке остаётся на месте — следующий блок наезжает сверху.
    const sway = m * (Math.sin(t * 0.55) * 0.32 + Math.sin(t * 0.21 + 1.3) * 0.14);
    cupSpin.rotation.y = -Math.PI / 2 + sway + mouse.x * 1.15 + (1 - intro) * -1.4;
    const bob = m * Math.sin(t * 1.05) * 0.11;
    cupRoot.position.set(mouse.x * 0.35, bob - mouse.y * 0.2 + (1 - intro) * -0.6, 0);
    cupRoot.rotation.set(
      0.24 + mouse.y * 0.32 + m * Math.sin(t * 0.8) * 0.04,
      0,
      -0.2 + m * Math.sin(t * 0.6 + 0.6) * 0.12 - mouse.x * 0.5
    );
    cupRoot.scale.setScalar(0.8 + 0.2 * intro);
    shadow.material.opacity = (0.85 - bob * 0.8) * intro;
    shadow.scale.set(3.4 - bob * 2, 1.3 - bob * 0.6, 1);
    shadow.position.x = 0.2 + mouse.x * 0.35;

    // пар над крышкой
    cupRoot.updateMatrixWorld();
    steam.forEach((sp) => {
      const u = sp.userData;
      const p = (t * 0.16 + u.phase) % 1;
      // новый цикл — облачко рождается там, где сейчас отверстие крышки
      if (p < u.last) { u.origin.copy(steamSrc); cupSpin.localToWorld(u.origin); u.seed = Math.random() * 10; }
      u.last = p;
      // поднимается строго вверх и слегка колышется, независимо от стакана
      const drift = Math.sin(p * 5 + u.seed) * 0.16 * p;
      sp.position.set(u.origin.x + drift, u.origin.y + p * 1.9, u.origin.z);
      const sc = 0.35 + p * 1.2; sp.scale.set(sc, sc * 1.45, 1);
      sp.material.opacity = Math.sin(Math.min(1, p * 1.15) * Math.PI) * 0.1 * intro;
    });

    // зёрна: медленная орбита, кувыркание, слетаются при загрузке
    beans.forEach((b) => {
      const u = b.userData;
      if (m) { u.a += u.sp * dt; b.rotation.x += u.rot.x * dt; b.rotation.y += u.rot.y * dt; b.rotation.z += u.rot.z * dt; }
      const spread = 1 + (1 - intro) * 1.8;
      b.position.set(
        Math.cos(u.a) * u.r * spread,
        u.y + m * Math.sin(t * 0.8 + u.bob) * 0.32,
        u.z + Math.sin(u.a) * 1.2
      );
    });

    // камера чуть смещается за мышью — настоящий параллакс
    // камера чуть уходит в противоположную сторону — поворот стаканчика читается сильнее,
    // а зёрна на разной глубине дают параллакс
    camera.position.x = -mouse.x * 0.7;
    camera.position.y = 0.45 + mouse.y * 0.35;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  // общий цикл из main.js (Lenis + все анимации в одном кадре); без него — свой
  const runLoop = (fn) => {
    if (window.__ticker) return window.__ticker.add(fn);
    let last = performance.now();
    const loop = (now) => { requestAnimationFrame(loop); fn(now, Math.min((now - last) / 1000, 0.05)); last = now; };
    requestAnimationFrame(loop);
  };
  compileInBackground(renderer, scene, camera, () => { ready = true; });
  runLoop(frame);

  /* -------------------------------------------------------------------
     Зёрна в «Кофейной карте» (светлый блок)
     ------------------------------------------------------------------- */
  const host = document.querySelector("[data-coffee-beans]");
  if (host) {
    const c2 = document.createElement("canvas"); c2.className = "beans-3d"; host.appendChild(c2);
    host.classList.add("has-3d");
    const r2 = makeRenderer(c2);
    r2.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    r2.toneMappingExposure = 1.1;
    const sc2 = new T.Scene();
    const env2 = studioEnv(r2, 0xffffff); sc2.environment = env2;
    sc2.add(new T.HemisphereLight(0xffffff, 0xd8d2c4, LI(0.9)));
    const k2 = new T.DirectionalLight(0xffffff, LI(1.6)); k2.position.set(-3, 5, 4); sc2.add(k2);
    const cam2 = new T.PerspectiveCamera(28, 1, 0.1, 50); cam2.position.set(0, 1.6, 9); cam2.lookAt(0, -0.2, 0);
    const mat2 = beanMaterial(env2);
    const big = [
      { p: [-1.9, 0.25, 0], s: 0.62, r: [0.4, 0.3, 1.1] },
      { p: [0.05, -0.15, 0.6], s: 0.9, r: [0.9, -0.4, -0.2] },
      { p: [1.75, 0.45, -0.4], s: 0.55, r: [-0.6, 0.7, 0.5] },
    ].map((d, i) => {
      const m = new T.Mesh(beanGeo, mat2); m.scale.setScalar(d.s); m.position.set(...d.p); m.rotation.set(...d.r);
      m.userData = { base: d.p.slice(), i, rx0: d.r[0], rz0: d.r[2] }; sc2.add(m); return m;
    });
    // тени-пятна
    const sh2 = big.map((b) => {
      const s = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: softTexture("rgba(40,30,20,.35)"), transparent: true, depthWrite: false }));
      s.rotation.x = -Math.PI / 2; sc2.add(s); return s;
    });
    const size2 = () => { const w = host.clientWidth, h = host.clientHeight; r2.setSize(w, h, false); cam2.aspect = w / h; cam2.updateProjectionMatrix(); };
    size2(); addEventListener("resize", size2);
    // «Прогрев»: шейдеры собираются сразу при загрузке, а не в момент,
    // когда блок впервые появляется при прокрутке (иначе — заметный рывок)
    let ready2 = false;
    compileInBackground(r2, sc2, cam2, () => { ready2 = true; });
    let vis2 = false;
    new IntersectionObserver(([en]) => { vis2 = en.isIntersecting; }).observe(host);
    const m2 = { x: 0, y: 0 };
    addEventListener("pointermove", (e) => { m2.x = e.clientX / innerWidth - 0.5; m2.y = e.clientY / innerHeight - 0.5; });
    let t2 = 0;
    runLoop(function beans2(now, dt) {
      if (!ready2 || !vis2 || document.hidden) return;
      t2 += dt;
      big.forEach((b, i) => {
        const [x, y, z] = b.userData.base;
        b.position.set(x + m2.x * 0.3 * (i + 1) + (reduceMotion ? 0 : Math.sin(t2 * 0.45 + i) * 0.08), y + (reduceMotion ? 0 : Math.sin(t2 * 1.1 + i * 2.1) * 0.32) - m2.y * 0.2, z);
        if (!reduceMotion) { b.rotation.y += dt * (0.7 + i * 0.18) * (i % 2 ? -1 : 1); b.rotation.x = b.userData.rx0 + Math.sin(t2 * 0.8 + i) * 0.35; b.rotation.z = b.userData.rz0 + Math.sin(t2 * 0.6 + i * 1.7) * 0.25; }
        sh2[i].position.set(b.position.x, -1.35, z); const sc = b.userData && b.scale.x * 2.2; sh2[i].scale.set(sc, sc * 0.4, 1);
        sh2[i].material.opacity = Math.max(0.25, 0.8 - (b.position.y - y) * 0.9);
      });
      r2.render(sc2, cam2);
    });
  }
  };

  // Создание 3D-контекста и сборка шейдеров занимают 1–3 секунды на слабой видеокарте.
  // Запускаем это, когда страница уже показалась: заголовок и шапка появляются сразу,
  // а стаканчик плавно «прилетает» следом.
  const start = () => {
    try { boot(); } catch (e) { console.warn("3D: ошибка запуска — показан запасной CSS-стаканчик", e); fallback(); }
  };
  const later = () => requestAnimationFrame(() => setTimeout(start, 0));
  // не ждём шрифтов и картинок: скрипт стоит в конце страницы, разметка уже готова
  later();
})();
