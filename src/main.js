import * as faceapi from 'face-api.js';

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const nameInput = document.getElementById('nameInput');
const registerBtn = document.getElementById('registerBtn');

let labeledDescriptors = [];
let faceMatcher;

async function startVideo() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });
}

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
}

async function registerFace(name) {
  if (!name) {
    alert('Please enter a name!');
    return;
  }

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert('No face detected, try again!');
    return;
  }

  const descriptor = detection.descriptor;
  labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(name, [descriptor]));

  faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);

  alert(`Registered face for ${name}!`);
}

function startRecognition() {
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
  if (!faceMatcher) {
    // No registered faces yet, skip detection or show a message
    console.log('No faces registered yet, skipping recognition');
    return;
  }

  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  const resizedDetections = faceapi.resizeResults(detections, displaySize);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  resizedDetections.forEach(d => {
    const bestMatch = faceMatcher.findBestMatch(d.descriptor);
    const box = d.detection.box;
    const drawBox = new faceapi.draw.DrawBox(box, { label: bestMatch.toString() });
    drawBox.draw(canvas);
  });
}, 100);

}

async function setup() {
  await loadModels();
  await startVideo();

  registerBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    await registerFace(name);
  });

  // Start recognition loop after first registration (or call manually)
  startRecognition();
}

setup();
