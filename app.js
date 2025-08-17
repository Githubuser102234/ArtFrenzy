// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJnTnlA9VnIDhG4sO3UVOIw12T9nBobwQ",
  authDomain: "artfrenzy-f1502.firebaseapp.com",
  databaseURL: "https://artfrenzy-f1502-default-rtdb.firebaseio.com",
  projectId: "artfrenzy-f1502",
  storageBucket: "artfrenzy-f1502.firebasestorage.app",
  messagingSenderId: "869747035999",
  appId: "1:869747035999:web:9f5483b3ba85f5ebcf70ea",
  measurementId: "G-JHZHP23TG7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const authContainer = document.getElementById('auth-container');
const roomSelectionContainer = document.getElementById('room-selection-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const signOutBtn = document.getElementById('signOutBtn');

const canvasContainer = document.getElementById('canvas-container');
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color-picker');

let drawing = false;
let userColor = '#000000';

// Event listeners for auth buttons
loginBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  signInWithEmailAndPassword(auth, email, password)
    .catch(error => alert(error.message));
});

registerBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  createUserWithEmailAndPassword(auth, email, password)
    .catch(error => alert(error.message));
});

signOutBtn.addEventListener('click', () => {
  signOut(auth);
});

// Event listener for the new "Create Room" button
createRoomBtn.addEventListener('click', () => {
  const newRoomId = Math.random().toString(36).substring(2, 9);
  const currentUrl = new URL(window.location.href);
  const newUrl = `${currentUrl.origin}${currentUrl.pathname}?roomid=${newRoomId}`;
  window.location.href = newUrl;
});

// Update the user's color when the color picker changes
colorPicker.addEventListener('change', (e) => {
  userColor = e.target.value;
});

// Main logic for handling authentication state changes
onAuthStateChanged(auth, user => {
  if (user) {
    authContainer.style.display = 'none';
    signOutBtn.style.display = 'block';

    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomid');

    if (roomId) {
      roomSelectionContainer.style.display = 'none';
      canvasContainer.style.display = 'block';
      startDrawingApp(roomId);
    } else {
      roomSelectionContainer.style.display = 'flex';
      canvasContainer.style.display = 'none';
    }
  } else {
    authContainer.style.display = 'flex';
    roomSelectionContainer.style.display = 'none';
    canvasContainer.style.display = 'none';
    signOutBtn.style.display = 'none';
  }
});

// The drawing app logic
function startDrawingApp(roomId) {
  const roomRef = ref(database, 'rooms/' + roomId);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  canvas.addEventListener('mousemove', draw);

  // Mobile touch events
  canvas.addEventListener('touchstart', startDrawing);
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);
  canvas.addEventListener('touchmove', draw);

  function sendLine(x1, y1, x2, y2, color) {
    push(roomRef, {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      color: color
    });
  }

  function drawLine(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function getClientCoordinates(e) {
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  }

  function startDrawing(e) {
    e.preventDefault();
    drawing = true;
    const { clientX, clientY } = getClientCoordinates(e);
    const lastX = clientX;
    const lastY = clientY;
    sendLine(lastX, lastY, clientX, clientY, userColor);
  }

  function stopDrawing() {
    drawing = false;
  }

  function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const { clientX, clientY } = getClientCoordinates(e);
    const lastX = e.offsetX - (e.movementX || 0);
    const lastY = e.offsetY - (e.movementY || 0);
    sendLine(lastX, lastY, clientX, clientY, userColor);
  }

  // Listen for new lines from Firebase
  onChildAdded(roomRef, snapshot => {
    const line = snapshot.val();
    drawLine(line.x1, line.y1, line.x2, line.y2, line.color);
  });
}
