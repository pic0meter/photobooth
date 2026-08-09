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
const downloadGifButton = document.getElementById("downloadGifButton");
const shareButton = document.getElementById("shareButton");
const gifLoading = document.getElementById("gifLoading");
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
let pngDataUrl = "";
let gifBlob = null;

const TOTAL_PHOTOS = 4;
const COUNTDOWN_SECONDS = 3;

const styles = {
  sakura: {
    label: "SAKURA",
    bg: "#fff4f6",
    accent: "#d98295",
    accentSoft: "#f0b6c2",
    ink: "#4b3037",
    footer: "SAKURA さくら",
  },
  kawaii: {
    label: "KAWAII",
    bg: "#f7f1fb",
    accent: "#9674b4",
    accentSoft: "#cbb5dc",
    ink: "#3f3048",
    footer: "KAWAII かわいい",
  },
  y2k: {
    label: "Y2K POP",
    bg: "#fff8e9",
    accent: "#c89437",
    accentSoft: "#e7c87c",
    ink: "#483721",
    footer: "Y2K POP",
  },
  matcha: {
    label: "MATCHA",
    bg: "#f2f7f1",
    accent: "#718d77",
    accentSoft: "#aec5b1",
    ink: "#304236",
    footer: "MATCHA まっちゃ",
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
  pngDataUrl = "";
  gifBlob = null;
  gifLoading.classList.remove("visible");
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
  gifBlob = null;
  gifLoading.textContent = "CREATING GIF…";
  gifLoading.classList.add("visible");
  await createPhotoStrip();
  selectedSummary.textContent = `${styles[selectedStyle].label} · ${selectedLayout === "classic" ? "4-CUT" : selectedLayout === "grid" ? "2 × 2" : "WIDE"} · 4 PHOTOS · ${formatDate(new Date())}`;
  showScreen(screens.result);
  // Create the animated file in the background; the PNG is available immediately.
  createAnimatedGif().catch(error => {
    console.error("GIF error:", error);
    gifLoading.textContent = "GIF COULD NOT BE CREATED — PNG IS READY";
  });
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

  drawFooter(ctx, width, height, theme);
  pngDataUrl = canvas.toDataURL("image/png");
  photoStrip.src = pngDataUrl;
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

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function drawFooter(ctx, width, height, theme) {
  const footerY = selectedLayout === "wide" ? height - 82 : height - 48;
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = theme.ink;
  ctx.font = '500 22px "DM Mono", monospace';
  ctx.fillText(theme.footer, width / 2, footerY);
  ctx.fillStyle = theme.accent;
  ctx.font = '400 16px "DM Mono", monospace';
  ctx.fillText(formatDate(new Date()), width / 2, footerY + 28);
  ctx.restore();
}

async function createAnimatedGif() {
  if (!window.GIF || photos.length !== TOTAL_PHOTOS) throw new Error("GIF encoder unavailable");
  gifLoading.textContent = "CREATING GIF…";
  gifLoading.classList.add("visible");

  const images = await Promise.all(photos.map(loadImage));
  const maxWidth = 720;
  const ratio = images[0].height / images[0].width;
  const gifWidth = Math.min(maxWidth, images[0].width);
  const gifHeight = Math.round(gifWidth * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = gifWidth;
  canvas.height = gifHeight;
  const ctx = canvas.getContext("2d");

  const gif = new GIF({
    workers: 2,
    quality: 8,
    width: gifWidth,
    height: gifHeight,
    workerScript: "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js"
  });

  images.forEach((image, index) => {
    ctx.clearRect(0, 0, gifWidth, gifHeight);
    ctx.drawImage(image, 0, 0, gifWidth, gifHeight);
    // Slightly longer final frame feels like a real photo-booth preview.
    gif.addFrame(canvas, { copy: true, delay: index === images.length - 1 ? 1100 : 800 });
  });

  gifLoading.textContent = "RENDERING GIF…";
  gifBlob = await new Promise((resolve, reject) => {
    gif.on("finished", blob => resolve(blob));
    gif.on("abort", () => reject(new Error("GIF rendering aborted")));
    gif.render();
  });

  gifLoading.textContent = "GIF READY ✓";
  setTimeout(() => gifLoading.classList.remove("visible"), 1800);
}

function dataUrlToFile(dataUrl, filename, type) {
  const parts = dataUrl.split(",");
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type });
}

function gifToFile() {
  return gifBlob ? new File([gifBlob], `photo-booth-${selectedStyle}-${Date.now()}.gif`, { type: "image/gif" }) : null;
}

async function shareMemory() {
  const pngFile = dataUrlToFile(pngDataUrl, `photo-booth-${selectedStyle}.png`, "image/png");
  const gifFile = gifToFile();
  const preferredFile = gifFile || pngFile;

  try {
    if (navigator.share && navigator.canShare?.({ files: [preferredFile] })) {
      await navigator.share({
        title: "My Photo Booth Memory",
        text: `${styles[selectedStyle].label} · ${formatDate(new Date())}`,
        files: [preferredFile]
      });
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: "My Photo Booth Memory",
        text: `${styles[selectedStyle].label} · ${formatDate(new Date())}`
      });
      return;
    }

    // Desktop fallback: download the animated file so it can be attached to Messenger/IG/etc.
    if (gifBlob) {
      downloadBlob(gifBlob, `photo-booth-${selectedStyle}.gif`);
      alert("Your GIF is ready. Attach the downloaded GIF to Messenger, Instagram, or your favorite app.");
    } else {
      downloadDataUrl(pngDataUrl, `photo-booth-${selectedStyle}.png`);
      alert("Your photo is ready. Attach the downloaded PNG to Messenger, Instagram, or your favorite app.");
    }
  } catch (error) {
    if (error.name !== "AbortError") console.error("Share error:", error);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
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
  if (!pngDataUrl) return;
  downloadDataUrl(pngDataUrl, `photo-booth-${selectedStyle}-${Date.now()}.png`);
});

downloadGifButton.addEventListener("click", async () => {
  if (!gifBlob) {
    gifLoading.textContent = "CREATING GIF…";
    gifLoading.classList.add("visible");
    try { await createAnimatedGif(); } catch (error) { alert("The GIF could not be created in this browser. The PNG is still available."); return; }
  }
  downloadBlob(gifBlob, `photo-booth-${selectedStyle}-${Date.now()}.gif`);
});

shareButton.addEventListener("click", shareMemory);

beginButton.addEventListener("click", startCameraAndSession);

switchCameraButton.addEventListener("click", async () => {
  if (sessionRunning) return;
  facingMode = facingMode === "user" ? "environment" : "user";
  await startCameraAndSession();
});

errorBackButton.addEventListener("click", () => showScreen(screens.selection));

window.addEventListener("beforeunload", stopCamera);
