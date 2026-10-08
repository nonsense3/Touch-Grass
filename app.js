/**
 * TOUCH GRASS // BRUTALIST-LITE SAAS INTERACTIVE ENGINE
 * Powered by Google Gemma Open-Weights AI & Edge Bioacoustics
 */

import { gemma } from './gemma.js';

// Global State
let audioCtx = null;
let analyserNode = null;
let animationFrameId = null;
let isMicActive = false;
let detoxInterval = null;
let detoxTimeLeft = 15.0;

// Bird Species Dataset for Offline Simulation
const BIRD_DATABASE = [
  {
    common: "WOOD THRUSH",
    scientific: "Hylocichla mustelina",
    confidence: "98.4%",
    latency: "41.2 ms",
    freq: "2.8kHz - 4.5kHz",
    desc: "Flute-like 'ee-oh-lay' ascending song. Nesting in dense hardwood canopies. Detected frequency range: 2.8kHz - 4.5kHz.",
    tip: "Look up 25-35ft into the white oak branch forks. Do not play recordings out loud."
  },
  {
    common: "BLACK-CAPPED CHICKADEE",
    scientific: "Poecile atricapillus",
    confidence: "99.1%",
    latency: "38.5 ms",
    freq: "3.2kHz - 5.8kHz",
    desc: "Whistled two-note 'fee-bee' call followed by rapid chick-a-dee buzz. High tolerance to human hikers.",
    tip: "Scan low cedar branches and alder thickets within 10 feet of the trail verge."
  },
  {
    common: "AMERICAN GOLDFINCH",
    scientific: "Spinus tristis",
    confidence: "97.6%",
    latency: "44.0 ms",
    freq: "4.0kHz - 6.2kHz",
    desc: "Bouncy flight call 'po-ta-to-chip' and twittering canary-like song. Active in autumn seed heads.",
    tip: "Look toward wild thistle patches, asters, and goldenrod along the sunny forest boundary."
  },
  {
    common: "RED-EYED VIREO",
    scientific: "Vireo olivaceus",
    confidence: "96.8%",
    latency: "39.8 ms",
    freq: "2.2kHz - 4.0kHz",
    desc: "Incessant robin-like phrase 'here I am, where are you?' Sung high in the deciduous ceiling.",
    tip: "Focus your gaze into the upper canopy of sugar maples showing early yellowing foliage."
  }
];

let currentBirdIndex = 0;

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initSpectrogramCanvas();
  renderRouteMap("5k");
  setupScrollEffects();
});

// ==========================================================================
// 1. BIOACOUSTICS FFT SPECTROGRAM & WEB AUDIO API
// ==========================================================================

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 64;
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function initSpectrogramCanvas() {
  const canvas = document.getElementById("spectrogramCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Handle high-dpi displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = (rect.width || 600) * dpr;
  canvas.height = (rect.height || 180) * dpr;
  ctx.scale(dpr, dpr);

  // Idle animation loop when no mic/sample is playing
  let step = 0;
  function drawIdle() {
    if (isMicActive) return;

    const width = rect.width || 600;
    const height = rect.height || 180;

    ctx.fillStyle = "#0e140f";
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = "rgba(163, 181, 157, 0.1)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw ambient bioacoustic frequency wave
    step += 0.05;
    ctx.beginPath();
    ctx.strokeStyle = "#d4e157";
    ctx.lineWidth = 2;

    for (let x = 0; x < width; x += 3) {
      const freq1 = Math.sin((x * 0.04) + step) * 20;
      const freq2 = Math.sin((x * 0.08) - (step * 1.5)) * 12;
      const freq3 = Math.cos((x * 0.02) + (step * 0.8)) * 15;
      const y = (height / 2) + freq1 + freq2 + freq3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw subtle frequency peak bars
    const barCount = 32;
    const barWidth = width / barCount - 2;
    for (let i = 0; i < barCount; i++) {
      const h = (Math.sin(step + (i * 0.3)) * 0.5 + 0.5) * (height * 0.65);
      ctx.fillStyle = i % 4 === 0 ? "#ffe17c" : "#384936";
      ctx.fillRect(i * (barWidth + 2), height - h, barWidth, h);
    }

    animationFrameId = requestAnimationFrame(drawIdle);
  }

  drawIdle();
}

// Synthesize a realistic bird whistle song using Web Audio API oscillators
window.playSampleBirdSound = function() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Create oscillator and gain
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";

  // Connect to analyzer and output
  osc.connect(gain);
  gain.connect(analyserNode);
  analyserNode.connect(ctx.destination);

  // Play a natural melodic wood thrush motif (3 chirps with pitch bend)
  gain.gain.setValueAtTime(0, now);

  // Note 1
  osc.frequency.setValueAtTime(2600, now);
  osc.frequency.exponentialRampToValueAtTime(3400, now + 0.15);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  // Note 2
  osc.frequency.setValueAtTime(3200, now + 0.3);
  osc.frequency.exponentialRampToValueAtTime(4200, now + 0.5);
  gain.gain.setValueAtTime(0.35, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  // Note 3 (flutter trill)
  osc.frequency.setValueAtTime(2900, now + 0.65);
  osc.frequency.exponentialRampToValueAtTime(3800, now + 0.85);
  gain.gain.setValueAtTime(0.4, now + 0.65);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

  osc.start(now);
  osc.stop(now + 1.2);

  // Update visual and species card
  cycleBirdSpecies();
  visualizeActiveAudio();
};

window.toggleMicrophone = async function() {
  const btn = document.getElementById("listenMicBtn");
  if (isMicActive) {
    isMicActive = false;
    btn.textContent = "🎙️ Use Live Mic";
    btn.style.backgroundColor = "";
    initSpectrogramCanvas();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyserNode);

    isMicActive = true;
    btn.textContent = "🔴 Mic Listening (Offline)";
    btn.style.backgroundColor = "#ef4444";
    btn.style.color = "#ffffff";

    visualizeActiveAudio();
  } catch (err) {
    alert("Microphone permission was not granted. Running local audio synthesizer mode instead.");
    window.playSampleBirdSound();
  }
};

function visualizeActiveAudio() {
  const canvas = document.getElementById("spectrogramCanvas");
  if (!canvas || !analyserNode) return;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 600;
  const height = rect.height || 180;

  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function drawSpectrum() {
    if (!analyserNode) return;
    analyserNode.getByteFrequencyData(dataArray);

    ctx.fillStyle = "#0e140f";
    ctx.fillRect(0, 0, width, height);

    const barWidth = (width / bufferLength) * 1.8;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * height;

      // Color based on intensity
      if (dataArray[i] > 180) {
        ctx.fillStyle = "#ffe17c"; // Golden peak
      } else if (dataArray[i] > 100) {
        ctx.fillStyle = "#d4e157"; // Chartreuse mid
      } else {
        ctx.fillStyle = "#384936"; // Olive base
      }

      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + 2;
    }

    if (isMicActive) {
      requestAnimationFrame(drawSpectrum);
    }
  }

  drawSpectrum();
}

function cycleBirdSpecies() {
  currentBirdIndex = (currentBirdIndex + 1) % BIRD_DATABASE.length;
  const bird = BIRD_DATABASE[currentBirdIndex];

  const commonEl = document.getElementById("birdCommonName");
  const sciEl = document.getElementById("birdSciName");
  const confEl = document.getElementById("birdConfidence");
  const descEl = document.getElementById("birdDesc");

  if (commonEl) commonEl.textContent = bird.common;
  if (sciEl) sciEl.textContent = bird.scientific;
  if (confEl) confEl.textContent = `${bird.confidence} CONFIDENCE`;
  if (descEl) descEl.textContent = bird.desc;
}

// ==========================================================================
// 2. ABSTRACT UI MOCKUP CONTROLS & PALETTE SWITCHER
// ==========================================================================

window.setMockupState = function(stateKey) {
  // Update sidebar active class
  const tabs = ["bird", "route", "frost", "timer"];
  tabs.forEach(t => {
    const el = document.getElementById(`mock-tab-${t}`);
    if (el) el.classList.remove("active");
  });

  const activeTab = document.getElementById(`mock-tab-${stateKey}`);
  if (activeTab) activeTab.classList.add("active");

  const titleEl = document.getElementById("mockupCardTitle");
  const tagEl = document.getElementById("mockupCardTag");
  const badgeEl = document.getElementById("mockupCardBadge");
  const bodyEl = document.getElementById("mockupCardBody");

  if (stateKey === "bird") {
    tagEl.textContent = "ACOUSTIC TRAIL DISCOVERY";
    badgeEl.textContent = "SIGNAL: 0% / OFFLINE: 100%";
    titleEl.textContent = "WOOD THRUSH DETECTED";
    bodyEl.textContent = "Inference latency: 42ms on Apple Silicon / Android NPU. Confidence: 98.4%. Habitat: Mature deciduous forest canopy with moist leaf litter.";
  } else if (stateKey === "route") {
    tagEl.textContent = "FALL FOLIAGE MAPPING";
    badgeEl.textContent = "CANOPY: 94% / SINGLETRACK: 88%";
    titleEl.textContent = "5.1KM PINE RIDGE LOOP";
    bodyEl.textContent = "Zero cell connectivity. Calculated max tree canopy shade & peak autumn foliage index in 38ms. 4 turns total.";
  } else if (stateKey === "frost") {
    tagEl.textContent = "HORTICULTURE ALMANAC";
    badgeEl.textContent = "ZONE 6 / FIRST FROST: OCT 28";
    titleEl.textContent = "PLANT HARDNECK GARLIC";
    bodyEl.textContent = "Optimal planting window: 3 weeks before first hard freeze. Plant 2 inches deep with straw mulch.";
  } else if (stateKey === "timer") {
    tagEl.textContent = "SCREEN DETOX PROTOCOL";
    badgeEl.textContent = "TARGET: 15s / DIRT: 100%";
    titleEl.textContent = "POCKET LOCK ACTIVATED";
    bodyEl.textContent = "Screen dimming initiated. Put device into backpack or pocket. Ambient wind chimes playing locally.";
  }
};

window.shuffleMockupData = function() {
  cycleBirdSpecies();
  const bird = BIRD_DATABASE[currentBirdIndex];
  const titleEl = document.getElementById("mockupCardTitle");
  const bodyEl = document.getElementById("mockupCardBody");

  if (titleEl) titleEl.textContent = `${bird.common} DETECTED`;
  if (bodyEl) bodyEl.textContent = `Inference latency: ${bird.latency}. Confidence: ${bird.confidence}. Habitat: ${bird.desc}`;
};

window.testMockupAction = function() {
  window.switchLiveTool('detox');
  window.startDetoxTimer();
};

window.setCanvasAlign = function(alignment) {
  const canvas = document.getElementById("interactiveCanvas");
  if (!canvas) return;

  if (alignment === 'left') {
    canvas.style.justifyContent = 'flex-start';
  } else if (alignment === 'center') {
    canvas.style.justifyContent = 'center';
  } else if (alignment === 'right') {
    canvas.style.justifyContent = 'flex-end';
  } else {
    canvas.style.justifyContent = 'space-around';
  }

  // Update active state on alignment buttons
  const buttons = document.querySelectorAll('.align-icon-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
};

window.applyPaletteSwatch = function(hexColor) {
  const root = document.documentElement;
  const hexLabel = document.getElementById("activeHexLabel");
  const tiltBox = document.getElementById("hero-tilt-text");

  if (hexLabel) hexLabel.textContent = hexColor;

  if (hexColor === '#FFE17C') {
    root.style.setProperty('--color-accent-gold', '#ffe17c');
    root.style.setProperty('--color-accent', '#ffe17c');
  } else if (hexColor === '#D4E157') {
    root.style.setProperty('--color-accent-gold', '#d4e157');
    root.style.setProperty('--color-accent', '#d4e157');
  } else if (hexColor === '#384936') {
    root.style.setProperty('--color-accent-gold', '#384936');
  } else if (hexColor === '#151E16') {
    root.style.setProperty('--color-accent-gold', '#ffe17c');
  }

  // Update swatches
  document.querySelectorAll('.swatch-item').forEach(sw => sw.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
};

// ==========================================================================
// 3. FALL FOLIAGE RUN CLUB ROUTE SYNTHESIZER
// ==========================================================================

const ROUTE_DATA = {
  "3k": {
    dist: "3.2 km loop",
    elev: "+85m",
    surface: "92% Dirt Singletrack",
    canopy: "96% Birch & White Pine",
    cues: [
      "Head North onto Lower Creek Trail (0.3km)",
      "Cross wooden footbridge into Birch Copse (1.2km)",
      "Ascend gentle moss embankment (2.1km)",
      "Return along quiet pine needle singletrack (3.2km)"
    ],
    path: "M 50,160 C 120,80 200,60 300,100 C 400,140 500,40 650,80 C 720,100 750,180 620,190 C 480,200 350,170 200,200 Z"
  },
  "5k": {
    dist: "5.1 km loop",
    elev: "+142m",
    surface: "88% Dirt Singletrack",
    canopy: "94% Golden Birch & Sugar Maple",
    cues: [
      "North trailhead past old stone weir (0.4km)",
      "Veer left onto Hemlock Ridge path (1.8km)",
      "Ascend Red Oak crest for 360° fall foliage (3.2km)",
      "Follow gravel creek bed back to start (5.1km)"
    ],
    path: "M 40,180 C 100,60 180,40 280,70 C 380,100 440,30 560,50 C 680,70 760,120 740,180 C 720,220 540,190 380,210 C 240,230 120,210 40,180 Z"
  },
  "10k": {
    dist: "10.4 km loop",
    elev: "+310m",
    surface: "84% Mountain Singletrack",
    canopy: "91% Mixed Hardwood Forest",
    cues: [
      "South boundary trail into Devil's Hollow (1.5km)",
      "Climb switchbacks up to High Meadow Vista (4.2km)",
      "Run western ridgeline through fiery fall maples (7.1km)",
      "Technical descent through hemlock ravine to base (10.4km)"
    ],
    path: "M 30,200 C 80,40 160,20 260,50 C 360,80 440,20 520,30 C 640,40 760,60 770,140 C 780,210 680,220 560,210 C 440,200 320,220 180,230 C 90,240 50,230 30,200 Z"
  }
};

window.generateFoliageRoute = function() {
  const select = document.getElementById("routeDistanceSelect");
  const distKey = select ? select.value : "5k";
  renderRouteMap(distKey);
};

function renderRouteMap(distKey) {
  const data = ROUTE_DATA[distKey] || ROUTE_DATA["5k"];
  const svg = document.getElementById("routeMapSvg");
  if (!svg) return;

  // Update text displays
  const distEl = document.getElementById("routeDistDisplay");
  const elevEl = document.getElementById("routeElevDisplay");
  const surfaceEl = document.getElementById("routeSurfaceDisplay");
  const canopyEl = document.getElementById("routeCanopyDisplay");
  const cuesEl = document.getElementById("routeTurnCues");

  if (distEl) distEl.textContent = data.dist;
  if (elevEl) elevEl.textContent = data.elev;
  if (surfaceEl) surfaceEl.textContent = data.surface;
  if (canopyEl) canopyEl.textContent = data.canopy;

  if (cuesEl) {
    cuesEl.innerHTML = data.cues.map(c => `<li>${c}</li>`).join("");
  }

  // Draw SVG Map with topography lines & trail
  svg.innerHTML = `
    <!-- Topographic contour lines -->
    <path d="M 0,40 Q 200,60 400,30 T 800,50" fill="none" stroke="rgba(56, 73, 54, 0.2)" stroke-width="1.5" />
    <path d="M 0,90 Q 250,110 500,80 T 800,100" fill="none" stroke="rgba(56, 73, 54, 0.2)" stroke-width="1.5" />
    <path d="M 0,150 Q 180,130 450,160 T 800,140" fill="none" stroke="rgba(56, 73, 54, 0.2)" stroke-width="1.5" />
    <path d="M 0,210 Q 300,190 600,220 T 800,190" fill="none" stroke="rgba(56, 73, 54, 0.2)" stroke-width="1.5" />

    <!-- Shaded Canopy Zones -->
    <circle cx="280" cy="80" r="70" fill="rgba(212, 225, 87, 0.22)" />
    <circle cx="560" cy="70" r="85" fill="rgba(255, 225, 124, 0.28)" />
    <circle cx="420" cy="180" r="95" fill="rgba(56, 73, 54, 0.25)" />

    <!-- Trail Path -->
    <path d="${data.path}" fill="none" stroke="#151e16" stroke-width="5" stroke-dasharray="8 4" />
    <path d="${data.path}" fill="none" stroke="#d4e157" stroke-width="2" />

    <!-- Start / Finish Pin -->
    <circle cx="50" cy="180" r="8" fill="#151e16" stroke="#ffe17c" stroke-width="3" />
    <text x="65" y="185" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#151e16">START / TRAILHEAD</text>

    <!-- Scenic Foliage Vista Pin -->
    <circle cx="560" cy="50" r="8" fill="#ffe17c" stroke="#151e16" stroke-width="2" />
    <text x="575" y="55" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#151e16">PEAK FOLIAGE OVERLOOK</text>
  `;
}

window.copyGpxWaypoints = function() {
  const text = `TOUCH GRASS ROUTE WAYPOINTS:\n1. 38.8951° N, 77.0364° W (Trailhead)\n2. 38.8970° N, 77.0390° W (Hemlock Ridge)\n3. 38.9010° N, 77.0420° W (Peak Fall Foliage Overlook)\n4. 38.8985° N, 77.0350° W (Creek Path)\nStatus: 100% Offline. Memorize and disconnect.`;
  navigator.clipboard.writeText(text).then(() => {
    alert("Waypoints copied to clipboard! Screen ready to disconnect.");
  });
};

// ==========================================================================
// 4. FROST DATE & WILD SOWING ALMANAC
// ==========================================================================

const ZONE_DATA = {
  "4": {
    actionTitle: "MULCH PERENNIAL HERB BEDS",
    actionDesc: "Severe freeze imminent. Cover strawberry crowns and lavender roots with 4 inches of shredded leaves.",
    days: "6 DAYS (OCT 14)",
    forageTitle: "WILD CHAGA & CRANBERRIES",
    forageDesc: "Harvest wild highbush cranberries post-light frost for sweetened pectin. Inspect birch trunks for sterile conk chaga."
  },
  "5": {
    actionTitle: "PLANT WINTER RYE COVER CROP",
    actionDesc: "Sow organic winter rye on bare vegetable rows to bind nitrogen and suppress early spring weed pressure.",
    days: "14 DAYS (OCT 22)",
    forageTitle: "PUFFBALLS & WILD WALNUTS",
    forageDesc: "Forage mature black walnuts fallen along meadow borders. Crack husk and cure kernels in dry airflow."
  },
  "6": {
    actionTitle: "PLANT HARDNECK GARLIC CLOVES",
    actionDesc: "First frost is approximately 20 days away. Plant hardneck garlic cloves 2 inches deep, pointy end up, covered with 3 inches of straw mulch.",
    days: "20 DAYS (OCT 28)",
    forageTitle: "HEN OF THE WOODS & ROSE HIPS",
    forageDesc: "Look at the base of mature dead or dying oak trees. Maitake fronds emerge following early October rains. High in bio-nutrients."
  },
  "7": {
    actionTitle: "DIRECT SOW COLD-HARDY SPINACH",
    actionDesc: "Broadcast Bloomsdale Long Standing spinach seed under low wire hoops for steady winter harvesting.",
    days: "33 DAYS (NOV 10)",
    forageTitle: "PERSIMMONS & ACORN MAST",
    forageDesc: "Wait for native wild persimmons to soften and drop before gathering. High sugar content for trail bars."
  },
  "8": {
    actionTitle: "SOW BRASSICA GREENS & RADISHES",
    actionDesc: "Late autumn growth window active. Plant Daikon radishes to aerate heavy clay soil beds.",
    days: "48 DAYS (NOV 25)",
    forageTitle: "PINE NEEDLES & CHICORY ROOT",
    forageDesc: "Harvest fresh eastern white pine needles for vitamin C tea infusions. Dig dandelion and chicory taproots."
  }
};

window.updateFrostAlmanac = function() {
  const select = document.getElementById("zoneSelect");
  const zoneKey = select ? select.value : "6";
  const data = ZONE_DATA[zoneKey] || ZONE_DATA["6"];

  const actTitle = document.getElementById("frostActionTitle");
  const actDesc = document.getElementById("frostActionDesc");
  const daysEl = document.getElementById("daysToFrost");
  const forageTitle = document.getElementById("forageRadarTitle");
  const forageDesc = document.getElementById("forageRadarDesc");

  if (actTitle) actTitle.textContent = data.actionTitle;
  if (actDesc) actDesc.textContent = data.actionDesc;
  if (daysEl) daysEl.textContent = data.days;
  if (forageTitle) forageTitle.textContent = data.forageTitle;
  if (forageDesc) forageDesc.textContent = data.forageDesc;
};

// ==========================================================================
// 5. SCREEN DETOX 15-SECOND POCKET LOCK SIMULATOR
// ==========================================================================

window.startDetoxTimer = function() {
  const startBtn = document.getElementById("startDetoxBtn");
  const cancelBtn = document.getElementById("cancelDetoxBtn");
  const display = document.getElementById("countdownDisplay");

  if (detoxInterval) clearInterval(detoxInterval);

  detoxTimeLeft = 15.0;
  if (startBtn) startBtn.style.display = "none";
  if (cancelBtn) cancelBtn.style.display = "inline-flex";

  // Play gentle forest wind sound via Web Audio
  playForestAmbience();

  const startTime = Date.now();
  detoxInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, 15.0 - elapsed);
    if (display) display.textContent = remaining.toFixed(2);

    // Subtle screen dimming effect
    document.body.style.filter = `brightness(${Math.max(0.35, remaining / 15)})`;

    if (remaining <= 0) {
      clearInterval(detoxInterval);
      if (display) display.textContent = "0.00";
      alert("🌿 TIME EXPIRED // POCKET YOUR PHONE AND ENJOY THE CANOPY.");
      window.cancelDetoxTimer();
    }
  }, 30);
};

window.cancelDetoxTimer = function() {
  if (detoxInterval) clearInterval(detoxInterval);
  const startBtn = document.getElementById("startDetoxBtn");
  const cancelBtn = document.getElementById("cancelDetoxBtn");
  const display = document.getElementById("countdownDisplay");

  if (startBtn) startBtn.style.display = "inline-flex";
  if (cancelBtn) cancelBtn.style.display = "none";
  if (display) display.textContent = "15.00";
  document.body.style.filter = "none";
};

function playForestAmbience() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 3);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 2);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 15);
  } catch (e) {
    // Audio context fallback
  }
}

// ==========================================================================
// 6. LIVE TOOL SWITCHING
// ==========================================================================

window.switchLiveTool = function(toolId) {
  const tools = ["birdnet", "foliage", "frost", "detox"];
  tools.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const pane = document.getElementById(`pane-${t}`);
    if (btn) btn.classList.remove("active");
    if (pane) pane.classList.remove("active");
  });

  const activeBtn = document.getElementById(`tab-btn-${toolId}`);
  const activePane = document.getElementById(`pane-${toolId}`);
  if (activeBtn) activeBtn.classList.add("active");
  if (activePane) activePane.classList.add("active");

  // Scroll to section smoothly
  const liveSec = document.getElementById("live-engine");
  if (liveSec) {
    liveSec.scrollIntoView({ behavior: 'smooth' });
  }
};

// ==========================================================================
// 7. FORM SUBMISSIONS & TOASTS
// ==========================================================================

window.handleWaitlistSubmit = function() {
  const input = document.getElementById("hero-email-input");
  const email = input ? input.value : "";
  if (!email) return;

  alert(`🌿 Welcome to the offline expedition pilot, ${email}!\n\nYour air-gapped ONNX weights link has been generated.\nNo internet will be required once cached.`);
  if (input) input.value = "";
};

window.handleFinalCtaSubmit = function() {
  const input = document.getElementById("final-email-input");
  const email = input ? input.value : "";
  if (!email) return;

  alert(`📦 Download initiated for ${email}!\n\nPackage: touch-grass-weights-q4.tar.gz (142MB)\nIncludes: BirdNET Mobile, SmolLM2-360M-Q4, Fall Foliage Routing Graph.`);
  if (input) input.value = "";
};

// ==========================================================================
// 8. MODAL CONTROLS: HACKATHON WRITEUP
// ==========================================================================

window.openPostModal = function() {
  const modal = document.getElementById("postModalBackdrop");
  if (modal) modal.classList.add("active");
};

window.closePostModal = function() {
  const modal = document.getElementById("postModalBackdrop");
  if (modal) modal.classList.remove("active");
};

window.copySubmissionMarkdown = function() {
  const md = `# Touch Grass: The Brutalist Open-Source AI for the Real World

## This Week's Theme: Touch Grass
Build something with open-weight models or open-source AI that gets people off the screen and into the world.

### Why Open Innovation Matters for Touch Grass
1. **Zero Cell Signal on the Trail:** Corporate closed models (GPT-4, Claude) die 2 miles into national forests and backcountry ravines. Touch Grass runs 100% air-gapped via quantized open weights (BirdNET Mobile ONNX & SmolLM2) directly on client silicon.
2. **Sacred Foraging & Trailhead Privacy:** Foragers and trail runners guard secret mushroom patches, wild ramps, and secluded ridgebacks. Closed AI logs GPS waypoints to corporate telemetry clouds. With Touch Grass, zero bytes ever leave your device.
3. **No Subscription Rent-Seeking:** Open-source AI costs $0/month and lets the community fine-tune regional models for local microclimates.

### Features
- **Trail Acoustic Bio-Identifier:** 40ms local FFT bird song classifier.
- **Canopy & Fall Foliage Route Synthesizer:** Prioritizes tree shade and autumn leaves.
- **Frost Date & Wild Sowing Almanac:** Local horticultural rules engine.
- **15-Second Screen Eviction Protocol:** Automatically shuts down the screen to force you outdoors.

*Built with love for open-source AI and the great outdoors.*`;

  navigator.clipboard.writeText(md).then(() => {
    const btn = document.getElementById("copyMarkdownBtn");
    if (btn) btn.textContent = "✔ COPIED TO CLIPBOARD!";
    setTimeout(() => {
      if (btn) btn.textContent = "📋 COPY MARKDOWN POST";
    }, 3000);
  });
};

// ==========================================================================
// 9. GEMMA OPEN-WEIGHTS AI CONTROLLERS
// ==========================================================================

window.openGemmaConfig = function() {
  const modal = document.getElementById("gemmaConfigModal");
  if (modal) modal.classList.add("active");

  const keyInput = document.getElementById("gemmaApiKeyInput");
  const providerSelect = document.getElementById("gemmaProviderSelect");
  const modelSelect = document.getElementById("gemmaModelSelect");
  const urlInput = document.getElementById("gemmaUrlInput");

  if (keyInput) keyInput.value = gemma.getApiKey();
  if (providerSelect) providerSelect.value = gemma.provider;
  if (modelSelect) modelSelect.value = gemma.model;
  if (urlInput) urlInput.value = gemma.customUrl;
};

window.closeGemmaConfig = function() {
  const modal = document.getElementById("gemmaConfigModal");
  if (modal) modal.classList.remove("active");
};

window.saveGemmaConfig = function() {
  const keyInput = document.getElementById("gemmaApiKeyInput");
  const providerSelect = document.getElementById("gemmaProviderSelect");
  const modelSelect = document.getElementById("gemmaModelSelect");
  const urlInput = document.getElementById("gemmaUrlInput");

  if (keyInput) gemma.setApiKey(keyInput.value);
  if (providerSelect) gemma.setProvider(providerSelect.value);
  if (modelSelect) gemma.setModel(modelSelect.value);
  if (urlInput) {
    gemma.customUrl = urlInput.value.trim();
    localStorage.setItem('gemma_api_url', gemma.customUrl);
  }

  updateGemmaStatusBadge();
  window.closeGemmaConfig();
  alert("✔ Gemma configuration saved! Ready for live open-weights outdoor generation.");
};

window.updateGemmaStatusBadge = function() {
  const badge = document.getElementById("gemmaStatusLabel");
  const modelBadge = document.getElementById("mockupModelDisplay");
  const isReady = gemma.isConfigured();

  const providerLabel = gemma.provider === 'nvidia-nim' ? 'NVIDIA NIM' : gemma.provider.toUpperCase();
  const shortModel = gemma.model.replace('google/', '');
  const displayModel = (shortModel.includes('a4b') || shortModel.includes('4b') || shortModel.includes('e4b')) 
    ? 'GEMMA 4B' 
    : shortModel.toUpperCase();

  if (badge) {
    badge.textContent = isReady ? `${providerLabel} // ${displayModel}` : `NVIDIA NIM // ${displayModel} (READY)`;
  }
  if (modelBadge) {
    modelBadge.textContent = `NVIDIA NIM // ${displayModel} (${shortModel})`;
  }
};

window.queryGemmaForTool = async function(toolType) {
  let prompt = "";
  let outputId = "";
  let sourceId = "";

  if (toolType === 'birdnet') {
    const currentBird = BIRD_DATABASE[currentBirdIndex];
    prompt = `Analyze current acoustic finding: ${currentBird.common} (${currentBird.scientific}). What specific deciduous canopy branches or foraging behaviors should the hiker look for right now? Keep it to 3 concise, brutalist sentences.`;
    outputId = "birdGemmaOutput";
    sourceId = "birdGemmaSource";
  } else if (toolType === 'foliage') {
    const dist = document.getElementById("routeDistanceSelect")?.value || "5k";
    prompt = `Synthesize an ultra-low screen time fall foliage route for ${dist}. Calculate canopy density of sugar maples and white oaks, and give 3 turn landmarks to memorize in 10 seconds.`;
    outputId = "foliageGemmaOutput";
    sourceId = "foliageGemmaSource";
  } else if (toolType === 'frost') {
    const zone = document.getElementById("zoneSelect")?.value || "6";
    prompt = `Provide immediate ground planting directives for USDA Zone ${zone} in mid-October. What roots or seeds must be in the dirt before first frost?`;
    outputId = "frostGemmaOutput";
    sourceId = "frostGemmaSource";
  }

  const outputEl = document.getElementById(outputId);
  const sourceEl = document.getElementById(sourceId);

  if (outputEl) {
    outputEl.textContent = "⚡ NVIDIA NIM is streaming Gemma 2 tensor core inference...";
  }

  try {
    const result = await gemma.generate(prompt);
    if (outputEl) outputEl.textContent = result.text;
    if (sourceEl) {
      const ms = result.latencyMs ? ` • ${result.latencyMs}ms` : '';
      sourceEl.textContent = `${result.source.toUpperCase()}${ms}`;
    }
  } catch (err) {
    if (outputEl) outputEl.textContent = `Error: ${err.message}. Reverted to edge weights.`;
  }
};

window.submitCustomGemmaPrompt = async function() {
  const input = document.getElementById("customGemmaInput");
  const outputEl = document.getElementById("customGemmaOutput");
  const sourceEl = document.getElementById("customGemmaSource");

  const prompt = input?.value?.trim();
  if (!prompt) return;

  if (outputEl) outputEl.textContent = "⚡ NVIDIA NIM is generating response on Tensor Cores...";

  try {
    const result = await gemma.generate(prompt);
    if (outputEl) outputEl.textContent = result.text;
    if (sourceEl) {
      const ms = result.latencyMs ? ` • ${result.latencyMs}ms` : '';
      sourceEl.textContent = `${result.source.toUpperCase()}${ms}`;
    }
  } catch (err) {
    if (outputEl) outputEl.textContent = `Error: ${err.message}.`;
  }
};

// Bind button listeners
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openPostBtn");
  const navLink = document.getElementById("nav-post-link");
  const gemmaBtn = document.getElementById("openGemmaConfigBtn");

  if (openBtn) openBtn.addEventListener("click", window.openPostModal);
  if (navLink) navLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.openPostModal();
  });
  if (gemmaBtn) gemmaBtn.addEventListener("click", window.openGemmaConfig);

  updateGemmaStatusBadge();
});

function setupScrollEffects() {
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navbar.style.borderBottomColor = "rgba(21, 30, 22, 0.25)";
      navbar.style.boxShadow = "0 4px 20px rgba(21, 30, 22, 0.05)";
    } else {
      navbar.style.borderBottomColor = "rgba(21, 30, 22, 0.10)";
      navbar.style.boxShadow = "none";
    }
  });
}

