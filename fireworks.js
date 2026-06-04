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
  const constellationBtn = document.getElementById("constellation-btn");

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
  let shootingStars = [];
  let nextShootingStarAt = 0;
  let celestialPulsePhase = 0;
  let lastInputAt = 0;
  let clouds = [];
  let fireflies = [];
  let rainStartedAt = 0;
  let thunderFlash = 0;
  let nextThunderAt = 0;
  let postRainRainbows = [];
  let constellationEvent = null;
  let cloudShapeEvent = null;
  let nextSkyPatternAt = 0;

  const MAX_RAIN_DROPS = 140;
  const LONG_PRESS_MS = 500;
  const LONG_PRESS_MOVE_LIMIT = 14;
  const MAX_AMBIENT = 1;
  const AMBIENT_SPAWN_MIN_MS = 20000;
  const AMBIENT_SPAWN_MAX_MS = 40000;
  const AMBIENT_LIFE_MIN_MS = 8000;
  const AMBIENT_LIFE_MAX_MS = 14000;
  const AMBIENT_FADE_MS = 1200;
  const IDLE_SPARKLE_MS = 25000;
  const SHOOTING_STAR_MIN_MS = 120000;
  const SHOOTING_STAR_MAX_MS = 240000;
  const FIREFLY_COUNT = 4;
  const THUNDER_MIN_MS = 30000;
  const THUNDER_MAX_MS = 60000;
  const POST_RAIN_MIN_MS = 3000;
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
    lastClientX: 0,
    lastClientY: 0,
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

  const SEASON_PALETTES = {
    winter: {
      nightTop: "#0a0e28", nightBottom: "#010106",
      dayTop: "#8eb8e8", dayBottom: "#e8f2fc",
      moonRgb: "255, 248, 220", sunRgb: "255, 230, 80",
      hueShift: 8,
    },
    spring: {
      nightTop: "#0f1238", nightBottom: "#030310",
      dayTop: "#7ec8e8", dayBottom: "#e5f8e8",
      moonRgb: "255, 248, 220", sunRgb: "255, 220, 60",
      hueShift: -10,
    },
    summer: {
      nightTop: "#0d1033", nightBottom: "#020208",
      dayTop: "#6ec5ff", dayBottom: "#dff3ff",
      moonRgb: "255, 248, 220", sunRgb: "255, 220, 60",
      hueShift: 0,
    },
    fall: {
      nightTop: "#120a1a", nightBottom: "#060308",
      dayTop: "#7aabff", dayBottom: "#ffe8cc",
      moonRgb: "255, 235, 200", sunRgb: "255, 180, 50",
      hueShift: 20,
    },
  };

  const SOUND_VARIANTS = {
    pop: [
      { boomMult: 1, pitchMult: 1, volMult: 1 },
      { boomMult: 0.92, pitchMult: 1.1, volMult: 0.94 },
      { boomMult: 1.08, pitchMult: 0.9, volMult: 1.06 },
      { boomMult: 0.96, pitchMult: 1.16, volMult: 0.9 },
    ],
    rainbow: [
      { pitchShift: 0, volMult: 1 },
      { pitchShift: 2, volMult: 0.95 },
      { pitchShift: -2, volMult: 1.04 },
      { pitchShift: 3, volMult: 0.92 },
    ],
  };

  const SKY_PATTERN_MIN_MS = 120000;
  const SKY_PATTERN_MAX_MS = 200000;

  const GRAVITY = 0.028;
  const DRAG = 0.992;
  const DRAG_THRESHOLD = 10;
  const PLAN_SPACING_NIGHT = 36;
  const PLAN_SPACING_DAY = 100;
  const PLAN_START_DELAY = 320;
  const PLAN_STAGGER_DELAY = 85;
  const PARTICLE_HUE_STEP = 24;
  const PARTICLE_ALPHA_STEP = 0.2;
  const MARKER_PULSE_STEP = 0.125;
  const MAX_TRAIL_SOUND_SESSIONS = 12;
  const TRAIL_SOUND_HIT_BUDGET = 320;
  const MIN_POP_SOUND_MS = 50;

  let glowSpriteCache = null;
  let trailSoundSessions = [];
  let sharedNoiseBuffers = null;
  let lastPopSoundAt = 0;
  let popSoundsInWindow = 0;
  let popWindowStart = 0;
  let audioRecoveryAttempted = 0;
  const MAX_PENDING_TIMERS = 450;

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function noteInput() {
    lastInputAt = Date.now();
    if (!ensureAudioReady()) return;
    syncRainSound();
    pruneStaleTrailSessions();
  }

  function scheduleTimer(fn, delayMs) {
    if (pendingTimers.length >= MAX_PENDING_TIMERS) {
      const dropCount = pendingTimers.length - MAX_PENDING_TIMERS + 80;
      const dropped = pendingTimers.splice(0, dropCount);
      for (const id of dropped) clearTimeout(id);
    }
    const id = setTimeout(() => {
      removePendingTimer(id);
      fn();
    }, delayMs);
    pendingTimers.push(id);
    return id;
  }

  /** Trail firework timers — never dropped by the generic timer cap. */
  function schedulePlanTimer(fn, delayMs) {
    const id = setTimeout(() => {
      removePendingTimer(id);
      fn();
    }, delayMs);
    pendingTimers.push(id);
    return id;
  }

  function removePendingTimer(id) {
    const idx = pendingTimers.indexOf(id);
    if (idx >= 0) pendingTimers.splice(idx, 1);
  }

  function stopTrailSoundSession(session) {
    if (!session) return;
    if (session.endTimerId != null) {
      clearTimeout(session.endTimerId);
      removePendingTimer(session.endTimerId);
      session.endTimerId = null;
    }
    if (audioCtx) {
      const now = audioCtx.currentTime;
      for (const node of session.nodes) {
        try {
          if (typeof node.stop === "function") node.stop(now);
          node.disconnect();
        } catch (_) {
          /* already stopped */
        }
      }
    }
    session.nodes.length = 0;
    const idx = trailSoundSessions.indexOf(session);
    if (idx >= 0) trailSoundSessions.splice(idx, 1);
  }

  function pruneStaleTrailSessions() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    for (let i = trailSoundSessions.length - 1; i >= 0; i--) {
      const session = trailSoundSessions[i];
      if (session.nodes.length === 0 || (session.endsAt != null && session.endsAt < now - 0.5)) {
        stopTrailSoundSession(session);
      }
    }
  }

  function beginTrailSoundSession(durationSec) {
    const session = {
      nodes: [],
      endsAt: audioCtx ? audioCtx.currentTime + durationSec + 0.5 : null,
      endTimerId: null,
    };
    while (trailSoundSessions.length >= MAX_TRAIL_SOUND_SESSIONS) {
      stopTrailSoundSession(trailSoundSessions[0]);
    }
    trailSoundSessions.push(session);
    return session;
  }

  function trackSessionSound(session, node) {
    if (session && node) session.nodes.push(node);
  }

  function trailSoundMixScale() {
    return 0.92 / Math.sqrt(Math.max(1, trailSoundSessions.length));
  }

  function trailSoundHitCount(pointCount) {
    const sessions = Math.max(1, trailSoundSessions.length);
    const capped = Math.floor(TRAIL_SOUND_HIT_BUDGET / sessions);
    return Math.min(pointCount, Math.max(1, capped));
  }

  function scheduleTrailSessionEnd(session, durationSec) {
    session.endsAt = audioCtx ? audioCtx.currentTime + durationSec + 0.5 : null;
    session.endTimerId = schedulePlanTimer(() => {
      session.endTimerId = null;
      stopTrailSoundSession(session);
    }, Math.ceil((durationSec + 0.4) * 1000));
  }

  function resetAudioContext() {
    const sessions = trailSoundSessions.slice();
    for (const session of sessions) {
      stopTrailSoundSession(session);
    }
    trailSoundSessions = [];
    try {
      if (rainNoise) rainNoise.stop();
    } catch (_) {}
    rainNoise = null;
    rainGain = null;
    try {
      if (audioCtx) audioCtx.close();
    } catch (_) {}
    audioCtx = null;
    sharedNoiseBuffers = null;
  }

  function ensureAudioReady() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      sharedNoiseBuffers = null;
    }
    if (audioCtx.state === "closed") {
      resetAudioContext();
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      sharedNoiseBuffers = null;
    }
    if (audioCtx.state === "suspended" || audioCtx.state === "interrupted") {
      const resumed = audioCtx.resume();
      if (resumed && typeof resumed.catch === "function") resumed.catch(() => {});
    }
    ensureSharedNoiseBuffers();
    return audioCtx.state !== "closed";
  }

  function syncRainSound() {
    if (!isRaining || rainNoise) return;
    startRainSound();
  }

  function runAudioSafe(fn) {
    if (!ensureAudioReady()) return;
    try {
      fn();
    } catch (err) {
      const now = Date.now();
      if (now - audioRecoveryAttempted < 800) return;
      audioRecoveryAttempted = now;
      resetAudioContext();
      if (!ensureAudioReady()) return;
      try {
        fn();
      } catch (_) {
        /* give up until next gesture */
      }
    }
  }

  function ensureSharedNoiseBuffers() {
    if (!audioCtx || sharedNoiseBuffers) return;
    sharedNoiseBuffers = {};
    const specs = [
      ["sizzleShort", 0.1],
      ["sizzleMed", 0.14],
      ["popShort", 0.16],
      ["popMed", 0.22],
      ["popLong", 0.28],
      ["sizzleLong", 0.42],
      ["sizzleBright", 0.12],
    ];
    for (const [key, dur] of specs) {
      const len = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
      const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
      }
      sharedNoiseBuffers[key] = { buffer, dur };
    }
  }

  function pickNoiseBuffer(durationSec) {
    ensureSharedNoiseBuffers();
    if (!sharedNoiseBuffers) return null;
    let best = sharedNoiseBuffers.sizzleMed;
    let bestDiff = Infinity;
    for (const entry of Object.values(sharedNoiseBuffers)) {
      const diff = Math.abs(entry.dur - durationSec);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = entry;
      }
    }
    return best;
  }

  function celestialPosition() {
    return { x: width * 0.82, y: height * 0.14 };
  }

  function getSeasonKey() {
    const m = new Date().getMonth();
    if (m === 11 || m <= 1) return "winter";
    if (m >= 2 && m <= 4) return "spring";
    if (m >= 5 && m <= 7) return "summer";
    return "fall";
  }

  function getSeasonPalette() {
    return SEASON_PALETTES[getSeasonKey()];
  }

  function pickSoundVariant() {
    return Math.floor(Math.random() * 4);
  }

  function pitchShiftFreq(freq, semitones) {
    return freq * Math.pow(2, semitones / 12);
  }

  function seasonHue(baseHue) {
    const shift = getSeasonPalette().hueShift;
    return ((baseHue + shift) % 360 + 360) % 360;
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

    const palette = getSeasonPalette();
    const gradient = skyCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, palette.nightTop);
    gradient.addColorStop(1, palette.nightBottom);
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, width, height);

    const moonX = width * 0.82;
    const moonY = height * 0.14;
    const moonGlow = skyCtx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 70);
    moonGlow.addColorStop(0, `rgba(${palette.moonRgb}, 0.18)`);
    moonGlow.addColorStop(0.4, `rgba(${palette.moonRgb}, 0.06)`);
    moonGlow.addColorStop(1, `rgba(${palette.moonRgb}, 0)`);
    skyCtx.fillStyle = moonGlow;
    skyCtx.fillRect(moonX - 70, moonY - 70, 140, 140);

    skyCtx.fillStyle = `rgba(${palette.moonRgb}, 0.75)`;
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

    const palette = getSeasonPalette();
    const gradient = skyCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, palette.dayTop);
    gradient.addColorStop(1, palette.dayBottom);
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, width, height);

    const sunX = width * 0.82;
    const sunY = height * 0.14;
    const sunGlow = skyCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 85);
    sunGlow.addColorStop(0, `rgba(${palette.sunRgb}, 0.45)`);
    sunGlow.addColorStop(0.35, `rgba(${palette.sunRgb}, 0.15)`);
    sunGlow.addColorStop(1, `rgba(${palette.sunRgb}, 0)`);
    skyCtx.fillStyle = sunGlow;
    skyCtx.fillRect(sunX - 85, sunY - 85, 170, 170);

    skyCtx.fillStyle = `rgba(${palette.sunRgb}, 0.95)`;
    skyCtx.beginPath();
    skyCtx.arc(sunX, sunY, 22, 0, Math.PI * 2);
    skyCtx.fill();

    return c;
  }

  function initClouds() {
    clouds = [
      { x: width * 0.18, y: height * 0.22, scale: 1, speed: 0.08 },
      { x: width * 0.45, y: height * 0.12, scale: 0.85, speed: 0.06 },
      { x: width * 0.62, y: height * 0.28, scale: 1.1, speed: 0.07 },
      { x: width * 0.32, y: height * 0.38, scale: 0.75, speed: 0.05 },
      { x: width * 0.78, y: height * 0.42, scale: 0.9, speed: 0.065 },
    ];
  }

  function initFireflies() {
    fireflies = [];
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const y = random(height * 0.55, height * 0.88);
      fireflies.push({
        x: random(width * 0.08, width * 0.92),
        y,
        baseY: y,
        phase: random(0, Math.PI * 2),
        speed: random(0.03, 0.06),
        bobAmp: random(4, 10),
        driftX: random(-0.12, 0.12),
      });
    }
  }

  function buildSky() {
    nightSkyCanvas = buildNightSky();
    daySkyCanvas = buildDaySky();
    initClouds();
    initFireflies();
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

  function updateClouds() {
    for (const c of clouds) {
      c.x -= c.speed;
      if (c.x < -120) c.x = width + 120;
    }
  }

  function drawClouds() {
    if (clouds.length === 0 || skyBlend <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = skyBlend * 0.92;
    for (const c of clouds) {
      drawCloudBlob(ctx, c.x, c.y, c.scale);
    }
    ctx.restore();
  }

  function updateFireflies() {
    for (const f of fireflies) {
      f.phase += f.speed;
      f.x += f.driftX;
      f.y = f.baseY + Math.sin(f.phase) * f.bobAmp;
      if (f.x < -20) f.x = width + 20;
      if (f.x > width + 20) f.x = -20;
    }
  }

  function drawFireflies() {
    if (fireflies.length === 0 || skyBlend >= 0.98) return;
    ctx.save();
    ctx.globalAlpha = 1 - skyBlend;
    ctx.globalCompositeOperation = "lighter";
    for (const f of fireflies) {
      const glow = 0.45 + Math.sin(f.phase * 1.3) * 0.55;
      ctx.fillStyle = `rgba(255, 230, 90, ${glow * 0.85})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 248, 160, ${glow * 0.22})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function scheduleNextThunder() {
    nextThunderAt = Date.now() + random(THUNDER_MIN_MS, THUNDER_MAX_MS);
  }

  function playThunderRumble() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const len = Math.floor(audioCtx.sampleRate * 0.5);
    const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 120;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(now);
    source.stop(now + 0.52);
  }

  function tickThunder() {
    if (!isRaining || skyBlend > 0.35) return;
    const now = Date.now();
    if (nextThunderAt === 0) scheduleNextThunder();
    if (now < nextThunderAt) return;
    scheduleNextThunder();
    thunderFlash = 0.2;
    initAudio();
    playThunderRumble();
  }

  function updateThunderFlash() {
    if (thunderFlash > 0) thunderFlash *= 0.86;
    if (thunderFlash < 0.006) thunderFlash = 0;
  }

  function drawThunderFlash() {
    if (thunderFlash <= 0) return;
    ctx.save();
    ctx.fillStyle = `rgba(215, 225, 255, ${thunderFlash})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function spawnPostRainRainbow() {
    postRainRainbows.push({
      bornAt: Date.now(),
      lifeMs: 4800,
      fadeInMs: 1000,
      fadeOutMs: 2000,
      holdAlpha: 0.72,
      alpha: 0,
    });
    initAudio();
    playPostRainRainbowSound();
  }

  function updatePostRainRainbows() {
    const now = Date.now();
    for (let i = postRainRainbows.length - 1; i >= 0; i--) {
      const r = postRainRainbows[i];
      const age = now - r.bornAt;
      if (age >= r.lifeMs) {
        postRainRainbows.splice(i, 1);
        continue;
      }
      const outStart = r.lifeMs - r.fadeOutMs;
      if (age < r.fadeInMs) {
        const t = age / r.fadeInMs;
        r.alpha = r.holdAlpha * (1 - Math.pow(1 - t, 2));
      } else if (age > outStart) {
        r.alpha = r.holdAlpha * (1 - (age - outStart) / r.fadeOutMs);
      } else {
        r.alpha = r.holdAlpha;
      }
    }
  }

  function drawPostRainRainbows() {
    if (postRainRainbows.length === 0 || skyBlend < 0.4) return;

    const baseY = height * 0.76;
    const span = width * 0.46;
    const lift = height * 0.28;
    const bandW = 4.5;
    const bandStep = 5;

    ctx.save();
    ctx.globalAlpha = skyBlend;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const r of postRainRainbows) {
      if (r.alpha <= 0.01) continue;
      for (let i = 0; i < RAINBOW_HUES.length; i++) {
        const inset = i * bandStep;
        const spanBand = Math.max(span * 0.55, span - inset * 0.82);
        const liftBand = Math.max(lift * 0.45, lift - inset * 0.5);
        const y0 = baseY + inset * 0.06;
        const cx = width * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - spanBand, y0);
        ctx.bezierCurveTo(
          cx - spanBand * 0.58,
          y0 - liftBand,
          cx + spanBand * 0.58,
          y0 - liftBand,
          cx + spanBand,
          y0
        );
        ctx.strokeStyle = `hsla(${RAINBOW_HUES[i]}, 86%, 54%, ${r.alpha * 0.88})`;
        ctx.lineWidth = bandW;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function scheduleNextSkyPattern() {
    nextSkyPatternAt = Date.now() + random(SKY_PATTERN_MIN_MS, SKY_PATTERN_MAX_MS);
  }

  function playConstellationSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const notes = [784, 988, 1175];
    for (let i = 0; i < notes.length; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = notes[i];
      const start = now + 0.9 + i * 0.14;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.028, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    }
  }

  function spawnConstellation(options = {}) {
    const cx = random(width * 0.22, width * 0.78);
    const cy = random(height * 0.1, height * 0.42);
    const spread = random(55, 95);
    const templates = [
      { dots: [[0, 0.5], [0.28, 0.32], [0.55, 0.48], [0.82, 0.28], [1, 0.42]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] },
      { dots: [[0, 0.18], [0.22, 0.52], [0.48, 0.12], [0.74, 0.48], [1, 0.2]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] },
      { dots: [[0.08, 0.48], [0.28, 0.42], [0.48, 0.28], [0.66, 0.18], [0.82, 0.38], [0.92, 0.58], [0.62, 0.62]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 2]] },
      { dots: [[0.5, 0.02], [0.08, 0.42], [0.92, 0.42], [0.22, 0.92], [0.78, 0.92]], links: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]] },
      { dots: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], links: [[0, 1], [1, 2], [2, 3], [3, 0]] },
      { dots: [[0.5, 0.05], [0.5, 0.95], [0.05, 0.5], [0.95, 0.5]], links: [[0, 1], [2, 3]] },
      { dots: [[0, 0.22], [0.33, 0.62], [0.66, 0.18], [1, 0.55]], links: [[0, 1], [1, 2], [2, 3]] },
      { dots: [[0.05, 0.35], [0.35, 0.35], [0.65, 0.35], [0.95, 0.35], [0.65, 0.72], [0.35, 0.72]], links: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 1]] },
      { dots: [[0, 0.55], [0.2, 0.15], [0.45, 0.65], [0.7, 0.1], [1, 0.5]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] },
      { dots: [[0.12, 0.1], [0.12, 0.9], [0.55, 0.35], [0.88, 0.15], [0.88, 0.85]], links: [[0, 1], [0, 2], [2, 3], [3, 4]] },
      { dots: [[0.1, 0.3], [0.45, 0.05], [0.9, 0.25], [0.55, 0.55], [0.75, 0.85], [0.2, 0.75]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
      { dots: [[0.5, 0], [0, 0.55], [1, 0.55]], links: [[0, 1], [1, 2], [2, 0]] },
    ];
    const tpl = pickRandom(templates);
    constellationEvent = {
      dots: tpl.dots.map(([rx, ry]) => ({
        x: cx + (rx - 0.5) * spread * 2,
        y: cy + ry * spread,
      })),
      links: tpl.links,
      bornAt: Date.now(),
      lifeMs: 10000,
      connectAt: 1200,
      glowAt: 3200,
      fadeAt: 7200,
      alpha: 0,
      forceVisible: !!options.forceVisible,
    };
    initAudio();
    playConstellationSound();
  }

  function updateConstellation() {
    if (!constellationEvent) return;
    const age = Date.now() - constellationEvent.bornAt;
    if (age >= constellationEvent.lifeMs) {
      constellationEvent = null;
      return;
    }
    if (age < 800) {
      constellationEvent.alpha = age / 800;
    } else if (age > constellationEvent.fadeAt) {
      constellationEvent.alpha = 1 - (age - constellationEvent.fadeAt) / (constellationEvent.lifeMs - constellationEvent.fadeAt);
    } else {
      constellationEvent.alpha = 1;
    }
  }

  function drawConstellation() {
    if (!constellationEvent) return;
    const nightMix = constellationEvent.forceVisible ? 1 : 1 - skyBlend;
    if (nightMix <= 0.02) return;
    const e = constellationEvent;
    const age = Date.now() - e.bornAt;
    ctx.save();
    ctx.globalAlpha = nightMix * e.alpha;
    ctx.globalCompositeOperation = "lighter";

    for (const d of e.dots) {
      const tw = 0.65 + Math.sin(age * 0.006 + d.x * 0.01) * 0.2;
      ctx.fillStyle = `rgba(200, 220, 255, ${tw * 0.85})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (age >= e.connectAt) {
      const lineAlpha = Math.min(1, (age - e.connectAt) / 700);
      ctx.strokeStyle = `rgba(180, 210, 255, ${lineAlpha * 0.55})`;
      ctx.lineWidth = 1.5;
      for (const [a, b] of e.links) {
        ctx.beginPath();
        ctx.moveTo(e.dots[a].x, e.dots[a].y);
        ctx.lineTo(e.dots[b].x, e.dots[b].y);
        ctx.stroke();
      }
    }

    if (age >= e.glowAt) {
      const glowA = Math.min(0.32, ((age - e.glowAt) / 900) * 0.32);
      for (const d of e.dots) {
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 22);
        g.addColorStop(0, `rgba(200, 220, 255, ${glowA})`);
        g.addColorStop(1, "rgba(200, 220, 255, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function playCloudShapeSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const len = Math.floor(audioCtx.sampleRate * 0.35);
    const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2) * 0.4;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.5;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(now);
    source.stop(now + 0.48);

    birdChirp(now + 0.2, 0.025, 900, 1400, 0.1);
    birdChirp(now + 0.38, 0.02, 1100, 1600, 0.08);
  }

  function spawnCloudShape(options = {}) {
    const cx = random(width * 0.25, width * 0.75);
    const cy = random(height * 0.14, height * 0.38);
    const spread = random(95, 135);
    const templates = [
      { puffs: [[0.38, 0.32, 0.5], [0.62, 0.32, 0.5], [0.5, 0.58, 0.68]] },
      { puffs: [[0.18, 0.42, 0.42], [0.42, 0.38, 0.52], [0.68, 0.4, 0.48], [0.86, 0.36, 0.34]] },
      { puffs: [[0.36, 0.18, 0.42], [0.64, 0.18, 0.42], [0.5, 0.5, 0.72]] },
      { puffs: [[0.22, 0.44, 0.38], [0.5, 0.34, 0.52], [0.78, 0.44, 0.38], [0.5, 0.56, 0.32]] },
      { puffs: [[0.5, 0.12, 0.42], [0.28, 0.52, 0.38], [0.72, 0.52, 0.38], [0.36, 0.72, 0.32], [0.64, 0.72, 0.32]] },
    ];
    const tpl = pickRandom(templates);
    cloudShapeEvent = {
      puffs: tpl.puffs.map(([rx, ry, sc]) => {
        const homeX = cx + (rx - 0.5) * spread * 2;
        const homeY = cy + ry * spread;
        return {
          homeX,
          homeY,
          homeScale: sc,
          startX: homeX + random(-45, 45),
          startY: homeY + random(-35, 35),
          x: homeX + random(-45, 45),
          y: homeY + random(-35, 35),
          scale: sc * random(0.45, 0.65),
          vx: random(-0.12, 0.12),
          vy: random(-0.06, 0.06),
        };
      }),
      bornAt: Date.now(),
      lifeMs: 10000,
      mergeAt: 1100,
      glowAt: 3200,
      fadeAt: 7200,
      alpha: 0,
      forceVisible: !!options.forceVisible,
    };
    initAudio();
    playCloudShapeSound();
  }

  function tickSkyPatternSpawner() {
    if (constellationEvent || cloudShapeEvent) return;
    const now = Date.now();
    if (nextSkyPatternAt === 0) scheduleNextSkyPattern();
    if (now < nextSkyPatternAt) return;
    if (isDayMode && skyBlend > 0.65) {
      scheduleNextSkyPattern();
      spawnCloudShape();
    } else if (!isDayMode && skyBlend < 0.35) {
      scheduleNextSkyPattern();
      spawnConstellation();
    }
  }

  function updateCloudShape() {
    if (!cloudShapeEvent) return;
    const now = Date.now();
    const age = now - cloudShapeEvent.bornAt;
    if (age >= cloudShapeEvent.lifeMs) {
      cloudShapeEvent = null;
      return;
    }
    if (age < 800) {
      cloudShapeEvent.alpha = age / 800;
    } else if (age > cloudShapeEvent.fadeAt) {
      cloudShapeEvent.alpha = 1 - (age - cloudShapeEvent.fadeAt) / (cloudShapeEvent.lifeMs - cloudShapeEvent.fadeAt);
    } else {
      cloudShapeEvent.alpha = 1;
    }

    const mergeT = Math.min(1, age / cloudShapeEvent.mergeAt);
    const mergeEase = 1 - Math.pow(1 - mergeT, 3);
    const drift = age > cloudShapeEvent.fadeAt;

    for (const puff of cloudShapeEvent.puffs) {
      if (drift) {
        puff.x += puff.vx;
        puff.y += puff.vy;
        puff.scale *= 0.9995;
      } else {
        puff.x = puff.startX + (puff.homeX - puff.startX) * mergeEase;
        puff.y = puff.startY + (puff.homeY - puff.startY) * mergeEase;
        puff.scale = puff.scale + (puff.homeScale - puff.scale) * mergeEase * 0.12;
        if (mergeT > 0.85) puff.scale = puff.homeScale;
      }
    }
  }

  function drawCloudShape() {
    if (!cloudShapeEvent) return;
    const dayMix = cloudShapeEvent.forceVisible ? 1 : skyBlend;
    if (dayMix <= 0.02) return;
    const e = cloudShapeEvent;
    const age = Date.now() - e.bornAt;
    ctx.save();
    ctx.globalAlpha = dayMix * e.alpha * 0.92;

    for (const puff of e.puffs) {
      drawCloudBlob(ctx, puff.x, puff.y, puff.scale);
    }

    if (age >= e.glowAt) {
      ctx.globalCompositeOperation = "lighter";
      const glowA = Math.min(0.22, ((age - e.glowAt) / 900) * 0.22) * e.alpha;
      let gx = 0;
      let gy = 0;
      for (const puff of e.puffs) {
        gx += puff.x;
        gy += puff.y;
      }
      gx /= e.puffs.length;
      gy /= e.puffs.length;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 70);
      g.addColorStop(0, `rgba(255, 255, 255, ${glowA})`);
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, 70, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCelestialPulse() {
    celestialPulsePhase += 0.014;
    const pulse = 0.82 + Math.sin(celestialPulsePhase) * 0.18;
    const { x, y } = celestialPosition();

    if (skyBlend < 0.98) {
      ctx.save();
      ctx.globalAlpha = (1 - skyBlend) * pulse * 0.4;
      ctx.globalCompositeOperation = "lighter";
      const moonGlow = ctx.createRadialGradient(x, y, 0, x, y, 95 * pulse);
      moonGlow.addColorStop(0, "rgba(255, 248, 220, 0.55)");
      moonGlow.addColorStop(0.45, "rgba(255, 248, 220, 0.12)");
      moonGlow.addColorStop(1, "rgba(255, 248, 220, 0)");
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(x, y, 95 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (skyBlend > 0.02) {
      ctx.save();
      ctx.globalAlpha = skyBlend * pulse * 0.35;
      ctx.globalCompositeOperation = "lighter";
      const sunGlow = ctx.createRadialGradient(x, y, 0, x, y, 110 * pulse);
      sunGlow.addColorStop(0, "rgba(255, 230, 80, 0.5)");
      sunGlow.addColorStop(0.4, "rgba(255, 210, 60, 0.15)");
      sunGlow.addColorStop(1, "rgba(255, 200, 50, 0)");
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(x, y, 110 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function scheduleNextShootingStar() {
    nextShootingStarAt = Date.now() + random(SHOOTING_STAR_MIN_MS, SHOOTING_STAR_MAX_MS);
  }

  function playShootingStarSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.28);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  function spawnShootingStar() {
    const fromLeft = Math.random() > 0.5;
    const speed = random(11, 16);
    shootingStars.push({
      x: fromLeft ? random(-40, width * 0.25) : random(width * 0.75, width + 40),
      y: random(height * 0.05, height * 0.32),
      vx: (fromLeft ? 1 : -1) * speed,
      vy: random(2.5, 5.5),
      bornAt: Date.now(),
      lifeMs: 900,
    });
    initAudio();
    playShootingStarSound();
  }

  function tickShootingStarSpawner() {
    if (skyBlend > 0.35) return;
    const now = Date.now();
    if (nextShootingStarAt === 0) scheduleNextShootingStar();
    if (now < nextShootingStarAt) return;
    scheduleNextShootingStar();
    spawnShootingStar();
  }

  function updateShootingStars() {
    const now = Date.now();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      if (now - s.bornAt >= s.lifeMs) {
        shootingStars.splice(i, 1);
        continue;
      }
      s.x += s.vx;
      s.y += s.vy;
    }
  }

  function drawShootingStars() {
    if (shootingStars.length === 0 || skyBlend >= 0.98) return;

    const now = Date.now();
    ctx.save();
    ctx.globalAlpha = 1 - skyBlend;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (const s of shootingStars) {
      const age = (now - s.bornAt) / s.lifeMs;
      const alpha = 1 - age;
      const tailLen = 72;
      const speed = Math.hypot(s.vx, s.vy) || 1;
      const nx = s.vx / speed;
      const ny = s.vy / speed;
      const x0 = s.x - nx * tailLen;
      const y0 = s.y - ny * tailLen;
      const grad = ctx.createLinearGradient(x0, y0, s.x, s.y);
      grad.addColorStop(0, "rgba(255, 255, 255, 0)");
      grad.addColorStop(0.55, `rgba(210, 225, 255, ${alpha * 0.35})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.95})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5 + alpha * 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function triggerIdleSparkle() {
    const margin = 90;
    const x = random(margin, Math.max(margin + 1, width - margin));
    const y = random(margin, Math.max(margin + 1, height - margin));
    if (isDayMode) {
      spawnRainbowArc(x, y, "small", { silent: true });
    } else {
      spawnBurst(x, y, "small", () => random(0, 360), 0.65);
    }
  }

  function tickIdleSparkle() {
    if (pointer.active || touchPress) return;
    if (Date.now() - lastInputAt < IDLE_SPARKLE_MS) return;
    noteInput();
    triggerIdleSparkle();
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

  function drawRainbowArc(arc, heavyLoad) {
    if (arc.radius <= 0) return;

    const scale = arc.radius / arc.targetRadius;
    const span = arc.span * scale;
    const lift = arc.lift * scale;
    const alpha = arc.alpha;
    const wob = arc.wobble * scale;
    const bend = arc.bend;
    const bandCount = heavyLoad ? 4 : RAINBOW_HUES.length;
    const bandStride = heavyLoad ? 2 : 1;
    const bandW = Math.max(3.5, (arc.radius / bandCount) * 1.15);
    const bandStep = bandW * 1.05;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let bi = 0; bi < bandCount; bi++) {
      const i = bi * bandStride;
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

    if (!heavyLoad && alpha > 0.25) {
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
    const heavyLoad = arcs.length > 10;
    for (const arc of arcs) {
      drawRainbowArc(arc, heavyLoad);
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
    const baseHue = seasonHue(random(0, 360));
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
      schedulePlanTimer(() => {
        playRainbowTrailSound(points.length);
      }, PLAN_START_DELAY);

      points.forEach((pt, i) => {
        schedulePlanTimer(() => {
          spawnRainbowArc(pt.x, pt.y, pickRandom(["small", "medium", "big"]), { silent: true });
          removeOnePlanMarker(planId);
        }, PLAN_START_DELAY + i * PLAN_STAGGER_DELAY);
      });

      schedulePlanTimer(() => {
        removePlanMarkers(planId);
      }, PLAN_START_DELAY + points.length * PLAN_STAGGER_DELAY + 50);
    } else {
      schedulePlanTimer(() => {
        playFireworkTrailSound(points.length);
      }, PLAN_START_DELAY);

      points.forEach((pt, i) => {
        schedulePlanTimer(() => {
          const size = pickRandom(["small", "medium", "big"]);
          spawnBurst(pt.x, pt.y, size, () => hue + random(-12, 12), 1, { trail: true });
          removeOnePlanMarker(planId);
        }, PLAN_START_DELAY + i * PLAN_STAGGER_DELAY);
      });

      schedulePlanTimer(() => {
        removePlanMarkers(planId);
      }, PLAN_START_DELAY + points.length * PLAN_STAGGER_DELAY + 50);
    }
  }

  function ensureGlowSprite(hue) {
    const bucket = ((Math.round(hue / 30) * 30) % 360 + 360) % 360;
    if (!glowSpriteCache) glowSpriteCache = new Map();
    if (glowSpriteCache.has(bucket)) return glowSpriteCache.get(bucket);

    const size = 160;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const gctx = c.getContext("2d");
    const cx = size / 2;
    const cy = size / 2;
    const glow = gctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    glow.addColorStop(0, `hsla(${bucket}, 95%, 70%, 0.35)`);
    glow.addColorStop(0.5, `hsla(${bucket}, 95%, 60%, 0.12)`);
    glow.addColorStop(1, `hsla(${bucket}, 95%, 50%, 0)`);
    gctx.fillStyle = glow;
    gctx.fillRect(0, 0, size, size);
    glowSpriteCache.set(bucket, c);
    return c;
  }

  function drawGlow(x, y, hue) {
    const sprite = ensureGlowSprite(hue);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(sprite, x - 80, y - 80);
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

    const fillBuckets = new Map();
    const ringBuckets = new Map();
    const trailsByPlan = new Map();

    for (const m of planMarkers) {
      const pulse = 0.46 + Math.sin(m.pulse) * 0.22;
      const pulseQ = Math.round(pulse / MARKER_PULSE_STEP) * MARKER_PULSE_STEP;
      const r = 5 + Math.sin(m.pulse * 0.7) * 1.6;
      const fillKey = `${m.hue}|${pulseQ}`;

      let fillBucket = fillBuckets.get(fillKey);
      if (!fillBucket) {
        fillBucket = { hue: m.hue, pulseQ, dots: [] };
        fillBuckets.set(fillKey, fillBucket);
      }
      fillBucket.dots.push({ x: m.x, y: m.y, r });

      let ringBucket = ringBuckets.get(fillKey);
      if (!ringBucket) {
        ringBucket = { hue: m.hue, pulseQ, dots: [] };
        ringBuckets.set(fillKey, ringBucket);
      }
      ringBucket.dots.push({ x: m.x, y: m.y, r });

      let trail = trailsByPlan.get(m.planId);
      if (!trail) {
        trail = [];
        trailsByPlan.set(m.planId, trail);
      }
      trail.push(m);
    }

    for (const { hue, pulseQ, dots } of fillBuckets.values()) {
      ctx.fillStyle = `hsla(${hue}, 85%, 76%, ${pulseQ})`;
      ctx.beginPath();
      for (const d of dots) {
        ctx.moveTo(d.x + d.r, d.y);
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    ctx.lineWidth = 2;
    for (const { hue, pulseQ, dots } of ringBuckets.values()) {
      ctx.strokeStyle = `hsla(${hue}, 90%, 86%, ${pulseQ * 0.45})`;
      ctx.beginPath();
      for (const d of dots) {
        ctx.moveTo(d.x + d.r + 4, d.y);
        ctx.arc(d.x, d.y, d.r + 4, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    for (const trail of trailsByPlan.values()) {
      if (trail.length < 2) continue;
      if (isDayMode) {
        const last = trail[trail.length - 1];
        const grad = ctx.createLinearGradient(trail[0].x, trail[0].y, last.x, last.y);
        for (let i = 0; i < trail.length; i++) {
          grad.addColorStop(i / (trail.length - 1), `hsla(${trail[i].hue}, 75%, 65%, 0.35)`);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.stroke();
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
        const last = particles.length - 1;
        if (i < last) particles[i] = particles[last];
        particles.pop();
      }
    }
  }

  function quantizeAlpha(alpha) {
    return Math.max(0.2, Math.round(alpha / PARTICLE_ALPHA_STEP) * PARTICLE_ALPHA_STEP);
  }

  function quantizeHue(hue) {
    return ((Math.round(hue / PARTICLE_HUE_STEP) * PARTICLE_HUE_STEP) % 360 + 360) % 360;
  }

  function addParticleToBucket(buckets, key, p) {
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(p);
  }

  function fillParticleBucket(buckets, fillStyleForKey) {
    for (const [key, items] of buckets) {
      if (items.length === 0) continue;
      ctx.fillStyle = fillStyleForKey(key);
      ctx.beginPath();
      for (const p of items) {
        const s = p.size * p.alpha * 2;
        const half = s * 0.5;
        ctx.rect(p.x - half, p.y - half, s, s);
      }
      ctx.fill();
    }
  }

  function drawParticles() {
    if (particles.length === 0) return;

    const mainBuckets = new Map();
    const ringBuckets = new Map();
    const sparkleTintBuckets = new Map();
    const sparkleWhiteBuckets = new Map();

    for (const p of particles) {
      if (p.alpha <= 0.01) continue;
      const a = quantizeAlpha(p.alpha);
      const h = quantizeHue(p.hue);

      if (p.type === "sparkle") {
        if (p.sparkleTint) {
          addParticleToBucket(sparkleTintBuckets, `t|${h}|${a}`, p);
        } else {
          addParticleToBucket(sparkleWhiteBuckets, `w|${a}`, p);
        }
      } else if (p.type === "ring") {
        addParticleToBucket(ringBuckets, `r|${h}|${a}`, p);
      } else {
        addParticleToBucket(mainBuckets, `m|${h}|${a}`, p);
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    fillParticleBucket(mainBuckets, (key) => {
      const parts = key.split("|");
      return `hsla(${parts[1]}, 95%, 62%, ${parts[2]})`;
    });
    fillParticleBucket(ringBuckets, (key) => {
      const parts = key.split("|");
      return `hsla(${parts[1]}, 98%, 68%, ${parts[2]})`;
    });
    fillParticleBucket(sparkleTintBuckets, (key) => {
      const parts = key.split("|");
      return `hsla(${parts[1]}, 80%, 85%, ${parts[2]})`;
    });
    fillParticleBucket(sparkleWhiteBuckets, (key) => {
      const parts = key.split("|");
      return `rgba(255, 255, 240, ${Number(parts[1]) * 0.95})`;
    });

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
    if (rainNoise) return;
    if (!ensureAudioReady()) return;

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
    resetPointer();
    isRaining = !isRaining;
    if (rainBtn) rainBtn.classList.toggle("active", isRaining);
    updateCustomCursor();
    if (isRaining) {
      rainStartedAt = Date.now();
      initRaindrops();
      startRainSound();
    } else {
      const hadRain = rainStartedAt > 0 && Date.now() - rainStartedAt >= POST_RAIN_MIN_MS;
      raindrops = [];
      stopRainSound();
      if (hadRain && isDayMode) spawnPostRainRainbow();
      rainStartedAt = 0;
    }
  }

  function drawFrame() {
    updateSkyBlend();
    drawSky();
    drawCelestialPulse();
    updateClouds();
    drawClouds();
    updateStars();
    drawStars();
    updateFireflies();
    drawFireflies();
    tickShootingStarSpawner();
    updateShootingStars();
    drawShootingStars();
    tickSkyPatternSpawner();
    updateConstellation();
    drawConstellation();
    updateCloudShape();
    drawCloudShape();
    tickAmbientSpawner();
    updateAmbient();
    drawAmbient();
    tickIdleSparkle();
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
    updatePostRainRainbows();
    drawPostRainRainbows();
    if (particles.length > 0) {
      drawParticles();
    }
    tickThunder();
    updateThunderFlash();
    updateRain();
    drawRain();
    drawThunderFlash();
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
    const x = ((clientX - rect.left) / rect.width) * width;
    const y = ((clientY - rect.top) / rect.height) * height;
    return {
      x: Math.max(0, Math.min(width, x)),
      y: Math.max(0, Math.min(height, y)),
    };
  }

  function resetPointer() {
    pointer.active = false;
    pointer.dragging = false;
    pointer.button = null;
    pointer.planPoints = [];
  }

  function releasePointer(clientX, clientY) {
    if (!pointer.active) return;
    const x = clientX ?? pointer.lastClientX;
    const y = clientY ?? pointer.lastClientY;
    finishPointer(x, y);
  }

  function clearTouchPress() {
    if (touchPress?.timer) clearTimeout(touchPress.timer);
    touchPress = null;
  }

  function triggerWowEffect(x, y) {
    initAudio();
    navigator.vibrate?.(30);
    if (isDayMode) {
      spawnRainbowArc(x, y, "wow");
    } else {
      burstRainbowRing(x, y);
    }
  }

  function beginPointer(clientX, clientY, button) {
    noteInput();
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
    pointer.lastClientX = clientX;
    pointer.lastClientY = clientY;

    if (button === 2) {
      triggerWowEffect(x, y);
      pointer.active = false;
    }
  }

  function movePointer(clientX, clientY) {
    if (!pointer.active || pointer.button !== 0) return;

    pointer.lastClientX = clientX;
    pointer.lastClientY = clientY;
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

    try {
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
    } finally {
      resetPointer();
    }
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
    resetPointer();
    isDayMode = !isDayMode;
    skyBlendTarget = isDayMode ? 1 : 0;
    ambientCreatures = [];
    constellationEvent = null;
    cloudShapeEvent = null;
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

  window.addEventListener("mousemove", (e) => {
    if (pointer.active && pointer.dragging && e.buttons & 1) {
      movePointer(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener("mouseup", (e) => {
    if (pointer.active && (e.button === 0 || e.button === pointer.button)) {
      finishPointer(e.clientX, e.clientY);
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (pointer.active && (e.button === 0 || e.button === pointer.button)) {
      releasePointer(e.clientX, e.clientY);
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
    ensureAudioReady();
  }

  function birdChirp(at, vol, startFreq, endFreq, duration, session) {
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
    if (session) {
      trackSessionSound(session, osc);
      trackSessionSound(session, gain);
    }
  }



  function playFireworkTrailSound(pointCount) {
    runAudioSafe(() => {
    if (!audioCtx) return;
    ensureSharedNoiseBuffers();

    const step = PLAN_STAGGER_DELAY / 1000;
    const duration = Math.max(0, (pointCount - 1) * step) + 0.45;
    const session = beginTrailSoundSession(duration);
    const mix = trailSoundMixScale();
    const hits = trailSoundHitCount(pointCount);
    const fullSync = hits >= pointCount;
    const usePad = trailSoundSessions.length <= 4;

    const now = audioCtx.currentTime;
    const start = now;
    const sizzleEntry = sharedNoiseBuffers.sizzleShort;

    scheduleTrailSessionEnd(session, duration);

    if (usePad) {
      const pad = audioCtx.createOscillator();
      const padGain = audioCtx.createGain();
      const padFilter = audioCtx.createBiquadFilter();
      pad.type = "sine";
      pad.frequency.value = 52;
      padFilter.type = "lowpass";
      padFilter.frequency.value = 140;
      padGain.gain.setValueAtTime(0, start);
      padGain.gain.linearRampToValueAtTime(0.03 * mix, start + 0.05);
      padGain.gain.setValueAtTime(0.02 * mix, start + duration * 0.8);
      padGain.gain.exponentialRampToValueAtTime(0.001, start + duration + 0.25);
      pad.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(audioCtx.destination);
      pad.start(start);
      pad.stop(start + duration + 0.3);
      trackSessionSound(session, pad);
      trackSessionSound(session, padGain);
    }

    for (let hi = 0; hi < hits; hi++) {
      const pointIndex = fullSync ? hi : (hits <= 1 ? 0 : Math.round(hi * (pointCount - 1) / (hits - 1)));
      const t = start + pointIndex * step;
      const vol = random(0.055, 0.095) * mix;
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
      trackSessionSound(session, boom);
      trackSessionSound(session, boomGain);

      if (sizzleEntry) {
        const sizzle = audioCtx.createBufferSource();
        sizzle.buffer = sizzleEntry.buffer;
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
        trackSessionSound(session, sizzle);
        trackSessionSound(session, sGain);
      }
    }
    });
  }

  function playRainbowTrailSound(pointCount) {
    runAudioSafe(() => {
    if (!audioCtx) return;
    ensureSharedNoiseBuffers();

    const step = PLAN_STAGGER_DELAY / 1000;
    const duration = Math.max(0, (pointCount - 1) * step) + 0.55;
    const session = beginTrailSoundSession(duration);
    const mix = trailSoundMixScale();
    const hits = trailSoundHitCount(pointCount);
    const fullSync = hits >= pointCount;
    const usePad = trailSoundSessions.length <= 4;
    const useChirps = trailSoundSessions.length <= 6;

    const now = audioCtx.currentTime;
    const start = now;
    const notes = [523, 587, 659, 698, 784, 880, 988, 784];

    scheduleTrailSessionEnd(session, duration);

    if (usePad) {
      const pad = audioCtx.createOscillator();
      const padGain = audioCtx.createGain();
      const padFilter = audioCtx.createBiquadFilter();
      pad.type = "triangle";
      pad.frequency.value = 440;
      padFilter.type = "lowpass";
      padFilter.frequency.value = 1200;
      padGain.gain.setValueAtTime(0, start);
      padGain.gain.linearRampToValueAtTime(0.022 * mix, start + 0.06);
      padGain.gain.setValueAtTime(0.016 * mix, start + duration * 0.85);
      padGain.gain.exponentialRampToValueAtTime(0.001, start + duration + 0.3);
      pad.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(audioCtx.destination);
      pad.start(start);
      pad.stop(start + duration + 0.35);
      trackSessionSound(session, pad);
      trackSessionSound(session, padGain);
    }

    for (let hi = 0; hi < hits; hi++) {
      const pointIndex = fullSync ? hi : (hits <= 1 ? 0 : Math.round(hi * (pointCount - 1) / (hits - 1)));
      const t = start + pointIndex * step;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.value = notes[pointIndex % notes.length];
      filter.type = "lowpass";
      filter.frequency.value = 2200;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.055 * mix, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
      trackSessionSound(session, osc);
      trackSessionSound(session, gain);

      if (useChirps && hi % 2 === 0) {
        birdChirp(t + 0.04, 0.035 * mix, random(1800, 2400), random(2800, 3600), 0.06, session);
      }
    }
    });
  }

  function playPostRainRainbowSound() {
    runAudioSafe(() => {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const volume = 0.072;
    const duration = 3.9;

    const pad = audioCtx.createOscillator();
    const padGain = audioCtx.createGain();
    const padFilter = audioCtx.createBiquadFilter();
    pad.type = "sine";
    pad.frequency.value = 392;
    padFilter.type = "lowpass";
    padFilter.frequency.value = 900;
    padGain.gain.setValueAtTime(0, now);
    padGain.gain.linearRampToValueAtTime(volume * 0.32, now + 0.45);
    padGain.gain.setValueAtTime(volume * 0.26, now + duration * 0.55);
    padGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(audioCtx.destination);
    pad.start(now);
    pad.stop(now + duration + 0.1);

    const notes = [523, 659, 784, 988, 1175, 1319];
    for (let i = 0; i < notes.length; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.value = notes[i];
      filter.type = "lowpass";
      filter.frequency.value = 2200;
      const start = now + 0.12 + i * 0.2;
      const noteDur = 0.85;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * 0.15, start + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, start + noteDur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + noteDur + 0.05);
    }

    for (let i = 0; i < 4; i++) {
      birdChirp(
        now + 0.55 + i * 0.58,
        volume * random(0.32, 0.5),
        random(1800, 2400),
        random(2800, 3800),
        random(0.07, 0.12)
      );
    }
    });
  }

  function playRainbowSound(sizeKey, options = {}) {
    runAudioSafe(() => {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const big = sizeKey === "big" || sizeKey === "wow";
    const rv = SOUND_VARIANTS.rainbow[pickSoundVariant()];
    const volume = (big ? 0.11 : sizeKey === "small" ? 0.065 : 0.085) * (sizeKey === "wow" ? 1.1 : 1) * rv.volMult;
    const shimmerNotes = (big ? [523, 659, 784, 988, 1175] : [523, 659, 784]).map((n) =>
      pitchShiftFreq(n, rv.pitchShift)
    );

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
    });
  }

  function playPopSound(size, mode = "normal") {
    runAudioSafe(() => {
    if (!audioCtx) return;

    const wallNow = Date.now();
    if (wallNow - popWindowStart > 1000) {
      popWindowStart = wallNow;
      popSoundsInWindow = 0;
    }
    popSoundsInWindow++;
    if (popSoundsInWindow > 28) return;
    if (wallNow - lastPopSoundAt < MIN_POP_SOUND_MS && popSoundsInWindow > 12) return;
    lastPopSoundAt = wallNow;
    ensureSharedNoiseBuffers();

    const now = audioCtx.currentTime;
    const bright = mode === "bright";
    const pv = SOUND_VARIANTS.pop[pickSoundVariant()];
    let volume = (bright ? 0.27 : size === "big" ? 0.2 : size === "medium" ? 0.15 : 0.11) * pv.volMult;
    const boomDur = size === "big" ? 0.28 : size === "medium" ? 0.22 : 0.16;
    const sizzleDur = size === "big" ? 0.55 : size === "medium" ? 0.42 : 0.3;
    const boomStart = (bright ? 130 : size === "big" ? 95 : 110) * pv.pitchMult * pv.boomMult;
    const boomEnd = (bright ? 55 : 38) * pv.pitchMult;

    function noiseBurst(at, vol, durationSec, filterType, freq, q) {
      const entry = pickNoiseBuffer(durationSec);
      if (!entry) return;

      const source = audioCtx.createBufferSource();
      source.buffer = entry.buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = freq;
      if (q != null) filter.Q.value = q;
      const gain = audioCtx.createGain();
      const playDur = Math.min(durationSec, entry.dur);
      gain.gain.setValueAtTime(vol, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + playDur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(at);
      source.stop(at + playDur + 0.02);
    }

    const boom = audioCtx.createOscillator();
    const boomGain = audioCtx.createGain();
    const boomFilter = audioCtx.createBiquadFilter();
    boom.type = "sine";
    boom.frequency.setValueAtTime(boomStart, now);
    boom.frequency.exponentialRampToValueAtTime(boomEnd, now + boomDur);
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
    });
  }


  if (rainBtn) {
    rainBtn.addEventListener("pointerdown", (e) => { e.stopPropagation(); resetPointer(); });
    rainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      resetPointer();
      noteInput();
      toggleRain();
    });
  }

  if (constellationBtn) {
    constellationBtn.addEventListener("mousedown", (e) => { e.stopPropagation(); resetPointer(); });
    constellationBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      noteInput();
      resetPointer();
      if (isDayMode) spawnCloudShape({ forceVisible: true });
      else spawnConstellation({ forceVisible: true });
    });
  }

  if (daynightBtn) {
    daynightBtn.addEventListener("mousedown", (e) => { e.stopPropagation(); resetPointer(); });
    daynightBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      noteInput();
      resetPointer();
      toggleDayNight();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("mousedown", (e) => { e.stopPropagation(); resetPointer(); });
    fullscreenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      noteInput();
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
  noteInput();
  resize();
  scheduleNextAmbientSpawn();
  scheduleNextShootingStar();
  scheduleNextThunder();
  scheduleNextSkyPattern();
  loop();
})();
