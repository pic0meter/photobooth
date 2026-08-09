const startScreen = document.getElementById("startScreen");
const cameraScreen = document.getElementById("cameraScreen");
const resultScreen = document.getElementById("resultScreen");
const errorScreen = document.getElementById("errorScreen");

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
const errorMessage = document.getElementById("errorMessage");

let stream = null;
let currentPhoto = 0;
let photos = [];
let facingMode = "user";
let isTakingPhoto = false;

const TOTAL_PHOTOS = 4;
const COUNTDOWN_SECONDS = 3;

function updateDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  dateElement.textContent = `${day}.${month}.${year}`;
}

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach(element => {
    element.classList.remove("active");
  });
  screen.classList.add("active");
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not supported by this browser or page.");
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
    resetBooth();
    showScreen(cameraScreen);
  } catch (error) {
    console.error("Camera error:", error);
    errorMessage.textContent = getCameraErrorMessage(error);
    showScreen(errorScreen);
  }
}

function getCameraErrorMessage(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Please allow camera access in your browser, then try again.";
    case "NotFoundError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "The camera is already being used by another application.";
    case "SecurityError":
      return "Camera access was blocked by the browser security settings.";
    default:
      return "Please check your camera permissions and try again.";
  }
}

function stopCamera() {
  if (!stream) return;
  stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
}

function resetBooth() {
  currentPhoto = 0;
  photos = [];
  isTakingPhoto = false;
  photoStrip.removeAttribute("src");
  updatePhotoNumber();
  countdownElement.textContent = "";
  captureButton.disabled = false;
}

function updatePhotoNumber() {
  photoNumberElement.textContent = `${Math.min(currentPhoto + 1, TOTAL_PHOTOS)} / ${TOTAL_PHOTOS}`;
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
        return;
      }
      countdownElement.textContent = remaining;
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
  updatePhotoNumber();

  await wait(700);

  if (currentPhoto < TOTAL_PHOTOS) {
    isTakingPhoto = false;
    captureButton.disabled = false;
    return;
  }

  await finishSession();
}

function captureFrame() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (facingMode === "user") {
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(video, 0, 0, width, height);
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
  showScreen(resultScreen);
  await createPhotoStrip();
}

function createPhotoStrip() {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const width = 900;
    const photoWidth = 780;
    const photoHeight = 585;
    const sidePadding = 60;
    const topPadding = 60;
    const gap = 25;
    const bottomArea = 120;
    const height = topPadding + (photoHeight * TOTAL_PHOTOS) + (gap * (TOTAL_PHOTOS - 1)) + bottomArea;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    const images = photos.map(source => {
      const image = new Image();
      image.onload = () => {
        loaded++;
        if (loaded === images.length) drawStrip();
      };
      image.onerror = reject;
      image.src = source;
      return image;
    });

    let loaded = 0;

    function drawStrip() {
      images.forEach((image, index) => {
        const y = topPadding + index * (photoHeight + gap);
        drawCoverImage(context, image, sidePadding, y, photoWidth, photoHeight);
      });

      context.fillStyle = "#171717";
      context.textAlign = "center";
      context.font = "500 25px monospace";
      context.fillText("MY PHOTO BOOTH", width / 2, height - 65);

      context.font = "20px monospace";
      context.fillStyle = "rgba(23,23,23,0.55)";
      context.fillText(new Date().toLocaleDateString("en-GB"), width / 2, height - 30);

      photoStrip.src = canvas.toDataURL("image/png");
      resolve();
    }

    if (images.length === 0) reject(new Error("No photos were captured."));
  });
}

function drawCoverImage(context, image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth;
  let sourceHeight;
  let sourceX;
  let sourceY;

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

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

downloadButton.addEventListener("click", () => {
  if (!photoStrip.src) return;
  const link = document.createElement("a");
  link.download = `photo-booth-${Date.now()}.png`;
  link.href = photoStrip.src;
  link.click();
});

retakeButton.addEventListener("click", async () => {
  resetBooth();
  await startCamera();
});

startButton.addEventListener("click", async () => {
  await startCamera();
});

captureButton.addEventListener("click", async () => {
  await takePhoto();
});

switchCameraButton.addEventListener("click", async () => {
  facingMode = facingMode === "user" ? "environment" : "user";
  await startCamera();
});

errorBackButton.addEventListener("click", async () => {
  await startCamera();
});

document.addEventListener("keydown", event => {
  if (event.code === "Space" && cameraScreen.classList.contains("active")) {
    event.preventDefault();
    takePhoto();
  }
});

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

updateDate();
