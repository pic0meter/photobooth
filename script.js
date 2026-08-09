const screens = {
  style: document.getElementById("styleScreen"),
  camera: document.getElementById("cameraScreen"),
  result: document.getElementById("resultScreen"),
  error: document.getElementById("errorScreen")
};

const startButton = document.getElementById("startButton");
const captureButton = document.getElementById("captureButton");
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
const selectedSummary = document.getElementById("selectedSummary");
const progressDots = [...document.querySelectorAll(".progress-dot")];

let stream = null;
let photos = [];
let currentPhoto = 0;
let isTakingPhoto = false;
let facingMode = "user";
let selectedStyle = "sakura";
let selectedLayout = "classic";

const TOTAL_PHOTOS = 4;
const COUNTDOWN_SECONDS = 3;

const styles = {
  sakura: {
    label: "SAKURA",
    bg: "#fff7f8",
    accent: "#e9879b",
    accentSoft: "#f8c4ce",
    ink: "#3b2d31",
    footer: "SAKURA さくら ♡"
  },
  kawaii: {
    label: "KAWAII",
    bg: "#fbf7ff",
    accent: "#9b7abb",
    accentSoft: "#d8c8ed",
    ink: "#352d3a",
    footer: "KAWAII かわいい ☆"
  },
  y2k: {
    label: "Y2K POP",
    bg: "#fffaf0",
    accent: "#d49a32",
    accentSoft: "#f1d28d",
    ink: "#352d22",
    footer: "Y2K POP ✦"
  },
  matcha: {
    label: "MATCHA",
    bg: "#f7fbf7",
    accent: "#78977f",
    accentSoft: "#b9cdbb",
    ink: "#29372d",
    footer: "MATCHA まっちゃ ☘"
  }
};

function showScreen(screen) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function updateDate() {
  const now = new Date();
  dateElement.textContent =
    `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()}`;
}
updateDate();

document.querySelectorAll(".style-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".style-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedStyle = card.dataset.style;
  });
});

document.querySelectorAll(".layout-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".layout-button").forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    selectedLayout = button.dataset.layout;
  });
});

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API unavailable");
    }

    stopCamera();

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

    resetSession();
    showScreen(screens.camera);
  } catch (error) {
    console.error("Camera error:", error);
    showScreen(screens.error);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
}

function resetSession() {
  photos = [];
  currentPhoto = 0;
  isTakingPhoto = false;
  captureButton.disabled = false;
  countdownElement.textContent = "";
  updatePhotoProgress();
}

function updatePhotoProgress() {
  photoNumberElement.textContent = `${Math.min(currentPhoto + 1, TOTAL_PHOTOS)} / ${TOTAL_PHOTOS}`;
  progressDots.forEach((dot, index) => {
    dot.classList.toggle("active", index < currentPhoto || (currentPhoto === 0 && index === 0));
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function countdown(seconds) {
  return new Promise(resolve => {
    let remaining = seconds;
    countdownElement.textContent = remaining;

    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        countdownElement.textContent = "";
        resolve();
      } else {
        countdownElement.textContent = remaining;
      }
    }, 1000);
  });
}

async function takePhoto() {
  if (isTakingPhoto || !stream || video.readyState < 2) return;

  isTakingPhoto = true;
  captureButton.disabled = true;

  await countdown(COUNTDOWN_SECONDS);
  makeFlash();

  photos.push(captureFrame());
  currentPhoto++;
  updatePhotoProgress();

  // CONTINUOUS MODE:
  // The next countdown starts automatically after a short pause.
  if (currentPhoto < TOTAL_PHOTOS) {
    await wait(850);
    isTakingPhoto = false;
    captureButton.disabled = false;
    takePhoto();
  } else {
    await wait(500);
    finishSession();
  }
}

function captureFrame() {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Only mirror the selfie camera, matching the preview.
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
  isTakingPhoto = false;
  stopCamera();
  await createPhotoStrip();
  showScreen(screens.result);
  selectedSummary.textContent =
    `${styles[selectedStyle].label}  ·  ${selectedLayout.toUpperCase()}  ·  4 PHOTOS`;
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

  const width = selectedLayout === "wide" ? 1400 : 900;
  const height = selectedLayout === "grid" ? 1050 : selectedLayout === "wide" ? 650 : 2650;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  addFrameDecor(ctx, width, height, theme);

  if (selectedLayout === "classic") {
    const pad = 65;
    const photoW = width - pad * 2;
    const photoH = 500;
    const gap = 25;
    images.forEach((img, i) => drawCoverImage(ctx, img, pad, 65 + i * (photoH + gap), photoW, photoH));
  } else if (selectedLayout === "grid") {
    const pad = 55;
    const gap = 24;
    const photoW = (width - pad * 2 - gap) / 2;
    const photoH = (height - pad * 2 - gap - 110) / 2;
    images.forEach((img, i) => {
      const x = pad + (i % 2) * (photoW + gap);
      const y = pad + Math.floor(i / 2) * (photoH + gap);
      drawCoverImage(ctx, img, x, y, photoW, photoH);
    });
    drawFooter(ctx, width, height, theme);
  } else {
    const pad = 55;
    const photoW = (width - pad * 2 - 3 * 20) / 4;
    const photoH = 430;
    images.forEach((img, i) => drawCoverImage(ctx, img, pad + i * (photoW + 20), 75, photoW, photoH));
    drawFooter(ctx, width, height, theme);
  }

  if (selectedLayout === "classic") {
    drawFooter(ctx, width, height, theme);
  }

  photoStrip.src = canvas.toDataURL("image/png");
}

function addFrameDecor(ctx, width, height, theme) {
  ctx.save();
  ctx.strokeStyle = theme.accentSoft;
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  ctx.fillStyle = theme.accent;
  ctx.globalAlpha = 0.7;
  ctx.font = '30px "DM Mono", monospace';
  ctx.textAlign = "left";
  ctx.fillText("♡", 38, 55);
  ctx.textAlign = "right";
  ctx.fillText("✦", width - 38, 55);
  ctx.textAlign = "left";
  ctx.fillText("✿", 38, height - 35);
  ctx.textAlign = "right";
  ctx.fillText("♡", width - 38, height - 35);
  ctx.restore();
}

function drawFooter(ctx, width, height, theme) {
  ctx.textAlign = "center";
  ctx.fillStyle = theme.ink;
  ctx.font = '500 28px "DM Mono", monospace';
  ctx.fillText(theme.footer, width / 2, height - 68);

  ctx.fillStyle = theme.accent;
  ctx.font = '18px "DM Mono", monospace';
  ctx.fillText(new Date().toLocaleDateString("en-GB"), width / 2, height - 35);
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

  ctx.save();
  ctx.shadowColor = "rgba(50,30,35,.10)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  ctx.restore();
}

downloadButton.addEventListener("click", () => {
  if (!photoStrip.src) return;
  const link = document.createElement("a");
  link.download = `photo-booth-${selectedStyle}-${Date.now()}.png`;
  link.href = photoStrip.src;
  link.click();
});

retakeButton.addEventListener("click", () => {
  photoStrip.removeAttribute("src");
  showScreen(screens.style);
});

startButton.addEventListener("click", startCamera);

captureButton.addEventListener("click", takePhoto);

switchCameraButton.addEventListener("click", async () => {
  if (isTakingPhoto) return;
  facingMode = facingMode === "user" ? "environment" : "user";
  await startCamera();
});

errorBackButton.addEventListener("click", startCamera);

document.addEventListener("keydown", event => {
  if (event.code === "Space" && screens.camera.classList.contains("active")) {
    event.preventDefault();
    if (!isTakingPhoto) takePhoto();
  }
});
