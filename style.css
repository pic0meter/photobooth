/* =========================================
   PHOTO BOOTH
   Main JavaScript
========================================= */

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


/* =========================================
   VARIABLES
========================================= */

let stream = null;

let currentPhoto = 0;

let photos = [];

let facingMode = "user";

let isTakingPhoto = false;

const TOTAL_PHOTOS = 4;

const COUNTDOWN_SECONDS = 3;


/* =========================================
   DATE
========================================= */

function updateDate() {

  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  dateElement.textContent = `${day}.${month}.${year}`;
}

updateDate();


/* =========================================
   SCREEN NAVIGATION
========================================= */

function showScreen(screen) {

  document.querySelectorAll(".screen").forEach(element => {
    element.classList.remove("active");
  });

  screen.classList.add("active");
}


/* =========================================
   START CAMERA
========================================= */

async function startCamera() {

  try {

    if (stream) {
      stopCamera();
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode,
        width: {
          ideal: 1280
        },
        height: {
          ideal: 720
        }
      },
      audio: false
    });

    video.srcObject = stream;

    await video.play();

    showScreen(cameraScreen);

    resetBooth();

  } catch (error) {

    console.error("Camera error:", error);

    showScreen(errorScreen);

  }
}


/* =========================================
   STOP CAMERA
========================================= */

function stopCamera() {

  if (!stream) {
    return;
  }

  stream.getTracks().forEach(track => {
    track.stop();
  });

  stream = null;

  video.srcObject = null;
}


/* =========================================
   RESET BOOTH
========================================= */

function resetBooth() {

  currentPhoto = 0;

  photos = [];

  isTakingPhoto = false;

  updatePhotoNumber();

  countdownElement.textContent = "";

}


/* =========================================
   PHOTO NUMBER
========================================= */

function updatePhotoNumber() {

  photoNumberElement.textContent =
    `${currentPhoto + 1} / ${TOTAL_PHOTOS}`;

}


/* =========================================
   COUNTDOWN
========================================= */

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


/* =========================================
   TAKE PHOTO
========================================= */

async function takePhoto() {

  if (isTakingPhoto) {
    return;
  }

  if (!stream) {
    return;
  }

  isTakingPhoto = true;

  captureButton.disabled = true;

  await countdown(COUNTDOWN_SECONDS);

  makeFlash();

  const photo = captureFrame();

  photos.push(photo);

  currentPhoto++;

  updatePhotoNumber();

  await wait(700);

  if (currentPhoto < TOTAL_PHOTOS) {

    isTakingPhoto = false;

    captureButton.disabled = false;

    return;

  }

  finishSession();

}


/* =========================================
   CAPTURE VIDEO FRAME
========================================= */

function captureFrame() {

  const canvas = document.createElement("canvas");

  const width = video.videoWidth;
  const height = video.videoHeight;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  /*
    Mirror the captured image so it matches
    what the user sees in the camera preview.
  */

  context.translate(width, 0);

  context.scale(-1, 1);

  context.drawImage(
    video,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL("image/jpeg", 0.92);

}


/* =========================================
   FLASH EFFECT
========================================= */

function makeFlash() {

  flash.classList.remove("active");

  /*
    Force browser reflow so animation
    can restart every time.
  */

  void flash.offsetWidth;

  flash.classList.add("active");

}


/* =========================================
   FINISH SESSION
========================================= */

function finishSession() {

  isTakingPhoto = false;

  stopCamera();

  createPhotoStrip();

  showScreen(resultScreen);

}


/* =========================================
   CREATE PHOTO STRIP
========================================= */

function createPhotoStrip() {

  const canvas = document.createElement("canvas");

  /*
    Final strip dimensions.
  */

  const width = 900;

  const photoWidth = 780;

  const photoHeight = 585;

  const sidePadding = 60;

  const topPadding = 60;

  const gap = 25;

  const bottomArea = 120;

  const height =
    topPadding +
    (photoHeight * TOTAL_PHOTOS) +
    (gap * (TOTAL_PHOTOS - 1)) +
    bottomArea;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");


  /* Background */

  context.fillStyle = "#ffffff";

  context.fillRect(
    0,
    0,
    width,
    height
  );


  /*
    Load all four photos before drawing.
  */

  const images = photos.map(source => {

    const image = new Image();

    image.src = source;

    return image;

  });


  let loaded = 0;

  images.forEach(image => {

    image.onload = () => {

      loaded++;

      if (loaded === images.length) {

        drawStrip(
          context,
          images,
          width,
          photoWidth,
          photoHeight,
          sidePadding,
          topPadding,
          gap,
          height
        );

      }

    };

  });

}


/* =========================================
   DRAW PHOTO STRIP
========================================= */

function drawStrip(
  context,
  images,
  canvasWidth,
  photoWidth,
  photoHeight,
  sidePadding,
  topPadding,
  gap,
  canvasHeight
) {

  images.forEach((image, index) => {

    const y =
      topPadding +
      index * (photoHeight + gap);

    /*
      Make image fill the target area
      while maintaining its aspect ratio.
    */

    drawCoverImage(
      context,
      image,
      sidePadding,
      y,
      photoWidth,
      photoHeight
    );

  });


  /* =====================================
     FOOTER
  ===================================== */

  context.fillStyle = "#171717";

  context.textAlign = "center";

  context.font =
    "500 25px monospace";

  context.fillText(
    "MY PHOTO BOOTH",
    canvasWidth / 2,
    canvasHeight - 65
  );


  context.font =
    "20px monospace";

  context.fillStyle =
    "rgba(23,23,23,0.55)";

  const now = new Date();

  const date = now.toLocaleDateString(
    "en-GB"
  );

  context.fillText(
    date,
    canvasWidth / 2,
    canvasHeight - 30
  );


  /* =====================================
     EXPORT
  ===================================== */

  photoStrip.src =
    context.canvas.toDataURL(
      "image/png"
    );

}


/* =========================================
   DRAW COVER IMAGE
========================================= */

function drawCoverImage(
  context,
  image,
  x,
  y,
  width,
  height
) {

  const imageRatio =
    image.width / image.height;

  const targetRatio =
    width / height;

  let sourceWidth;
  let sourceHeight;
  let sourceX;
  let sourceY;


  if (imageRatio > targetRatio) {

    sourceHeight = image.height;

    sourceWidth =
      image.height * targetRatio;

    sourceX =
      (image.width - sourceWidth) / 2;

    sourceY = 0;

  } else {

    sourceWidth = image.width;

    sourceHeight =
      image.width / targetRatio;

    sourceX = 0;

    sourceY =
      (image.height - sourceHeight) / 2;

  }


  context.drawImage(
    image,

    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,

    x,
    y,
    width,
    height
  );

}


/* =========================================
   DOWNLOAD
========================================= */

downloadButton.addEventListener(
  "click",
  () => {

    if (!photoStrip.src) {
      return;
    }

    const link =
      document.createElement("a");

    link.download =
      `photo-booth-${Date.now()}.png`;

    link.href =
      photoStrip.src;

    link.click();

  }
);


/* =========================================
   RETAKE
========================================= */

retakeButton.addEventListener(
  "click",
  async () => {

    resetBooth();

    await startCamera();

  }
);


/* =========================================
   START BUTTON
========================================= */

startButton.addEventListener(
  "click",
  async () => {

    await startCamera();

  }
);


/* =========================================
   CAPTURE BUTTON
========================================= */

captureButton.addEventListener(
  "click",
  async () => {

    await takePhoto();

  }
);


/* =========================================
   SWITCH CAMERA
========================================= */

switchCameraButton.addEventListener(
  "click",
  async () => {

    facingMode =
      facingMode === "user"
        ? "environment"
        : "user";

    await startCamera();

  }
);


/* =========================================
   ERROR RETRY
========================================= */

errorBackButton.addEventListener(
  "click",
  async () => {

    await startCamera();

  }
);


/* =========================================
   KEYBOARD SUPPORT
========================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.code === "Space" &&
      cameraScreen.classList.contains("active")
    ) {

      event.preventDefault();

      takePhoto();

    }

  }
);


/* =========================================
   UTILITY
========================================= */

function wait(milliseconds) {

  return new Promise(resolve => {

    setTimeout(
      resolve,
      milliseconds
    );

  });

}