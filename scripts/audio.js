// audio.js
let audioContext;

let textSound;
let isTextSoundPlaying = false;

let popSoundBuffer;
let bubbleSoundBuffer;
let snapSoundBuffer;
let bounceSoundBuffer;


let soundIsOn = localStorage.getItem('soundIsOn') !== 'false';

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  loadSounds();
}

async function loadSounds() {
    try {
        const pop = await fetch('./assets/pop.mp3');
        const snap = await fetch('./assets/snap.mp3');
        const bubble = await fetch('./assets/bubble.mp3');
        const bounce = await fetch('./assets/bounce.mp3');
      
        bubbleSoundBuffer = await audioContext.decodeAudioData(await bubble.arrayBuffer());
        popSoundBuffer = await audioContext.decodeAudioData(await pop.arrayBuffer());
        snapSoundBuffer= await audioContext.decodeAudioData(await snap.arrayBuffer());
        bounceSoundBuffer= await audioContext.decodeAudioData(await bounce.arrayBuffer());

      } catch (error) {
        console.error("Error loading sounds:", error);
      }
}

function playSound(buffer, loop = false) {
    if (!audioContext || !buffer) return;
        
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(audioContext.destination);
    source.start(0);
    return source;
}


function playPopSound() {
  if (textSound) stopTextSound();
  if (soundIsOn && popSoundBuffer) {
    playSound(popSoundBuffer);
  }
}

function playSnapSound() {
  if (textSound) stopTextSound();
  if (soundIsOn && snapSoundBuffer) {
    playSound(snapSoundBuffer);
  }
}

function playBubbleSound() {
  if (textSound) stopTextSound();
  if (soundIsOn && bubbleSoundBuffer) {
    playSound(bubbleSoundBuffer);
  }
}

function playBounceSound() {
  if (textSound) stopTextSound();
  if (soundIsOn && bounceSoundBuffer) {
    playSound(bounceSoundBuffer);
  }
}

function playTextSound() {
  if (soundIsOn && bounceSoundBuffer && !isTextSoundPlaying) {
      isTextSoundPlaying = true;
      textSound = playSound(bounceSoundBuffer, true);
    }
}

function stopTextSound() {
  if (textSound) {
      textSound.stop();
      textSound.disconnect();
      textSound = null;
    }
    isTextSoundPlaying = false;
}


function toggleSound() {
  soundIsOn = !soundIsOn;
  localStorage.setItem('soundIsOn', soundIsOn);
  if (soundIsOn) {
    initAudio();
  } else {
    cleanupSounds();
  }
  updateSpeakerIcon();
}

function updateSpeakerIcon() {
  const speakerIcon = document.getElementById('speaker-icon');
  speakerIcon.src = soundIsOn ? '../assets/speaker-on.png' : '../assets/speaker-off.png';
  speakerIcon.alt = soundIsOn ? 'Speaker On' : 'Speaker Off';
}

function cleanupSounds() {
  stopTextSound();
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}




export { initAudio, playBubbleSound,playBounceSound,stopTextSound,playTextSound ,playPopSound,playSnapSound, toggleSound, updateSpeakerIcon, cleanupSounds };