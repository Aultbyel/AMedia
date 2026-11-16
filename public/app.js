const THEME = {
  backgroundColor: "#0b1220",
  primaryColor: "#e8d5b5",
  accentColor: "#7ca8b4",
};

const LYRICS = [
  { text: "把这首歌轻轻打开", sub: "让字自己往前走" },
  { text: "灯在很远的地方亮着", sub: "颜色慢慢铺上来" },
  { text: "穿过一层层景深", sub: "雾里还有下一句" },
  { text: "把夜里的颜色留下", sub: "听，它还在往前" },
  { text: "句子停在镜头前面", sub: "然后退进更深的蓝" },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const luminanceOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const parseHex = (color) => {
  const value = color.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
};

const withAlpha = (color, alpha) => {
  const { r, g, b } = parseHex(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveWashColor = (normalized, background, accent, primary) => {
  const backgroundLum = luminanceOf(background.r, background.g, background.b);
  const primaryLum = luminanceOf(primary.r, primary.g, primary.b);
  const shadow = backgroundLum <= primaryLum ? background : primary;
  const highlight = backgroundLum <= primaryLum ? primary : background;
  if (normalized <= 0.55) {
    const amount = normalized / 0.55;
    return {
      r: lerp(shadow.r, accent.r, amount),
      g: lerp(shadow.g, accent.g, amount),
      b: lerp(shadow.b, accent.b, amount),
    };
  }
  const amount = (normalized - 0.55) / 0.45;
  return {
    r: lerp(accent.r, highlight.r, amount),
    g: lerp(accent.g, highlight.g, amount),
    b: lerp(accent.b, highlight.b, amount),
  };
};

const paintMonetBackground = async (canvas) => {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return;

  const source = new Image();
  source.src = "./assets/monet-source.png";
  await source.decode();

  const width = 1280;
  const height = 800;
  canvas.width = width;
  canvas.height = height;

  const work = document.createElement("canvas");
  work.width = 640;
  work.height = 400;
  const workContext = work.getContext("2d", { willReadFrequently: true });
  if (!workContext) return;

  const background = parseHex(THEME.backgroundColor);
  const accent = parseHex(THEME.accentColor);
  const primary = parseHex(THEME.primaryColor);

  workContext.fillStyle = THEME.backgroundColor;
  workContext.fillRect(0, 0, work.width, work.height);
  workContext.filter = "blur(18px)";
  const scale = Math.max(work.width / source.width, work.height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  workContext.drawImage(
    source,
    (work.width - drawWidth) / 2,
    (work.height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  workContext.filter = "none";

  const imageData = workContext.getImageData(0, 0, work.width, work.height);
  const data = imageData.data;
  const grayscale = 0.18;
  const saturation = 1.15;
  const wash = 0.62;
  for (let index = 0; index < data.length; index += 4) {
    let r = data[index];
    let g = data[index + 1];
    let b = data[index + 2];
    const lum = luminanceOf(r, g, b);
    r = lerp(r, lum, grayscale);
    g = lerp(g, lum, grayscale);
    b = lerp(b, lum, grayscale);
    const satLum = luminanceOf(r, g, b);
    r = satLum + (r - satLum) * saturation;
    g = satLum + (g - satLum) * saturation;
    b = satLum + (b - satLum) * saturation;
    const washColor = resolveWashColor(clamp(lum / 255, 0, 1), background, accent, primary);
    r = lerp(r, washColor.r, wash);
    g = lerp(g, washColor.g, wash);
    b = lerp(b, washColor.b, wash);
    // Diagonal split: slightly cooler veil on the lower-right pane.
    const x = (index / 4) % work.width;
    const y = Math.floor(index / 4 / work.width);
    if (x * 0.72 + y > work.width * 0.62) {
      r = lerp(r, background.r, 0.16);
      g = lerp(g, background.g, 0.16);
      b = lerp(b, background.b + 8, 0.16);
    }
    data[index] = Math.round(clamp(r, 0, 255));
    data[index + 1] = Math.round(clamp(g, 0, 255));
    data[index + 2] = Math.round(clamp(b, 0, 255));
  }
  workContext.putImageData(imageData, 0, 0);

  context.imageSmoothingEnabled = true;
  context.drawImage(work, 0, 0, width, height);

  const overlay = context.createLinearGradient(0, 0, width, height);
  overlay.addColorStop(0, withAlpha(THEME.accentColor, 0.28));
  overlay.addColorStop(0.44, withAlpha(THEME.backgroundColor, 0.42));
  overlay.addColorStop(1, withAlpha(THEME.primaryColor, 0.2));
  context.fillStyle = overlay;
  context.fillRect(0, 0, width, height);

  const bloom = context.createRadialGradient(width * 0.18, height * 0.34, 0, width * 0.18, height * 0.34, width * 0.55);
  bloom.addColorStop(0, withAlpha(THEME.accentColor, 0.22));
  bloom.addColorStop(1, withAlpha(THEME.backgroundColor, 0));
  context.fillStyle = bloom;
  context.fillRect(0, 0, width, height);

  const veil = context.createLinearGradient(width * 0.45, 0, width, 0);
  veil.addColorStop(0, withAlpha(THEME.backgroundColor, 0));
  veil.addColorStop(1, withAlpha(THEME.backgroundColor, 0.36));
  context.fillStyle = veil;
  context.fillRect(0, 0, width, height);

  context.fillStyle = withAlpha(THEME.backgroundColor, 0.12);
  for (let index = 0; index < 18; index += 1) {
    const x = (index * 127) % width;
    const y = ((index * 211) % height) - 40;
    context.fillRect(x, y, 1, height * 0.28);
  }
};

const startMonetDrift = (canvas) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof canvas.animate !== "function") return;
  canvas.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1.04)" },
      { transform: "translate3d(-2.2%, 1.4%, 0) scale(1.08)" },
      { transform: "translate3d(1.6%, -1.1%, 0) scale(1.05)" },
      { transform: "translate3d(0.4%, 1.8%, 0) scale(1.07)" },
      { transform: "translate3d(0, 0, 0) scale(1.04)" },
    ],
    { duration: 48000, iterations: Infinity, easing: "linear" },
  );
};

const neighborOpacity = (offset) => {
  if (offset === 0) return 1;
  if (offset === -1) return 0.3;
  if (offset === -2) return 0.1;
  if (offset === 1) return 0.22;
  if (offset === 2) return 0.1;
  if (offset === 3) return 0.06;
  return 0;
};

const setupDiorama = (root) => {
  const world = root.querySelector("#diorama-world");
  if (!world) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lines = LYRICS.map((line, index) => {
    const el = document.createElement("div");
    el.className = "lyric-line";
    el.innerHTML = `${line.text}<span class="sub">${line.sub}</span>`;
    world.append(el);
    return { el, index };
  });

  const shapes = [
    { type: "cube", x: -38, y: -22, z: -240, size: 86, spin: 0.04 },
    { type: "cube", x: 42, y: 8, z: -80, size: 64, spin: -0.03 },
    { type: "cyl", x: -26, y: 18, z: 40, size: 54, spin: 0.05 },
    { type: "cyl", x: 30, y: -28, z: -420, size: 70, spin: -0.02 },
    { type: "blob", x: -48, y: 4, z: -140, size: 90, spin: 0.02 },
    { type: "blob", x: 18, y: 24, z: -300, size: 58, spin: 0.03 },
    { type: "plus", x: -8, y: -32, z: -520, size: 160, spin: 0 },
    { type: "plus", x: 36, y: -8, z: 90, size: 70, spin: 0 },
    { type: "cube", x: 8, y: -18, z: 160, size: 42, spin: 0.06 },
  ].map((shape) => {
    const wrap = document.createElement("div");
    wrap.className = "shape";
    const body = document.createElement("div");
    body.className = `shape-${shape.type}`;
    body.style.setProperty("--size", `${shape.size}px`);
    wrap.append(body);
    world.append(wrap);
    return { ...shape, el: wrap, body };
  });

  const motes = Array.from({ length: 28 }, (_, index) => {
    const el = document.createElement("div");
    el.className = "mote";
    world.append(el);
    return {
      el,
      x: ((index * 47) % 90) - 45,
      y: ((index * 29) % 70) - 35,
      z: -600 + ((index * 83) % 800),
      speed: 8 + (index % 5) * 4,
    };
  });

  const step = 340;
  const hero = 20;
  let start = performance.now();
  const duration = 4200;

  const render = (now) => {
    const elapsed = now - start;
    const progress = (elapsed / duration) % LYRICS.length;
    const current = Math.floor(progress);
    const frac = progress - current;
    const ease = frac * frac * (3 - 2 * frac);
    const head = current + ease;

    const camX = Math.sin(now / 4200) * 18;
    const camY = Math.cos(now / 5100) * 10;
    const camZ = Math.sin(now / 6400) * 36;
    const camRotY = Math.sin(now / 7000) * 3.2;
    const camRotX = Math.cos(now / 8000) * 1.6;
    world.style.transform = reduced
      ? "translateZ(0)"
      : `translate3d(${camX}px, ${camY}px, ${camZ}px) rotateX(${camRotX}deg) rotateY(${camRotY}deg)`;

    lines.forEach((line) => {
      const candidates = [
        line.index - head,
        line.index - head + LYRICS.length,
        line.index - head - LYRICS.length,
      ];
      const offset = candidates.reduce((best, value) => (
        Math.abs(value) < Math.abs(best) ? value : best
      ));
      if (Math.abs(offset) > 2.6) {
        line.el.style.opacity = "0";
        return;
      }
      const z = -offset * step + hero;
      const y = offset * 96 + Math.sin((now / 900) + line.index) * 4;
      const approaching = z > 70 ? clamp((140 - z) / 70, 0, 1) : 1;
      const base = neighborOpacity(Math.round(offset));
      const currentness = clamp(1 - Math.abs(offset), 0, 1);
      const opacity = base * approaching;
      const fontSize = 2.35 + currentness * 2.2;
      const scale = 0.82 + currentness * 0.22;
      line.el.style.fontSize = `clamp(1.3rem, ${fontSize}vw, 5.2rem)`;
      line.el.style.opacity = String(Math.max(0, opacity));
      line.el.querySelector(".sub").style.opacity = String(0.2 + currentness * 0.5);
      line.el.style.transform = `translate(-50%, -50%) translate3d(0, ${y}px, ${z}px) scale(${scale})`;
    });

    shapes.forEach((shape, index) => {
      const wobble = Math.sin(now / 1600 + index) * 8;
      const rot = reduced ? 0 : (now / 40) * shape.spin;
      shape.el.style.transform = `translate(-50%, -50%) translate3d(${shape.x}vw, ${shape.y + wobble / 12}vh, ${shape.z}px) rotateZ(${rot * 12}deg)`;
      shape.body.style.transform = `rotateX(${18 + rot * 20}deg) rotateY(${rot * 40}deg)`;
    });

    motes.forEach((mote) => {
      const z = ((mote.z + (now / 30) * mote.speed / 10) % 800) - 600;
      mote.el.style.opacity = String(clamp((z + 600) / 900, 0.12, 0.8));
      mote.el.style.transform = `translate(-50%, -50%) translate3d(${mote.x}vw, ${mote.y}vh, ${z}px)`;
    });

    if (!reduced) requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
};

const applyDownloads = (product) => {
  const labels = { android: "下载 APK", windows: "下载 Windows 版", macos: "下载 macOS 版", linux: "下载 Linux 版" };
  document.querySelectorAll(".downloads li").forEach((row) => {
    const platform = row.dataset.platform;
    const url = product.downloads?.[platform];
    const button = row.querySelector("a");
    if (!button || !url) return;
    button.href = url;
    button.textContent = labels[platform] ?? "下载";
    button.classList.remove("disabled");
    button.removeAttribute("aria-disabled");
  });

  const note = document.querySelector("#releases-note");
  if (note && product.releasesPage) {
    note.hidden = false;
    note.innerHTML = `也可以在 <a href="${product.releasesPage}">GitHub Releases</a> 查看全部安装包与更新说明。`;
  }
};

const start = async () => {
  const canvas = document.querySelector("#monet-bg");
  const diorama = document.querySelector("#diorama");
  if (canvas instanceof HTMLCanvasElement) {
    try {
      await paintMonetBackground(canvas);
      startMonetDrift(canvas);
    } catch (error) {
      console.warn("Monet background fallback", error);
    }
  }
  if (diorama instanceof HTMLElement) setupDiorama(diorama);

  try {
    const response = await fetch("./data/product.json");
    if (response.ok) applyDownloads(await response.json());
  } catch {
    // Static page still works without the JSON file.
  }
};

start();
