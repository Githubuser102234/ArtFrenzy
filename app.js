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
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const signOutBtn = document.getElementById('signOutBtn');
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');

let drawing = false;

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

// Main logic for handling authentication state changes
onAuthStateChanged(auth, user => {
  if (user) {
    authContainer.style.display = 'none';
    canvas.style.display = 'block';
    signOutBtn.style.display = 'block';
    startDrawingApp();
  } else {
    authContainer.style.display = 'flex';
    canvas.style.display = 'none';
    signOutBtn.style.display = 'none';
  }
});

// The drawing app logic
function startDrawingApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomid');

  if (!roomId) {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    window.location.href = `/?roomid=${newRoomId}`;
    return;
  }
  
  const roomRef = ref(database, 'rooms/' + roomId);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mousemove', draw);

  function sendLine(x1, y1, x2, y2) {
    push(roomRef, {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2
    });
  }

  function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function startDrawing(e) {
    drawing = true;
    const { clientX, clientY } = e;
    drawLine(clientX, clientY, clientX, clientY);
  }

  function stopDrawing() {
    drawing = false;
  }

  function draw(e) {
    if (!drawing) return;
    const { clientX, clientY } = e;
    const lastX = e.offsetX - e.movementX;
    const lastY = e.offsetY - e.movementY;
    sendLine(lastX, lastY, clientX, clientY);
    drawLine(lastX, lastY, clientX, clientY);
  }

  onChildAdded(roomRef, snapshot => {
    const line = snapshot.val();
    drawLine(line.x1, line.y1, line.x2, line.y2);
  });
}
