(function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const daynightBtn = document.getElementById("daynight-btn");
  const iconEnter = document.getElementById("icon-enter");
  const iconExit = document.getElementById("icon-exit");
  const iconSun = document.getElementById("icon-sun");
  const iconMoon = document.getElementById("icon-moon");
  const rainBtn = document.getElementById("rain-btn");

  let width = 0;
  let height = 0;
  let particles = [];
  let arcs = [];
  let planMarkers = [];
  let pendingTimers = [];
  let nextPlanId = 0;
  let nightSkyCanvas = null;
  let daySkyCanvas = null;
  let skyBlend = 0;
  let skyBlendTarget = 0;
  let audioCtx = null;
  let isDayMode = false;
  let isRaining = false;
  let raindrops = [];
  let rainNoise = null;
  let rainGain = null;
  let stars = [];
  let touchPress = null;
  let ambientCreatures = [];
  let nextAmbientSpawnAt = 0;

  const MAX_RAIN_DROPS = 140;
  const LONG_PRESS_MS = 500;
  const LONG_PRESS_MOVE_LIMIT = 14;
  const MAX_AMBIENT = 1;
  const AMBIENT_SPAWN_MIN_MS = 20000;
  const AMBIENT_SPAWN_MAX_MS = 40000;
  const AMBIENT_LIFE_MIN_MS = 8000;
  const AMBIENT_LIFE_MAX_MS = 14000;
  const AMBIENT_FADE_MS = 1200;
  const SKY_BLEND_SPEED = 0.012;
  const ARC_APPEAR_SPEED = 0.018;
  const ARC_DECAY = 0.0055;

  const pointer = {
    active: false,
    dragging: false,
    button: null,
    startX: 0,
    startY: 0,
    lastPlanX: 0,
    lastPlanY: 0,
    planHue: 0,
    planId: 0,
    planPoints: [],
  };

  const BURST_SIZES = {
    small: { count: 35, speed: 2, spread: 0.85 },
    medium: { count: 60, speed: 2.8, spread: 0.95 },
    big: { count: 95, speed: 3.6, spread: 1.05 },
  };

  const ARC_RADIUS_RANGE = {
    small: [42, 62],
    medium: [68, 92],
    big: [95, 125],
    wow: [130, 175],
  };
  const RAINBOW_HUES = [0, 32, 55, 95, 145, 210, 275];

  const GRAVITY = 0.028;
  const DRAG = 0.992;
  const DRAG_THRESHOLD = 10;
  const PLAN_SPACING_NIGHT = 36;
  const PLAN_SPACING_DAY = 100;
  const PLAN_START_DELAY = 320;
  const PLAN_STAGGER_DELAY = 85;

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }


  function arcRadiusForSize(sizeKey) {
    const range = ARC_RADIUS_RANGE[sizeKey] || ARC_RADIUS_RANGE.medium;
    return random(range[0], range[1]);
  }

  function resize() {
    width = Math.max(200, window.innerWidth);
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    buildSky();
    ambientCreatures = [];
    scheduleNextAmbientSpawn();
    if (isRaining) initRaindrops();
  }

  function drawCloudBlob(skyCtx, cx, cy, scale) {
    const blobs = [
      [0, 0, 22],
      [-28 * scale, 4, 18],
      [26 * scale, 6, 20],
      [-12 * scale, -10, 16],
      [14 * scale, -8, 17],
    ];
    skyCtx.fillStyle = "rgba(255, 255, 255, 0.92)";
    for (const [ox, oy, r] of blobs) {
      skyCtx.beginPath();
      skyCtx.arc(cx + ox, cy + oy, r * scale, 0, Math.PI * 2);
      skyCtx.fill();
    }
  }

  function buildNightSky() {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const skyCtx = c.getContext("2d");

    const gradient = skyCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0d1033");
    gradient.addColorStop(1, "#020208");
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, width, height);

    const moonX = width * 0.82;
    const moonY = height * 0.14;
    const moonGlow = skyCtx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 70);
    moonGlow.addColorStop(0, "rgba(255, 248, 220, 0.18)");
    moonGlow.addColorStop(0.4, "rgba(255, 248, 220, 0.06)");
    moonGlow.addColorStop(1, "rgba(255, 248, 220, 0)");
    skyCtx.fillStyle = moonGlow;
    skyCtx.fillRect(moonX - 70, moonY - 70, 140, 140);

    skyCtx.fillStyle = "rgba(255, 248, 220, 0.75)";
    skyCtx.beginPath();
    skyCtx.arc(moonX, moonY, 18, 0, Math.PI * 2);
    skyCtx.fill();

    stars = [];
    const starCount = Math.floor(random(100, 151));
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.85,
        radius: random(0.4, 1.4),
        baseAlpha: random(0.35, 1),
        phase: random(0, Math.PI * 2),
        speed: random(0.02, 0.05),
      });
    }
    return c;
  }

  function buildDaySky() {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const skyCtx = c.getContext("2d");

    const gradient = skyCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#6ec5ff");
    gradient.addColorStop(1, "#dff3ff");
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, width, height);

    const sunX = width * 0.82;
    const sunY = height * 0.14;
    const sunGlow = skyCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 85);
    sunGlow.addColorStop(0, "rgba(255, 230, 80, 0.45)");
    sunGlow.addColorStop(0.35, "rgba(255, 210, 60, 0.15)");
    sunGlow.addColorStop(1, "rgba(255, 200, 50, 0)");
    skyCtx.fillStyle = sunGlow;
    skyCtx.fillRect(sunX - 85, sunY - 85, 170, 170);

    skyCtx.fillStyle = "rgba(255, 220, 60, 0.95)";
    skyCtx.beginPath();
    skyCtx.arc(sunX, sunY, 22, 0, Math.PI * 2);
    skyCtx.fill();

    const cloudPositions = [
      [width * 0.18, height * 0.22, 1],
      [width * 0.45, height * 0.12, 0.85],
      [width * 0.62, height * 0.28, 1.1],
      [width * 0.32, height * 0.38, 0.75],
      [width * 0.78, height * 0.42, 0.9],
    ];
    for (const [cx, cy, sc] of cloudPositions) {
      drawCloudBlob(skyCtx, cx, cy, sc);
    }
    return c;
  }

  function buildSky() {
    nightSkyCanvas = buildNightSky();
    daySkyCanvas = buildDaySky();
  }

  function updateSkyBlend() {
    if (Math.abs(skyBlend - skyBlendTarget) < 0.002) {
      skyBlend = skyBlendTarget;
      return;
    }
    skyBlend += (skyBlendTarget - skyBlend) * SKY_BLEND_SPEED;
  }

  function drawSky() {
    ctx.drawImage(nightSkyCanvas, 0, 0);
    if (skyBlend > 0) {
      ctx.save();
      ctx.globalAlpha = skyBlend;
      ctx.drawImage(daySkyCanvas, 0, 0);
      ctx.restore();
    }
  }

  function updateStars() {
    for (const s of stars) {
      s.phase += s.speed;
    }
  }

  function drawStars() {
    if (stars.length === 0 || skyBlend >= 0.98) return;

    ctx.save();
    ctx.globalAlpha = 1 - skyBlend;
    ctx.globalCompositeOperation = "lighter";
    for (const s of stars) {
      const twinkle = 0.55 + Math.sin(s.phase) * 0.45;
      ctx.fillStyle = `rgba(255, 255, 255, ${s.baseAlpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function createAmbientStar() {
    const fromLeft = Math.random() > 0.5;
    return {
      kind: "star",
      x: fromLeft ? -20 : width + 20,
      y: random(height * 0.15, height * 0.45),
      vx: (fromLeft ? 1 : -1) * random(0.4, 0.9),
      vy: random(-0.15, -0.05),
      phase: random(0, Math.PI * 2),
      bornAt: Date.now(),
      lifeMs: random(AMBIENT_LIFE_MIN_MS, AMBIENT_LIFE_MAX_MS),
      size: random(18, 26),
      wobbleAmp: random(4, 8),
      wobbleSpeed: random(0.04, 0.07),
    };
  }

  function createAmbientButterfly() {
    const fromLeft = Math.random() > 0.5;
    return {
      kind: "butterfly",
      x: fromLeft ? -30 : width + 30,
      y: random(height * 0.25, height * 0.65),
      vx: (fromLeft ? 1 : -1) * random(0.35, 0.58),
      vy: random(-0.05, 0.05),
      phase: random(0, Math.PI * 2),
      bornAt: Date.now(),
      lifeMs: random(14000, 22000),
      size: random(32, 42),
      wobbleAmp: random(10, 22),
      wobbleSpeed: random(0.05, 0.09),
    };
  }

  function scheduleNextAmbientSpawn() {
    nextAmbientSpawnAt = Date.now() + random(AMBIENT_SPAWN_MIN_MS, AMBIENT_SPAWN_MAX_MS);
  }

  function removeAmbientAt(index) {
    ambientCreatures.splice(index, 1);
    if (ambientCreatures.length === 0) {
      scheduleNextAmbientSpawn();
    }
  }

  function tickAmbientSpawner() {
    if (ambientCreatures.length >= MAX_AMBIENT) return;

    const now = Date.now();
    if (nextAmbientSpawnAt === 0) scheduleNextAmbientSpawn();
    if (now < nextAmbientSpawnAt) return;

    if (isDayMode) {
      ambientCreatures.push(createAmbientButterfly());
    } else {
      ambientCreatures.push(createAmbientStar());
    }
  }

  function updateAmbient() {
    const now = Date.now();
    for (let i = ambientCreatures.length - 1; i >= 0; i--) {
      const c = ambientCreatures[i];
      if ((c.kind === "butterfly" && !isDayMode) || (c.kind === "star" && isDayMode)) {
        removeAmbientAt(i);
        continue;
      }
      const age = now - c.bornAt;
      if (age >= c.lifeMs) {
        removeAmbientAt(i);
        continue;
      }
      c.x += c.vx;
      c.y += c.vy;
      c.phase += c.wobbleSpeed;
      if ((c.vx > 0 && c.x > width + 80) || (c.vx < 0 && c.x < -80)) {
        removeAmbientAt(i);
      }
    }
  }

  function ambientAlpha(c) {
    const age = Date.now() - c.bornAt;
    const fadeIn = Math.min(1, age / AMBIENT_FADE_MS);
    const fadeOut = Math.min(1, (c.lifeMs - age) / AMBIENT_FADE_MS);
    const twinkle = c.kind === "star" ? 0.85 + 0.15 * Math.sin(c.phase) : 1;
    return fadeIn * fadeOut * twinkle;
  }

  function drawCanvasFlyingStar(x, y, size, alpha) {
    const outer = size * 0.5;
    const inner = outer * 0.38;
    ctx.fillStyle = `rgba(255, 248, 210, ${alpha})`;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawCanvasButterfly(x, y, size, phase, vx, alpha) {
    const flap = 0.4 + Math.abs(Math.sin(phase * 2.5)) * 0.6;
    const wingW = size * 0.52 * flap;
    const wingH = size * 0.3;

    ctx.save();
    ctx.translate(x, y);
    if (vx < 0) ctx.scale(-1, 1);

    ctx.fillStyle = `rgba(45, 30, 55, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.5, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 130, 50, ${alpha * 0.95})`;
    ctx.beginPath();
    ctx.ellipse(-wingW * 0.5, -size * 0.1, wingW * 0.55, wingH, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(wingW * 0.5, -size * 0.1, wingW * 0.55, wingH, 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 80, 160, ${alpha * 0.9})`;
    ctx.beginPath();
    ctx.ellipse(-wingW * 0.45, size * 0.14, wingW * 0.48, wingH * 0.75, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(wingW * 0.45, size * 0.14, wingW * 0.48, wingH * 0.75, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(-wingW * 0.35, -size * 0.08, size * 0.05, 0, Math.PI * 2);
    ctx.arc(wingW * 0.35, -size * 0.08, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawAmbientCreature(c) {
    const alpha = ambientAlpha(c);
    if (alpha <= 0.01) return;

    const drawY = c.y + Math.sin(c.phase) * c.wobbleAmp;

    ctx.save();
    ctx.globalAlpha = 1;

    if (c.kind === "star") {
      ctx.globalCompositeOperation = "lighter";
      const glowR = c.size * 0.9;
      const glow = ctx.createRadialGradient(c.x, drawY, 0, c.x, drawY, glowR);
      glow.addColorStop(0, `rgba(255, 248, 200, ${alpha * 0.45})`);
      glow.addColorStop(1, "rgba(255, 248, 200, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(c.x, drawY, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      drawCanvasFlyingStar(c.x, drawY, c.size, alpha);
    } else {
      drawCanvasButterfly(c.x, drawY, c.size, c.phase, c.vx, alpha);
    }

    ctx.restore();
  }

  function drawAmbient() {
    for (const c of ambientCreatures) {
      drawAmbientCreature(c);
    }
  }

  function createArc(clickX, clickY, targetRadius, maxAlpha) {
    return {
      x: clickX,
      y: clickY,
      span: targetRadius * random(1.4, 1.85),
      lift: targetRadius * random(1.05, 1.45),
      wobble: random(-0.18, 0.18),
      bend: random(-0.22, 0.22),
      targetRadius,
      radius: 0,
      appear: 0,
      appearSpeed: ARC_APPEAR_SPEED + random(-0.002, 0.002),
      alpha: 0,
      maxAlpha,
      decay: ARC_DECAY + random(-0.0008, 0.0008),
    };
  }

  function spawnRainbowArc(clickX, clickY, sizeKey, options = {}) {
    const targetRadius = arcRadiusForSize(sizeKey);
    arcs.push(createArc(clickX, clickY, targetRadius, 1));
    if (!options.silent) {
      playRainbowSound(sizeKey, options);
    }
  }

  function drawRainbowArc(arc) {
    if (arc.radius <= 0) return;

    const scale = arc.radius / arc.targetRadius;
    const span = arc.span * scale;
    const lift = arc.lift * scale;
    const alpha = arc.alpha;
    const wob = arc.wobble * scale;
    const bend = arc.bend;
    const bandCount = RAINBOW_HUES.length;
    const bandW = Math.max(3.5, (arc.radius / bandCount) * 1.15);
    const bandStep = bandW * 1.05;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < bandCount; i++) {
      const inset = i * bandStep;
      const spanBand = Math.max(span * 0.4, span - inset * 0.9);
      const liftBand = Math.max(lift * 0.4, lift - inset * 0.65);
      const yOff = inset * 0.12;
      const x0 = arc.x - spanBand;
      const x1 = arc.x + spanBand;
      const y0 = arc.y + yOff;
      const cp1x = arc.x - spanBand * 0.52 + span * wob * 0.3;
      const cp2x = arc.x + spanBand * 0.52 + span * wob * 0.18;
      const cp1y = arc.y - liftBand * (1 + bend * 0.12);
      const cp2y = arc.y - liftBand * (1 - bend * 0.12);

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y0);
      ctx.strokeStyle = `hsla(${RAINBOW_HUES[i]}, 92%, 50%, ${alpha * 0.9})`;
      ctx.lineWidth = bandW;
      ctx.stroke();
    }

    if (alpha > 0.25) {
      ctx.globalCompositeOperation = "lighter";
      const glowSpan = span * 0.55;
      const glowLift = lift * 0.88;
      ctx.beginPath();
      ctx.moveTo(arc.x - glowSpan, arc.y + bandW * 0.15);
      ctx.bezierCurveTo(
        arc.x - glowSpan * 0.45 + span * wob * 0.18,
        arc.y - glowLift * (1 + bend * 0.1),
        arc.x + glowSpan * 0.45 + span * wob * 0.12,
        arc.y - glowLift * (1 - bend * 0.1),
        arc.x + glowSpan,
        arc.y + bandW * 0.15
      );
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.08})`;
      ctx.lineWidth = bandW * 1.4;
      ctx.stroke();
    }

    ctx.restore();
  }

  function updateArcs() {
    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      if (a.appear < 1) {
        a.appear = Math.min(1, a.appear + a.appearSpeed);
        const eased = 1 - Math.pow(1 - a.appear, 3);
        a.radius = a.targetRadius * eased;
        a.alpha = a.maxAlpha * eased;
      } else {
        a.radius = a.targetRadius;
        a.alpha -= a.decay;
      }
      if (a.alpha <= 0) arcs.splice(i, 1);
    }
  }

  function drawArcs() {
    for (const arc of arcs) {
      drawRainbowArc(arc);
    }
  }

  function createParticle(x, y, angle, speed, hue, type, options = {}) {
    const isSparkle = type === "sparkle";
    const isRing = type === "ring";
    const trail = !!options.trail;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hue: ((hue % 360) + 360) % 360,
      alpha: trail ? 0 : 1,
      appear: trail ? 0 : 1,
      appearSpeed: trail ? ARC_APPEAR_SPEED * 1.4 : 1,
      decay: trail
        ? isSparkle
          ? random(0.0018, 0.0026)
          : random(0.002, 0.0028)
        : isRing
          ? random(0.004, 0.007)
          : isSparkle
            ? random(0.003, 0.006)
            : random(0.005, 0.01),
      type,
      size: isRing ? random(2.5, 4) : isSparkle ? random(1.2, 2.8) : random(2, 4.5),
      sparkleTint: isSparkle ? Math.random() > 0.5 : false,
    };
  }

  function randomVelocity(sizeKey, trail = false) {
    const angle = random(0, Math.PI * 2);
    const speedScale = trail ? 0.72 : 1;
    if (sizeKey === "sparkle") {
      return { angle, speed: random(0.5, 2) * speedScale };
    }
    const cfg = BURST_SIZES[sizeKey];
    const speed = random(cfg.speed * 0.4, cfg.speed) * cfg.spread * speedScale;
    return { angle, speed };
  }

  function spawnBurst(x, y, size, hueFn, particleScale = 1, options = {}) {
    const cfg = BURST_SIZES[size];
    const count = Math.floor(cfg.count * particleScale);
    const trail = !!options.trail;

    for (let i = 0; i < count; i++) {
      const { angle, speed } = randomVelocity(size, trail);
      particles.push(createParticle(x, y, angle, speed, hueFn(i, count), "main", options));
    }

    const sparkleBase = size === "big" ? 22 : size === "medium" ? 15 : 10;
    const sparkleCount = Math.floor(sparkleBase * particleScale);
    for (let i = 0; i < sparkleCount; i++) {
      const { angle, speed } = randomVelocity("sparkle", trail);
      particles.push(createParticle(x, y, angle, speed, hueFn(i, sparkleCount), "sparkle", options));
    }

    if (size === "big") {
      drawGlow(x, y, hueFn(0, count));
    }
  }

  function burstSingleColor(x, y) {
    const baseHue = random(0, 360);
    const size = pickRandom(["small", "medium", "big"]);
    spawnBurst(x, y, size, () => baseHue + random(-15, 15));
    playPopSound(size, "normal");
  }

  function burstRainbowRing(x, y) {
    const ringCount = 72;
    const ringSpeed = 3.4;
    const innerCount = 36;
    const innerSpeed = 2.2;

    for (let i = 0; i < ringCount; i++) {
      const angle = (Math.PI * 2 * i) / ringCount;
      const hue = (360 / ringCount) * i + random(-12, 12);
      particles.push(createParticle(x, y, angle, ringSpeed + random(-0.2, 0.2), hue, "ring"));
    }

    for (let i = 0; i < innerCount; i++) {
      const angle = (Math.PI * 2 * i) / innerCount + Math.PI / innerCount;
      const hue = (360 / innerCount) * i + random(-12, 12);
      particles.push(createParticle(x, y, angle, innerSpeed + random(-0.15, 0.15), hue, "ring"));
    }

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      particles.push(createParticle(x, y, angle, random(0.4, 1.2), (360 / 20) * i, "sparkle"));
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flash = ctx.createRadialGradient(x, y, 0, x, y, 28);
    flash.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    flash.addColorStop(0.4, "rgba(255, 240, 180, 0.35)");
    flash.addColorStop(1, "rgba(255, 220, 120, 0)");
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    const halo = ctx.createRadialGradient(x, y, 8, x, y, 75);
    halo.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    halo.addColorStop(0.35, "rgba(255, 220, 120, 0.25)");
    halo.addColorStop(1, "rgba(255, 200, 80, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    playPopSound("big", "bright");
  }

  function addPlanPoint(x, y) {
    const index = pointer.planPoints.length;
    pointer.planPoints.push({ x, y });
    const markerHue = isDayMode ? (index * 40) % 360 : pointer.planHue;
    planMarkers.push({
      x,
      y,
      hue: markerHue,
      pulse: random(0, Math.PI * 2),
      planId: pointer.planId,
    });
  }

  function extendPlan(x, y) {
    const spacing = isDayMode ? PLAN_SPACING_DAY : PLAN_SPACING_NIGHT;
    const dx = x - pointer.lastPlanX;
    const dy = y - pointer.lastPlanY;
    const dist = Math.hypot(dx, dy);
    if (dist < spacing) return;

    const steps = Math.floor(dist / spacing);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      addPlanPoint(pointer.lastPlanX + dx * t, pointer.lastPlanY + dy * t);
    }
    pointer.lastPlanX = x;
    pointer.lastPlanY = y;
  }

  function removePlanMarkers(planId) {
    for (let i = planMarkers.length - 1; i >= 0; i--) {
      if (planMarkers[i].planId === planId) planMarkers.splice(i, 1);
    }
  }

  function removeOnePlanMarker(planId) {
    const idx = planMarkers.findIndex((m) => m.planId === planId);
    if (idx >= 0) planMarkers.splice(idx, 1);
  }

  function launchPlan(points, hue, planId) {
    if (points.length === 0) return;

    initAudio();

    if (isDayMode) {
      const soundTimer = setTimeout(() => {
        playRainbowTrailSound(points.length);
      }, PLAN_START_DELAY);
      pendingTimers.push(soundTimer);

      points.forEach((pt, i) => {
        const timer = setTimeout(() => {
          spawnRainbowArc(pt.x, pt.y, pickRandom(["small", "medium", "big"]), { silent: true });
          removeOnePlanMarker(planId);
        }, PLAN_START_DELAY + i * PLAN_STAGGER_DELAY);
        pendingTimers.push(timer);
      });

      const cleanupTimer = setTimeout(() => {
        removePlanMarkers(planId);
      }, PLAN_START_DELAY + points.length * PLAN_STAGGER_DELAY + 50);
      pendingTimers.push(cleanupTimer);
    } else {
      const soundTimer = setTimeout(() => {
        playFireworkTrailSound(points.length);
      }, PLAN_START_DELAY);
      pendingTimers.push(soundTimer);

      points.forEach((pt, i) => {
        const timer = setTimeout(() => {
          const size = pickRandom(["small", "medium", "big"]);
          spawnBurst(pt.x, pt.y, size, () => hue + random(-12, 12), 1, { trail: true });
          removeOnePlanMarker(planId);
        }, PLAN_START_DELAY + i * PLAN_STAGGER_DELAY);
        pendingTimers.push(timer);
      });

      const cleanupTimer = setTimeout(() => {
        removePlanMarkers(planId);
      }, PLAN_START_DELAY + points.length * PLAN_STAGGER_DELAY + 50);
      pendingTimers.push(cleanupTimer);
    }
  }

  function drawGlow(x, y, hue) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 80);
    glow.addColorStop(0, `hsla(${hue}, 95%, 70%, 0.35)`);
    glow.addColorStop(0.5, `hsla(${hue}, 95%, 60%, 0.12)`);
    glow.addColorStop(1, `hsla(${hue}, 95%, 50%, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - 80, y - 80, 160, 160);
    ctx.restore();
  }

  function updatePlanMarkers() {
    for (const m of planMarkers) {
      m.pulse += 0.13;
    }
  }

  function drawPlanMarkers() {
    if (planMarkers.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = isDayMode ? "source-over" : "lighter";

    for (let i = 0; i < planMarkers.length; i++) {
      const m = planMarkers[i];
      const pulse = 0.46 + Math.sin(m.pulse) * 0.22;
      const r = 5 + Math.sin(m.pulse * 0.7) * 1.6;

      ctx.fillStyle = `hsla(${m.hue}, 85%, 76%, ${pulse})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `hsla(${m.hue}, 90%, 86%, ${pulse * 0.45})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    const planIds = [...new Set(planMarkers.map((m) => m.planId))];
    for (const planId of planIds) {
      const trail = planMarkers.filter((m) => m.planId === planId);
      if (trail.length < 2) continue;
      if (isDayMode) {
        ctx.lineWidth = 3;
        for (let i = 1; i < trail.length; i++) {
          ctx.strokeStyle = `hsla(${trail[i].hue}, 75%, 65%, 0.35)`;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = `hsla(${trail[0].hue}, 70%, 70%, 0.25)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY * (p.type === "ring" ? 0.35 : 1);
      p.vx *= DRAG;

      if (p.appear != null && p.appear < 1) {
        p.appear = Math.min(1, p.appear + p.appearSpeed);
        const eased = 1 - Math.pow(1 - p.appear, 3);
        p.alpha = eased;
      } else {
        p.alpha -= p.decay;
      }

      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const p of particles) {
      if (p.type === "sparkle") {
        const color = p.sparkleTint
          ? `hsla(${p.hue}, 80%, 85%, ${p.alpha})`
          : `rgba(255, 255, 240, ${p.alpha * 0.95})`;
        ctx.fillStyle = color;
      } else if (p.type === "ring") {
        ctx.fillStyle = `hsla(${p.hue}, 98%, 68%, ${p.alpha})`;
      } else {
        ctx.fillStyle = `hsla(${p.hue}, 95%, 62%, ${p.alpha})`;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }


  function initRaindrops() {
    raindrops = [];
    for (let i = 0; i < MAX_RAIN_DROPS; i++) {
      raindrops.push(makeRaindrop(true));
    }
  }

  function makeRaindrop(randomY) {
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : random(-40, 0),
      speed: random(9, 16),
      len: random(12, 26),
      alpha: random(0.35, 0.7),
    };
  }

  function updateRain() {
    if (!isRaining) return;
    if (raindrops.length < MAX_RAIN_DROPS) {
      raindrops.push(makeRaindrop(false));
    }
    for (let i = 0; i < raindrops.length; i++) {
      const d = raindrops[i];
      d.y += d.speed;
      d.x -= 0.6;
      if (d.y > height + d.len || d.x < -10) {
        raindrops[i] = makeRaindrop(false);
      }
    }
  }

  function drawRain() {
    if (!isRaining || raindrops.length === 0) return;
    const dayMix = skyBlend;
    ctx.save();
    if (dayMix > 0.25) {
      ctx.fillStyle = `rgba(70, 95, 130, ${0.06 * dayMix})`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.lineCap = "round";
    for (const d of raindrops) {
      const alpha = d.alpha * (0.85 + dayMix * 0.35);
      ctx.globalAlpha = alpha;
      if (dayMix > 0.4) {
        ctx.strokeStyle = "rgba(45, 75, 130, 0.9)";
        ctx.lineWidth = 2.6;
      } else {
        ctx.strokeStyle = "rgba(190, 210, 255, 0.75)";
        ctx.lineWidth = 1.8;
      }
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3 - dayMix * 2, d.y + d.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function startRainSound() {
    initAudio();
    if (rainNoise) return;

    const len = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }

    rainNoise = audioCtx.createBufferSource();
    rainNoise.buffer = buffer;
    rainNoise.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;

    const band = audioCtx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 450;
    band.Q.value = 0.4;

    rainGain = audioCtx.createGain();
    rainGain.gain.setValueAtTime(0, audioCtx.currentTime);
    rainGain.gain.linearRampToValueAtTime(0.09, audioCtx.currentTime + 0.8);

    rainNoise.connect(filter);
    filter.connect(band);
    band.connect(rainGain);
    rainGain.connect(audioCtx.destination);
    rainNoise.start();
  }

  function stopRainSound() {
    if (!rainGain || !rainNoise) return;
    const t = audioCtx.currentTime;
    rainGain.gain.cancelScheduledValues(t);
    rainGain.gain.setValueAtTime(rainGain.gain.value, t);
    rainGain.gain.linearRampToValueAtTime(0, t + 0.6);
    const node = rainNoise;
    const gain = rainGain;
    rainNoise = null;
    rainGain = null;
    setTimeout(() => {
      try { node.stop(); } catch (e) {}
      gain.disconnect();
    }, 700);
  }

  function toggleRain() {
    isRaining = !isRaining;
    if (rainBtn) rainBtn.classList.toggle("active", isRaining);
    updateCustomCursor();
    if (isRaining) {
      initRaindrops();
      startRainSound();
    } else {
      raindrops = [];
      stopRainSound();
    }
  }

  function drawFrame() {
    updateSkyBlend();
    drawSky();
    updateStars();
    drawStars();
    tickAmbientSpawner();
    updateAmbient();
    drawAmbient();
    const trailMix = skyBlend;
    const nightTrail = 0.07;
    const dayTrail = 0.06;
    const trailA = nightTrail * (1 - trailMix) + dayTrail * trailMix;
    const r = Math.round(2 * (1 - trailMix) + 200 * trailMix);
    const g = Math.round(2 * (1 - trailMix) + 230 * trailMix);
    const b = Math.round(8 * (1 - trailMix) + 255 * trailMix);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailA})`;
    ctx.fillRect(0, 0, width, height);

    updatePlanMarkers();
    updateArcs();
    updateParticles();
    drawPlanMarkers();
    drawArcs();
    if (particles.length > 0) {
      drawParticles();
    }
    updateRain();
    drawRain();
    drawLongPressHint();
  }

  function drawLongPressHint() {
    if (!touchPress || touchPress.wowFired || !pointer.active || pointer.dragging) return;

    const elapsed = Date.now() - touchPress.startTime;
    const progress = Math.min(1, elapsed / LONG_PRESS_MS);
    const { x, y } = getCanvasCoords(touchPress.clientX, touchPress.clientY);

    ctx.save();
    ctx.strokeStyle = `hsla(${(progress * 360) | 0}, 90%, 65%, ${0.35 + progress * 0.45})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 8 + progress * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function loop() {
    drawFrame();
    requestAnimationFrame(loop);
  }

  function getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  }

  function resetPointer() {
    pointer.active = false;
    pointer.dragging = false;
    pointer.button = null;
    pointer.planPoints = [];
  }

  function clearTouchPress() {
    if (touchPress?.timer) clearTimeout(touchPress.timer);
    touchPress = null;
  }

  function triggerWowEffect(x, y) {
    initAudio();
    if (isDayMode) {
      spawnRainbowArc(x, y, "wow");
    } else {
      burstRainbowRing(x, y);
    }
  }

  function beginPointer(clientX, clientY, button) {
    initAudio();
    const { x, y } = getCanvasCoords(clientX, clientY);
    pointer.active = true;
    pointer.dragging = false;
    pointer.button = button;
    pointer.startX = x;
    pointer.startY = y;
    pointer.lastPlanX = x;
    pointer.lastPlanY = y;
    pointer.planHue = random(0, 360);
    pointer.planPoints = [];

    if (button === 2) {
      triggerWowEffect(x, y);
      pointer.active = false;
    }
  }

  function movePointer(clientX, clientY) {
    if (!pointer.active || pointer.button !== 0) return;

    const { x, y } = getCanvasCoords(clientX, clientY);
    const dist = Math.hypot(x - pointer.startX, y - pointer.startY);

    if (!pointer.dragging && dist >= DRAG_THRESHOLD) {
      pointer.dragging = true;
      pointer.planId = nextPlanId++;
      addPlanPoint(pointer.startX, pointer.startY);
    }

    if (pointer.dragging) {
      extendPlan(x, y);
    }
  }

  function finishPointer(clientX, clientY) {
    if (!pointer.active) return;

    const { x, y } = getCanvasCoords(clientX, clientY);

    if (pointer.button === 0) {
      if (pointer.dragging) {
        extendPlan(x, y);
        launchPlan([...pointer.planPoints], pointer.planHue, pointer.planId);
      } else if (isDayMode) {
        spawnRainbowArc(x, y, pickRandom(["small", "medium", "big"]));
      } else {
        burstSingleColor(x, y);
      }
    }

    resetPointer();
  }

  const customCursor = document.getElementById("custom-cursor");
  let cursorOnScreen = false;
  function updateCustomCursor() {
    if (!customCursor) return;
    if (isRaining) customCursor.textContent = "🦄";
    else if (isDayMode) customCursor.textContent = "🦋";
    else customCursor.textContent = "✨";
  }

  function updateDayNightUi() {
    if (iconSun) iconSun.hidden = isDayMode;
    if (iconMoon) iconMoon.hidden = !isDayMode;
    document.body.classList.toggle("day-mode", isDayMode);
    if (daynightBtn) {
      daynightBtn.setAttribute("aria-label", isDayMode ? "Switch to night" : "Switch to day");
      daynightBtn.title = isDayMode ? "Night mode" : "Day mode";
    }
    updateCustomCursor();
  }

  function toggleDayNight() {
    isDayMode = !isDayMode;
    skyBlendTarget = isDayMode ? 1 : 0;
    ambientCreatures = [];
    scheduleNextAmbientSpawn();
    updateDayNightUi();
  }

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0 || e.button === 2) {
      e.preventDefault();
      beginPointer(e.clientX, e.clientY, e.button);
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (pointer.active && e.buttons & 1) {
      movePointer(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener("mouseup", (e) => {
    if (pointer.active && (e.button === 0 || e.button === pointer.button)) {
      finishPointer(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener("mouseleave", () => {
    if (pointer.active && pointer.dragging && pointer.planPoints.length > 0) {
      launchPlan([...pointer.planPoints], pointer.planHue, pointer.planId);
    }
    if (pointer.active) resetPointer();
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    clearTouchPress();
    beginPointer(touch.clientX, touch.clientY, 0);
    touchPress = {
      startTime: Date.now(),
      clientX: touch.clientX,
      clientY: touch.clientY,
      wowFired: false,
    };
    touchPress.timer = setTimeout(() => {
      if (pointer.active && !pointer.dragging && touchPress) {
        const { x, y } = getCanvasCoords(touchPress.clientX, touchPress.clientY);
        touchPress.wowFired = true;
        resetPointer();
        triggerWowEffect(x, y);
        clearTouchPress();
      }
    }, LONG_PRESS_MS);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touchPress && !pointer.dragging) {
      const dx = touch.clientX - touchPress.clientX;
      const dy = touch.clientY - touchPress.clientY;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_LIMIT) {
        clearTouchPress();
      }
    }
    if (pointer.dragging && touchPress) {
      clearTouchPress();
    }
    movePointer(touch.clientX, touch.clientY);
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (touchPress?.wowFired) {
      clearTouchPress();
      return;
    }
    clearTouchPress();
    finishPointer(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  });

  canvas.addEventListener("touchcancel", () => {
    clearTouchPress();
    if (pointer.active) resetPointer();
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function birdChirp(at, vol, startFreq, endFreq, duration) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(300, endFreq), at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(vol, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.03);
  }



  function playFireworkTrailSound(pointCount) {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const start = now;
    const step = PLAN_STAGGER_DELAY / 1000;
    const duration = pointCount * step + 0.45;

    const pad = audioCtx.createOscillator();
    const padGain = audioCtx.createGain();
    const padFilter = audioCtx.createBiquadFilter();
    pad.type = "sine";
    pad.frequency.value = 52;
    padFilter.type = "lowpass";
    padFilter.frequency.value = 140;
    padGain.gain.setValueAtTime(0, start);
    padGain.gain.linearRampToValueAtTime(0.03, start + 0.05);
    padGain.gain.setValueAtTime(0.02, start + duration * 0.8);
    padGain.gain.exponentialRampToValueAtTime(0.001, start + duration + 0.25);
    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(audioCtx.destination);
    pad.start(start);
    pad.stop(start + duration + 0.3);

    for (let i = 0; i < pointCount; i++) {
      const t = start + i * step;
      const vol = random(0.055, 0.095);
      const boomDur = random(0.1, 0.14);

      const boom = audioCtx.createOscillator();
      const boomGain = audioCtx.createGain();
      const boomFilter = audioCtx.createBiquadFilter();
      boom.type = "sine";
      boom.frequency.setValueAtTime(random(85, 125), t);
      boom.frequency.exponentialRampToValueAtTime(38, t + boomDur);
      boomFilter.type = "lowpass";
      boomFilter.frequency.value = 200;
      boomGain.gain.setValueAtTime(0, t);
      boomGain.gain.linearRampToValueAtTime(vol, t + 0.008);
      boomGain.gain.exponentialRampToValueAtTime(0.001, t + boomDur);
      boom.connect(boomFilter);
      boomFilter.connect(boomGain);
      boomGain.connect(audioCtx.destination);
      boom.start(t);
      boom.stop(t + boomDur + 0.02);

      const len = Math.max(1, Math.floor(audioCtx.sampleRate * boomDur * 0.7));
      const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < len; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 1.8);
      }
      const sizzle = audioCtx.createBufferSource();
      sizzle.buffer = buffer;
      const sFilter = audioCtx.createBiquadFilter();
      sFilter.type = "highpass";
      sFilter.frequency.value = random(1600, 2200);
      const sGain = audioCtx.createGain();
      sGain.gain.setValueAtTime(vol * 0.35, t + 0.02);
      sGain.gain.exponentialRampToValueAtTime(0.001, t + boomDur * 0.75);
      sizzle.connect(sFilter);
      sFilter.connect(sGain);
      sGain.connect(audioCtx.destination);
      sizzle.start(t + 0.02);
      sizzle.stop(t + boomDur * 0.8);
    }
  }

  function playRainbowTrailSound(pointCount) {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const start = now;
    const step = PLAN_STAGGER_DELAY / 1000;
    const duration = pointCount * step + 0.55;
    const notes = [523, 587, 659, 698, 784, 880, 988, 784];

    const pad = audioCtx.createOscillator();
    const padGain = audioCtx.createGain();
    const padFilter = audioCtx.createBiquadFilter();
    pad.type = "triangle";
    pad.frequency.value = 440;
    padFilter.type = "lowpass";
    padFilter.frequency.value = 1200;
    padGain.gain.setValueAtTime(0, start);
    padGain.gain.linearRampToValueAtTime(0.022, start + 0.06);
    padGain.gain.setValueAtTime(0.016, start + duration * 0.85);
    padGain.gain.exponentialRampToValueAtTime(0.001, start + duration + 0.3);
    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(audioCtx.destination);
    pad.start(start);
    pad.stop(start + duration + 0.35);

    for (let i = 0; i < pointCount; i++) {
      const t = start + i * step;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.value = notes[i % notes.length];
      filter.type = "lowpass";
      filter.frequency.value = 2200;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.2);

      if (i % 2 === 0) {
        birdChirp(t + 0.04, 0.035, random(1800, 2400), random(2800, 3600), 0.06);
      }
    }
  }

  function playRainbowSound(sizeKey, options = {}) {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const big = sizeKey === "big" || sizeKey === "wow";
    const volume = (big ? 0.11 : sizeKey === "small" ? 0.065 : 0.085) * (sizeKey === "wow" ? 1.1 : 1);
    const shimmerNotes = big ? [523, 659, 784, 988, 1175] : [523, 659, 784];

    for (let i = 0; i < shimmerNotes.length; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.value = shimmerNotes[i];
      filter.type = "lowpass";
      filter.frequency.value = 2400;
      const start = now + i * 0.07;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * 0.18, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    }

    const chirpCount = big ? 3 : 2;
    for (let i = 0; i < chirpCount; i++) {
      const t = now + 0.12 + i * random(0.14, 0.24);
      birdChirp(
        t,
        volume * random(0.45, 0.75),
        random(2100, 2700),
        random(3300, 4800),
        random(0.055, 0.11)
      );
    }

    if (big) {
      birdChirp(now + 0.55, volume * 0.35, 1800, 2600, 0.14);
    }
  }

  function playPopSound(size, mode = "normal") {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const bright = mode === "bright";
    let volume = bright ? 0.27 : size === "big" ? 0.2 : size === "medium" ? 0.15 : 0.11;
    const boomDur = size === "big" ? 0.28 : size === "medium" ? 0.22 : 0.16;
    const sizzleDur = size === "big" ? 0.55 : size === "medium" ? 0.42 : 0.3;

    function noiseBurst(at, vol, durationSec, filterType, freq, q) {
      const len = Math.max(1, Math.floor(audioCtx.sampleRate * durationSec));
      const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, filterType === "highpass" ? 1.4 : 2);
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = freq;
      if (q != null) filter.Q.value = q;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(vol, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + durationSec);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(at);
      source.stop(at + durationSec);
    }

    const boom = audioCtx.createOscillator();
    const boomGain = audioCtx.createGain();
    const boomFilter = audioCtx.createBiquadFilter();
    boom.type = "sine";
    boom.frequency.setValueAtTime(bright ? 130 : size === "big" ? 95 : 110, now);
    boom.frequency.exponentialRampToValueAtTime(bright ? 55 : 38, now + boomDur);
    boomFilter.type = "lowpass";
    boomFilter.frequency.setValueAtTime(bright ? 240 : 180, now);
    boomFilter.frequency.exponentialRampToValueAtTime(60, now + boomDur);
    boomGain.gain.setValueAtTime(volume * 0.9, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + boomDur);
    boom.connect(boomFilter);
    boomFilter.connect(boomGain);
    boomGain.connect(audioCtx.destination);
    boom.start(now);
    boom.stop(now + boomDur);

    noiseBurst(now, volume * 0.45, boomDur * 0.55, "lowpass", bright ? 680 : 520, null);
    noiseBurst(now + 0.03, volume * (bright ? 0.3 : 0.22), sizzleDur, "highpass", bright ? 2400 : 1800, null);
    noiseBurst(now + 0.05, volume * 0.12, sizzleDur * 0.85, "bandpass", bright ? 1200 : 900, 0.6);
    if (bright) noiseBurst(now + 0.02, volume * 0.15, 0.12, "highpass", 3200, null);
  }


  if (rainBtn) {
    rainBtn.addEventListener("mousedown", (e) => { e.stopPropagation(); resetPointer(); });
    rainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetPointer();
      toggleRain();
    });
  }

  if (daynightBtn) {
    daynightBtn.addEventListener("mousedown", (e) => { e.stopPropagation(); resetPointer(); });
    daynightBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetPointer();
      toggleDayNight();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("mousedown", (e) => { e.stopPropagation(); resetPointer(); });
    fullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetPointer();
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    });
  }

  document.addEventListener("fullscreenchange", () => {
    iconEnter.hidden = !!document.fullscreenElement;
    iconExit.hidden = !document.fullscreenElement;
  });



  updateCustomCursor();

  document.addEventListener("mousemove", (e) => {
    if (!customCursor) return;
    if (e.target.closest(".toolbar-btn")) {
      customCursor.style.opacity = "0";
      cursorOnScreen = false;
      return;
    }
    customCursor.style.left = e.clientX + "px";
    customCursor.style.top = e.clientY + "px";
    customCursor.style.opacity = "1";
    cursorOnScreen = true;
  });

  document.addEventListener("mouseleave", () => {
    if (!customCursor) return;
    customCursor.style.opacity = "0";
    cursorOnScreen = false;
  });

  updateDayNightUi();
  window.addEventListener("resize", resize);
  resize();
  scheduleNextAmbientSpawn();
  loop();
})();
