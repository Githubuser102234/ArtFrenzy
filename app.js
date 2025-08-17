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
const exitRoomBtn = document.getElementById('exitRoomBtn');
const drawModeBtn = document.getElementById('drawModeBtn');
const eraseModeBtn = document.getElementById('eraseModeBtn');
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

exitRoomBtn.addEventListener('click', () => {
  // Redirect to the main page without the room ID
  window.location.href = window.location.origin + window.location.pathname;
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
  toggleModeButtons('draw');
  selectedLineKey = null;
  redrawCanvas();
});

eraseModeBtn.addEventListener('click', () => {
  currentMode = 'erase';
  toggleModeButtons('erase');
  selectedLineKey = null;
  redrawCanvas();
});

selectModeBtn.addEventListener('click', () => {
  currentMode = 'select';
  toggleModeButtons('select');
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

function toggleModeButtons(activeMode) {
  const buttons = [drawModeBtn, eraseModeBtn, selectModeBtn];
  buttons.forEach(btn => btn.classList.remove('active'));
  
  if (activeMode === 'draw') {
    drawModeBtn.classList.add('active');
    deleteBtn.style.display = 'none';
    canvas.style.cursor = 'crosshair';
  } else if (activeMode === 'erase') {
    eraseModeBtn.classList.add('active');
    deleteBtn.style.display = 'none';
    canvas.style.cursor = 'crosshair';
  } else if (activeMode === 'select') {
    selectModeBtn.classList.add('active');
    canvas.style.cursor = 'pointer';
  }
}

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
      exitRoomBtn.style.display = 'block';
      startDrawingApp(roomId);
    } else {
      roomSelectionContainer.style.display = 'flex';
      canvasContainer.style.display = 'none';
      exitRoomBtn.style.display = 'none';
    }
  } else {
    authContainer.style.display = 'flex';
    roomSelectionContainer.style.display = 'none';
    canvasContainer.style.display = 'none';
    signOutBtn.style.display = 'none';
    exitRoomBtn.style.display = 'none';
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
    if (currentMode === 'draw' || currentMode === 'erase') {
      startDrawing(e);
    } else if (currentMode === 'select') {
      selectLine(e);
    }
  }

  function handleInteractionEnd(e) {
    if (currentMode === 'draw' || currentMode === 'erase') {
      stopDrawing();
    }
  }

  function handleInteractionMove(e) {
    e.preventDefault();
    if (currentMode === 'draw' || currentMode === 'erase') {
      draw(e);
    }
  }
  
  function sendLine(x1, y1, x2, y2, color, lineWidth) {
    push(roomRef, {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      color: color,
      lineWidth: lineWidth
    });
  }

  function drawLine(x1, y1, x2, y2, color, lineWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const key in allLines) {
      const line = allLines[key];
      let colorToDraw = line.color;
      let widthToDraw = line.lineWidth;
      
      if (key === selectedLineKey) {
        // Highlight selected line
        colorToDraw = 'red';
        widthToDraw = 4;
      }
      
      drawLine(line.x1, line.y1, line.x2, line.y2, colorToDraw, widthToDraw);
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
    const color = currentMode === 'erase' ? '#FFFFFF' : userColor;
    const lineWidth = currentMode === 'erase' ? 10 : 2; // Erase with a thicker line
    sendLine(lastX, lastY, lastX, lastY, color, lineWidth);
  }

  function stopDrawing() {
    drawing = false;
  }

  function draw(e) {
    if (!drawing) return;
    const coords = getCanvasCoordinates(e);
    const color = currentMode === 'erase' ? '#FFFFFF' : userColor;
    const lineWidth = currentMode === 'erase' ? 10 : 2;
    sendLine(lastX, lastY, coords.x, coords.y, color, lineWidth);
    lastX = coords.x;
    lastY = coords.y;
  }

  function selectLine(e) {
    const coords = getCanvasCoordinates(e);
    let found = false;
    for (const key in allLines) {
      const line = allLines[key];
      // A more robust hit-test for lines
      const dist = distToSegment(coords, {x: line.x1, y: line.y1}, {x: line.x2, y: line.y2});
      if (dist < 10) { // 10 is the selection tolerance
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
  
  // A helper function to calculate the distance from a point to a line segment
  function distToSegment(p, a, b) {
    const l2 = Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
    if (l2 === 0) return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = {
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y)
    };
    return Math.sqrt(Math.pow(p.x - projection.x, 2) + Math.pow(p.y - projection.y, 2));
  }

  // Listen for all lines from Firebase and redraw the canvas
  onValue(roomRef, (snapshot) => {
    allLines = snapshot.val() || {};
    redrawCanvas();
  });
}
