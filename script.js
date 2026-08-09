const screens = {
  home: document.getElementById("homeScreen"),
  selection: document.getElementById("selectionScreen"),
  camera: document.getElementById("cameraScreen"),
  result: document.getElementById("resultScreen"),
  error: document.getElementById("errorScreen")
};

const homeStartButton = document.getElementById("homeStartButton");
const backHomeButton = document.getElementById("backHomeButton");
const beginButton = document.getElementById("beginButton");
const switchCameraButton = document.getElementById("switchCameraButton");
const downloadButton = document.getElementById("downloadButton");
const retakeButton = document.getElementById("retakeButton");
const errorBackButton = document.getElementById("errorBackButton");

const video = document.getElementById("video");
const flash = document.getElementById("flash");
const countdownElement = document.getElementById("countdown");
const photoNumberElement = document.getElementById("photoNumber");
const photoStrip = document.getElementById("photoStrip");
const dateElement = document.getElementById("date");
const selectionSummary = document.getElementById("selectionSummary");
const selectedSummary = document.getElementById("selectedSummary");
const cameraStyleBadge = document.getElementById("cameraStyleBadge");
const progressDots = [...document.querySelectorAll(".progress-dot")];

let stream = null;
let photos = [];
let facingMode = "user";
let selectedStyle = "sakura";
let selectedLayout = "classic";
let sessionRunning = false;

const TOTAL_PHOTOS = 4;
const COUNTDOWN_SECONDS = 3;

const styles = {
  sakura: {
    label: "SAKURA",
    bg: "#fff4f6",
    accent: "#d98295",
    accentSoft: "#f0b6c2",
    ink: "#4b3037",
    footer: "SAKURA さくら ♡",
    symbols: ["♡", "✿", "♡", "✿"]
  },
  kawaii: {
    label: "KAWAII",
    bg: "#f7f1fb",
    accent: "#9674b4",
    accentSoft: "#cbb5dc",
    ink: "#3f3048",
    footer: "KAWAII かわいい ☆",
    symbols: ["☆", "♡", "☆", "♡"]
  },
  y2k: {
    label: "Y2K POP",
    bg: "#fff8e9",
    accent: "#c89437",
    accentSoft: "#e7c87c",
    ink: "#483721",
    footer: "Y2K POP ✦",
    symbols: ["★", "✦", "★", "✦"]
  },
  matcha: {
    label: "MATCHA",
    bg: "#f2f7f1",
    accent: "#718d77",
    accentSoft: "#aec5b1",
    ink: "#304236",
    footer: "MATCHA まっちゃ ☘",
    symbols: ["☘", "♡", "☘", "♡"]
  }
};

function showScreen(screen) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateDate() {
  const now = new Date();
  dateElement.textContent = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
}
updateDate();

function updateSelectionSummary() {
  selectionSummary.textContent = `${styles[selectedStyle].label} · ${selectedLayout === "classic" ? "4-CUT" : selectedLayout === "grid" ? "2 × 2" : "WIDE"}`;
}
updateSelectionSummary();

document.querySelectorAll(".frame-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".frame-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedStyle = card.dataset.style;
    updateSelectionSummary();
  });
});

document.querySelectorAll(".layout-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".layout-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedLayout = card.dataset.layout;
    updateSelectionSummary();
  });
});

homeStartButton.addEventListener("click", () => showScreen(screens.selection));
backHomeButton.addEventListener("click", () => showScreen(screens.home));
retakeButton.addEventListener("click", () => {
  photoStrip.removeAttribute("src");
  showScreen(screens.selection);
});

async function startCameraAndSession() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera API unavailable");

    stopCamera();
    photos = [];
    sessionRunning = true;
    cameraStyleBadge.textContent = styles[selectedStyle].label;
    updatePhotoProgress(0);

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();
    showScreen(screens.camera);

    // One button press starts the ENTIRE four-photo session.
    await wait(1000);
    await runContinuousSession();
  } catch (error) {
    console.error("Camera error:", error);
    sessionRunning = false;
    stopCamera();
    showScreen(screens.error);
  }
}

async function runContinuousSession() {
  for (let photoIndex = 0; photoIndex < TOTAL_PHOTOS; photoIndex++) {
    if (!sessionRunning || !stream) return;

    updatePhotoProgress(photoIndex);
    await countdown(COUNTDOWN_SECONDS);

    if (!sessionRunning || !stream) return;

    makeFlash();
    photos.push(captureFrame());
    updatePhotoProgress(photoIndex + 1);

    // Short breathing room before the next automatic countdown.
    if (photoIndex < TOTAL_PHOTOS - 1) await wait(900);
  }

  await wait(450);
  await finishSession();
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
}

function updatePhotoProgress(completed) {
  const current = Math.min(completed + 1, TOTAL_PHOTOS);
  photoNumberElement.textContent = `PHOTO ${current} / ${TOTAL_PHOTOS}`;
  progressDots.forEach((dot, index) => dot.classList.toggle("active", index < completed || (completed === 0 && index === 0)));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function countdown(seconds) {
  return new Promise(resolve => {
    let remaining = seconds;
    countdownElement.textContent = remaining;

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        countdownElement.textContent = "GO!";
        setTimeout(() => {
          countdownElement.textContent = "";
          resolve();
        }, 180);
      } else {
        countdownElement.textContent = remaining;
      }
    }, 1000);
  });
}

function captureFrame() {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (facingMode === "user") {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function makeFlash() {
  flash.classList.remove("active");
  void flash.offsetWidth;
  flash.classList.add("active");
}

async function finishSession() {
  sessionRunning = false;
  stopCamera();
  await createPhotoStrip();
  selectedSummary.textContent = `${styles[selectedStyle].label} · ${selectedLayout === "classic" ? "4-CUT" : selectedLayout === "grid" ? "2 × 2" : "WIDE"} · 4 PHOTOS`;
  showScreen(screens.result);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function createPhotoStrip() {
  const theme = styles[selectedStyle];
  const images = await Promise.all(photos.map(loadImage));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let width, height;
  if (selectedLayout === "classic") { width = 900; height = 2650; }
  if (selectedLayout === "grid") { width = 1100; height = 1100; }
  if (selectedLayout === "wide") { width = 1500; height = 650; }

  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  drawFrameBase(ctx, width, height, theme);

  if (selectedLayout === "classic") {
    const pad = 70, gap = 24, photoW = width - pad * 2, photoH = 500;
    images.forEach((img, i) => drawPhotoCard(ctx, img, pad, 70 + i * (photoH + gap), photoW, photoH, theme));
  } else if (selectedLayout === "grid") {
    const pad = 70, gap = 25, photoW = (width - pad * 2 - gap) / 2, photoH = photoW;
    images.forEach((img, i) => {
      const x = pad + (i % 2) * (photoW + gap);
      const y = pad + Math.floor(i / 2) * (photoH + gap);
      drawPhotoCard(ctx, img, x, y, photoW, photoH, theme);
    });
  } else {
    const pad = 50, gap = 22, photoW = (width - pad * 2 - gap * 3) / 4, photoH = 430;
    images.forEach((img, i) => drawPhotoCard(ctx, img, pad + i * (photoW + gap), 65, photoW, photoH, theme));
  }

  drawDecorations(ctx, width, height, theme);
  drawFooter(ctx, width, height, theme);
  photoStrip.src = canvas.toDataURL("image/png");
}

function drawFrameBase(ctx, width, height, theme) {
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 5;
  ctx.strokeRect(25, 25, width - 50, height - 50);
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);
  ctx.restore();
}

function drawPhotoCard(ctx, image, x, y, width, height, theme) {
  ctx.save();
  ctx.shadowColor = "rgba(40,30,25,.12)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - 5, y - 5, width + 10, height + 10);
  ctx.restore();

  drawCoverImage(ctx, image, x, y, width, height);

  ctx.save();
  ctx.strokeStyle = theme.accentSoft;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

function drawDecorations(ctx, width, height, theme) {
  const symbols = theme.symbols;
  ctx.save();
  ctx.fillStyle = theme.accent;
  ctx.font = "34px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(symbols[0], 52, 58);
  ctx.fillText(symbols[1], width - 52, 58);
  ctx.fillText(symbols[2], 52, height - 52);
  ctx.fillText(symbols[3], width - 52, height - 52);

  // Small scattered accents make each frame visibly different.
  ctx.font = "18px sans-serif";
  ctx.globalAlpha = 0.65;
  ctx.fillText(symbols[1], width * 0.16, height * 0.05);
  ctx.fillText(symbols[2], width * 0.84, height * 0.05);
  ctx.restore();
}

function drawFooter(ctx, width, height, theme) {
  const footerY = selectedLayout === "wide" ? height - 80 : height - 45;
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = theme.ink;
  ctx.font = '500 22px "DM Mono", monospace';
  ctx.fillText(theme.footer, width / 2, footerY);
  ctx.restore();
}

function drawCoverImage(ctx, image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth, sourceHeight, sourceX, sourceY;

  if (imageRatio > targetRatio) {
    sourceHeight = image.height;
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
    sourceY = 0;
  } else {
    sourceWidth = image.width;
    sourceHeight = image.width / targetRatio;
    sourceX = 0;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

downloadButton.addEventListener("click", () => {
  if (!photoStrip.src) return;
  const link = document.createElement("a");
  link.download = `photo-booth-${selectedStyle}-${Date.now()}.png`;
  link.href = photoStrip.src;
  link.click();
});

beginButton.addEventListener("click", startCameraAndSession);

switchCameraButton.addEventListener("click", async () => {
  if (sessionRunning) return;
  facingMode = facingMode === "user" ? "environment" : "user";
  await startCameraAndSession();
});

errorBackButton.addEventListener("click", () => showScreen(screens.selection));

window.addEventListener("beforeunload", stopCamera);
