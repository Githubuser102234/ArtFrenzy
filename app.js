// Firebase configuration from previous steps
const firebaseConfig = { /* ... */ };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

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
  auth.signInWithEmailAndPassword(email, password)
    .catch(error => alert(error.message));
});

registerBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.createUserWithEmailAndPassword(email, password)
    .catch(error => alert(error.message));
});

signOutBtn.addEventListener('click', () => {
  auth.signOut();
});

// Main logic for handling authentication state changes
auth.onAuthStateChanged(user => {
  if (user) {
    // User is signed in. Show the canvas and sign out button.
    authContainer.style.display = 'none';
    canvas.style.display = 'block';
    signOutBtn.style.display = 'block';
    startDrawingApp();
  } else {
    // User is signed out. Show the auth form.
    authContainer.style.display = 'block';
    canvas.style.display = 'none';
    signOutBtn.style.display = 'none';
  }
});

// The drawing app logic, now wrapped in a function
function startDrawingApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('roomid') || Math.random().toString(36).substring(2, 9);
  if (urlParams.get('roomid') === null) {
      window.location.href = `/?roomid=${roomId}`;
  }
  
  const roomRef = database.ref('rooms/' + roomId);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mousemove', draw);

  function sendLine(x1, y1, x2, y2) {
    roomRef.push({
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

  roomRef.on('child_added', snapshot => {
    const line = snapshot.val();
    drawLine(line.x1, line.y1, line.x2, line.y2);
  });
}
