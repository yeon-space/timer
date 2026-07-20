// --- DOM Elements ---
const mainTimeMinEl = document.getElementById('main-time-min');
const mainTimeSecEl = document.getElementById('main-time-sec');
const subTimeEl = document.getElementById('sub-time');
const btnStopwatch = document.getElementById('btn-stopwatch');
const btnTimer = document.getElementById('btn-timer');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');
const startBtnText = document.getElementById('start-btn-text');
const iconPlay = document.querySelector('.icon-play');
const iconPause = document.querySelector('.icon-pause');
const currentModeBadge = document.getElementById('current-mode-badge');
const soundToggle = document.getElementById('sound-toggle');
const soundSelButtons = document.querySelectorAll('.sound-sel-btn');
const presetButtons = document.querySelectorAll('.btn-orange');
const ledContainer = document.querySelector('.led-container');

// --- App State ---
let mode = 'stopwatch'; // 'stopwatch' or 'timer'
let isRunning = false;
let isAlarming = false; // State indicating if countdown is completed and alarm is actively ringing
let stopwatchTime = 0; // ms
let timerTime = 0; // ms
let lastTickTime = 0; // timestamp
let isMuted = false;
let alarmInterval = null;
let selectedSound = 1; // Default alarm sound type: 1

// --- Web Audio Synthesizer ---

// Tone generator helper
function beep(ctx, freq, startTime, duration, type = 'sine') {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  // Clean volume envelope
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
  gainNode.gain.setValueAtTime(0.18, startTime + duration - 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// Classical Music Synthesizer (Beethoven's Ode to Joy Snippet)
function playClassicalMelody(ctx, startTime) {
  const melody = [
    { f: 659.25, d: 0.16 }, // E5
    { f: 659.25, d: 0.16 }, // E5
    { f: 698.46, d: 0.16 }, // F5
    { f: 783.99, d: 0.26 }  // G5
  ];
  
  let time = startTime;
  melody.forEach(note => {
    beep(ctx, note.f, time, note.d - 0.02, 'sine');
    time += note.d + 0.04;
  });
}

// Bird Chirp Synthesizer (Upward pitch sweeps)
function birdChirp(ctx, startTime, duration) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1800, startTime);
  osc.frequency.exponentialRampToValueAtTime(3400, startTime + duration - 0.01);
  
  // Volume envelope
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playBirdChirps(ctx, startTime) {
  birdChirp(ctx, startTime, 0.07);
  birdChirp(ctx, startTime + 0.10, 0.07);
  birdChirp(ctx, startTime + 0.22, 0.11);
}

// Play selected alarm chime
function playAlarmBeep() {
  if (isMuted) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    switch (selectedSound) {
      case 1:
        beep(ctx, 987.77, now, 0.1, 'sine');
        beep(ctx, 987.77, now + 0.18, 0.1, 'sine');
        break;
      case 2:
        playClassicalMelody(ctx, now);
        break;
      case 3:
        beep(ctx, 523.25, now, 0.08, 'sine');
        beep(ctx, 659.25, now + 0.1, 0.08, 'sine');
        beep(ctx, 783.99, now + 0.2, 0.15, 'sine');
        break;
      case 4:
        playBirdChirps(ctx, now);
        break;
    }
  } catch (e) {
    console.warn("Audio Context failed to start:", e);
  }
}

// Quick chirp preview when user switches sound types
function playPreviewBeep() {
  if (isMuted) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    switch (selectedSound) {
      case 1:
        beep(ctx, 987.77, now, 0.08, 'sine');
        break;
      case 2:
        beep(ctx, 659.25, now, 0.12, 'sine');
        beep(ctx, 659.25, now + 0.15, 0.12, 'sine');
        break;
      case 3:
        beep(ctx, 523.25, now, 0.06, 'sine');
        beep(ctx, 659.25, now + 0.07, 0.1, 'sine');
        break;
      case 4:
        birdChirp(ctx, now, 0.1);
        break;
    }
  } catch (e) {
    console.warn(e);
  }
}

function startAlarm() {
  if (alarmInterval) return;
  ledContainer.classList.add('timer-expired');
  playAlarmBeep();
  alarmInterval = setInterval(playAlarmBeep, 1300);
}

function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  ledContainer.classList.remove('timer-expired');
}

// --- Time Formatting ---
function formatTime(totalMs) {
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((totalMs % 1000) / 10);
  
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  const cStr = String(centiseconds).padStart(2, '0');
  
  return {
    min: mStr,
    sec: sStr,
    sub: cStr
  };
}

// --- Render UI Display ---
function render() {
  const currentTime = (mode === 'stopwatch') ? stopwatchTime : timerTime;
  const formatted = formatTime(currentTime);
  
  mainTimeMinEl.textContent = formatted.min;
  mainTimeSecEl.textContent = formatted.sec;
  subTimeEl.textContent = formatted.sub;
}

// --- Precise Timer Loop ---
function tick(timestamp) {
  if (!lastTickTime) {
    lastTickTime = timestamp;
  }
  
  const dt = timestamp - lastTickTime;
  lastTickTime = timestamp;
  
  if (isRunning) {
    if (mode === 'stopwatch') {
      stopwatchTime += dt;
    } else if (mode === 'timer') {
      timerTime -= dt;
      if (timerTime <= 0) {
        timerTime = 0;
        isRunning = false;
        isAlarming = true; // Enter alarm state!
        updateControlsUI(); // UI will keep showing yellow "정지" button
        startAlarm();
      }
    }
    render();
  }
  
  requestAnimationFrame(tick);
}

// Initialize Loop
requestAnimationFrame((timestamp) => {
  lastTickTime = timestamp;
  requestAnimationFrame(tick);
});

// --- State Transitions ---

// Switch mode (Stopwatch / Timer)
function setMode(newMode) {
  if (mode === newMode) return;
  
  isRunning = false;
  isAlarming = false; // Silence alarm state on mode switch
  stopAlarm();
  
  mode = newMode;
  
  if (mode === 'stopwatch') {
    btnStopwatch.classList.add('active');
    btnTimer.classList.remove('active');
    currentModeBadge.textContent = 'STOPWATCH MODE';
    currentModeBadge.classList.remove('timer-active');
  } else {
    btnTimer.classList.add('active');
    btnStopwatch.classList.remove('active');
    currentModeBadge.textContent = 'TIMER MODE';
    currentModeBadge.classList.add('timer-active');
  }
  
  updateControlsUI();
  render();
}

// Toggle Play / Pause state / Dismiss Alarm
function togglePlayPause() {
  // If alarm is actively ringing, clicking "정지" silences it and resets to "시작"
  if (isAlarming) {
    stopAlarm();
    isAlarming = false;
    updateControlsUI();
    render();
    return;
  }

  // If timer is at zero and in timer mode, and we try to start, do not run
  if (mode === 'timer' && timerTime <= 0) {
    return;
  }
  
  stopAlarm();
  isRunning = !isRunning;
  lastTickTime = performance.now();
  
  updateControlsUI();
}

// Update Start Button (Active/Running/Alarming state turns it yellow-amber with text "정지")
function updateControlsUI() {
  if (isRunning || isAlarming) {
    btnStart.classList.add('running');
    startBtnText.textContent = '정지'; // Show "정지"
    iconPlay.style.display = 'none';
    iconPause.style.display = 'block';
    
    if (mode === 'stopwatch') {
      btnStopwatch.classList.add('running');
      btnTimer.classList.remove('running');
    } else {
      btnTimer.classList.add('running');
      btnStopwatch.classList.remove('running');
    }
  } else {
    btnStart.classList.remove('running');
    startBtnText.textContent = '시작'; // Revert to "시작"
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
    
    btnStopwatch.classList.remove('running');
    btnTimer.classList.remove('running');
  }
}

// Reset Times and UI
function reset() {
  isRunning = false;
  isAlarming = false;
  stopwatchTime = 0;
  timerTime = 0;
  stopAlarm();
  updateControlsUI();
  render();
}

// --- Event Listeners ---

// Mode Selectors
btnStopwatch.addEventListener('click', () => setMode('stopwatch'));
btnTimer.addEventListener('click', () => setMode('timer'));

// Action Button Clicks
btnStart.addEventListener('click', togglePlayPause);
btnReset.addEventListener('click', reset);

// Sound Toggle
soundToggle.addEventListener('click', () => {
  isMuted = !isMuted;
  soundToggle.classList.toggle('muted', isMuted);
  if (isMuted) {
    stopAlarm();
  }
});

// Sound Channel Picker
soundSelButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    soundSelButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSound = parseInt(btn.getAttribute('data-sound'), 10);
    playPreviewBeep(); // Audio preview chirp on selection
  });
});

// Orange Preset Buttons (Adding time to Timer)
presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.remove('clicked');
    void btn.offsetWidth;
    btn.classList.add('clicked');
    
    const secondsToAdd = parseInt(btn.getAttribute('data-seconds'), 10);
    const msToAdd = secondsToAdd * 1000;
    
    // Switch to Timer mode if not already there, or dismiss active alarm
    if (mode !== 'timer') {
      setMode('timer');
    } else {
      if (isAlarming) {
        stopAlarm();
        isAlarming = false;
        updateControlsUI();
      }
    }
    
    timerTime += msToAdd;
    render();
  });
});

// Initialize UI
render();
updateControlsUI();
