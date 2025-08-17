// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, onValue, remove } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

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
const drawModeBtn = document.getElementById('drawModeBtn');
const selectModeBtn = document.getElementById('selectModeBtn');
const deleteBtn = document.getElementById('deleteBtn');

const canvasContainer = document.getElementById('canvas-container');
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color-picker');

let drawing = false;
let lastX = 0;
let lastY = 0;
let userColor = '#000000';
let currentMode = 'draw';
let roomRef;
let allLines = {};
let selectedLineKey = null;

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

// Mode buttons
drawModeBtn.addEventListener('click', () => {
  currentMode = 'draw';
  drawModeBtn.classList.add('active');
  selectModeBtn.classList.remove('active');
  deleteBtn.style.display = 'none';
  selectedLineKey = null;
  redrawCanvas();
});

selectModeBtn.addEventListener('click', () => {
  currentMode = 'select';
  selectModeBtn.classList.add('active');
  drawModeBtn.classList.remove('active');
});

deleteBtn.addEventListener('click', () => {
  if (selectedLineKey) {
    const lineToDeleteRef = ref(database, 'rooms/' + roomRef.key + '/' + selectedLineKey);
    remove(lineToDeleteRef).then(() => {
      console.log("Line deleted successfully.");
      selectedLineKey = null;
      deleteBtn.style.display = 'none';
    }).catch((error) => {
      console.error("Error removing line: ", error);
    });
  }
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
  roomRef = ref(database, 'rooms/' + roomId);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;

  canvas.addEventListener('mousedown', handleInteractionStart);
  canvas.addEventListener('mouseup', handleInteractionEnd);
  canvas.addEventListener('mouseout', handleInteractionEnd);
  canvas.addEventListener('mousemove', handleInteractionMove);

  // Mobile touch events
  canvas.addEventListener('touchstart', handleInteractionStart);
  canvas.addEventListener('touchend', handleInteractionEnd);
  canvas.addEventListener('touchcancel', handleInteractionEnd);
  canvas.addEventListener('touchmove', handleInteractionMove);

  function handleInteractionStart(e) {
    e.preventDefault();
    if (currentMode === 'draw') {
      startDrawing(e);
    } else if (currentMode === 'select') {
      selectLine(e);
    }
  }

  function handleInteractionEnd(e) {
    if (currentMode === 'draw') {
      stopDrawing();
    }
  }

  function handleInteractionMove(e) {
    e.preventDefault();
    if (currentMode === 'draw') {
      draw(e);
    }
  }
  
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
  
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const key in allLines) {
      const line = allLines[key];
      let color = line.color;
      if (key === selectedLineKey) {
        // Highlight selected line
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
      }
      drawLine(line.x1, line.y1, line.x2, line.y2, color);
    }
  }

  function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function startDrawing(e) {
    drawing = true;
    const coords = getCanvasCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
    sendLine(lastX, lastY, lastX, lastY, userColor);
  }

  function stopDrawing() {
    drawing = false;
  }

  function draw(e) {
    if (!drawing) return;
    const coords = getCanvasCoordinates(e);
    sendLine(lastX, lastY, coords.x, coords.y, userColor);
    lastX = coords.x;
    lastY = coords.y;
  }

  function selectLine(e) {
    const coords = getCanvasCoordinates(e);
    let found = false;
    for (const key in allLines) {
      const line = allLines[key];
      // Simple distance check to see if we clicked near a line segment
      const dist1 = Math.sqrt(Math.pow(coords.x - line.x1, 2) + Math.pow(coords.y - line.y1, 2));
      const dist2 = Math.sqrt(Math.pow(coords.x - line.x2, 2) + Math.pow(coords.y - line.y2, 2));
      if (dist1 < 10 || dist2 < 10) { // 10 is the selection tolerance
        selectedLineKey = key;
        deleteBtn.style.display = 'block';
        found = true;
        break;
      }
    }
    if (!found) {
      selectedLineKey = null;
      deleteBtn.style.display = 'none';
    }
    redrawCanvas();
  }

  // Listen for all lines from Firebase and redraw the canvas
  onValue(roomRef, (snapshot) => {
    allLines = snapshot.val() || {};
    redrawCanvas();
  });
}

