// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

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
const addTextModeBtn = document.getElementById('addTextModeBtn');
const deleteBtn = document.getElementById('deleteBtn');

const canvasContainer = document.getElementById('canvas-container');
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color-picker');
const textInput = document.getElementById('textInput');

let drawing = false;
let lastX = 0;
let lastY = 0;
let userColor = '#000000';
let currentMode = 'draw';
let roomRef;
let allItems = {};
let selectedItemKey = null;

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
  selectedItemKey = null;
  textInput.style.display = 'none';
  redrawCanvas();
});

eraseModeBtn.addEventListener('click', () => {
  currentMode = 'erase';
  toggleModeButtons('erase');
  selectedItemKey = null;
  textInput.style.display = 'none';
  redrawCanvas();
});

selectModeBtn.addEventListener('click', () => {
  currentMode = 'select';
  toggleModeButtons('select');
  textInput.style.display = 'none';
});

addTextModeBtn.addEventListener('click', () => {
  currentMode = 'text';
  toggleModeButtons('text');
  selectedItemKey = null;
});

deleteBtn.addEventListener('click', () => {
  if (selectedItemKey) {
    const itemToDeleteRef = ref(database, 'rooms/' + roomRef.key + '/' + selectedItemKey);
    remove(itemToDeleteRef).then(() => {
      console.log("Item deleted successfully.");
      selectedItemKey = null;
      deleteBtn.style.display = 'none';
    }).catch((error) => {
      console.error("Error removing item: ", error);
    });
  }
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = textInput.value;
    if (text) {
      if (selectedItemKey) {
        // Update existing text item
        const updates = {
          text: text
        };
        update(ref(database, 'rooms/' + roomRef.key + '/' + selectedItemKey), updates);
      } else {
        // Add new text item
        push(roomRef, {
          type: 'text',
          x: textInput.xPos,
          y: textInput.yPos,
          text: text,
          color: userColor
        });
      }
      textInput.value = '';
      textInput.style.display = 'none';
    }
  }
});

// Update the user's color when the color picker changes
colorPicker.addEventListener('change', (e) => {
  userColor = e.target.value;
});

function toggleModeButtons(activeMode) {
  const buttons = [drawModeBtn, eraseModeBtn, selectModeBtn, addTextModeBtn];
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
    deleteBtn.style.display = 'none';
    canvas.style.cursor = 'pointer';
  } else if (activeMode === 'text') {
    addTextModeBtn.classList.add('active');
    deleteBtn.style.display = 'none';
    canvas.style.cursor = 'text';
  }
}

// Main logic for handling authentication state changes
onAuthStateChanged(auth, user => {
  if (user) {
    authContainer.style.display = 'none';
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomid');

    if (roomId) {
      roomSelectionContainer.style.display = 'none';
      canvasContainer.style.display = 'block';
      exitRoomBtn.style.display = 'block';
    } else {
      roomSelectionContainer.style.display = 'flex';
      canvasContainer.style.display = 'none';
      exitRoomBtn.style.display = 'none';
    }
  } else {
    authContainer.style.display = 'flex';
    roomSelectionContainer.style.display = 'none';
    canvasContainer.style.display = 'none';
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
      selectItem(e);
    } else if (currentMode === 'text') {
      addText(e);
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
      type: 'line',
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
  
  function drawText(x, y, text, color) {
    ctx.fillStyle = color;
    ctx.font = '20px Arial';
    ctx.fillText(text, x, y);
  }
  
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const key in allItems) {
      const item = allItems[key];
      let colorToDraw = item.color;
      let widthToDraw = item.lineWidth;

      if (key === selectedItemKey) {
        colorToDraw = 'red';
        if (item.type === 'line') {
          widthToDraw = item.lineWidth + 2; // Increase width for highlighting
        }
      }

      if (item.type === 'line') {
        drawLine(item.x1, item.y1, item.x2, item.y2, colorToDraw, widthToDraw);
      } else if (item.type === 'text') {
        if (key === selectedItemKey) {
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.strokeRect(item.x - 5, item.y - 25, ctx.measureText(item.text).width + 10, 35);
        }
        drawText(item.x, item.y, item.text, colorToDraw);
      }
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
  
  function addText(e) {
    const coords = getCanvasCoordinates(e);
    textInput.style.left = `${coords.x}px`;
    textInput.style.top = `${coords.y - 15}px`;
    textInput.xPos = coords.x;
    textInput.yPos = coords.y;
    textInput.style.display = 'block';
    textInput.focus();
  }

  function selectItem(e) {
    const coords = getCanvasCoordinates(e);
    let found = false;
    textInput.style.display = 'none'; // Hide input on new selection
    selectedItemKey = null;

    for (const key in allItems) {
      const item = allItems[key];
      if (item.type === 'line') {
        const dist = distToSegment(coords, {x: item.x1, y: item.y1}, {x: item.x2, y: item.y2});
        if (dist < 10) {
          selectedItemKey = key;
          deleteBtn.style.display = 'block';
          found = true;
          break;
        }
      } else if (item.type === 'text') {
        const textWidth = ctx.measureText(item.text).width;
        if (coords.x >= item.x && coords.x <= item.x + textWidth && coords.y >= item.y - 20 && coords.y <= item.y) {
          selectedItemKey = key;
          deleteBtn.style.display = 'block';
          textInput.style.left = `${item.x}px`;
          textInput.style.top = `${item.y - 15}px`;
          textInput.xPos = item.x;
          textInput.yPos = item.y;
          textInput.value = item.text;
          textInput.style.display = 'block';
          textInput.focus();
          found = true;
          break;
        }
      }
    }
    if (!found) {
      deleteBtn.style.display = 'none';
      selectedItemKey = null;
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

  // Listen for all items from Firebase and redraw the canvas
  onValue(roomRef, (snapshot) => {
    allItems = snapshot.val() || {};
    redrawCanvas();
  });
}
