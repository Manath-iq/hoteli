import { cues } from './lyrics.js';
import { levels } from './waveform.js';

const video = document.querySelector('video');
const screen = document.querySelector('#screen');
const theater = document.querySelector('#theater');
const surface = document.querySelector('#surface');
const play = document.querySelector('#play');
const mute = document.querySelector('#mute');
const full = document.querySelector('#full');
const seek = document.querySelector('#seek');
const error = document.querySelector('#error');
let hideTimer;

const cover = document.querySelector('#cover');
const lyric = document.querySelector('#lyric');
const city = document.querySelector('#city');
const ocean = document.querySelector('#ocean');
const wave = document.querySelector('#wave');
const time = document.querySelector('#time');
const ctx = wave.getContext('2d');
const stampCues = new Set([3, 11, 21, 30, 35]);
let cueIndex = -1;
let started = false;
let animation = 0;

function formatTime(t) {
  return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
}

function renderWave() {
  const w = wave.width, h = wave.height;
  const progress = video.currentTime / (video.duration || 51.2);
  const bars = Math.min(levels.length, Math.max(1, Math.floor(wave.clientWidth / 4)));
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < bars; i++) {
    const height = h * .69 * levels[Math.floor(i * levels.length / bars)];
    ctx.fillStyle = i / bars < progress ? '#ff603b' : '#aaa99e';
    ctx.fillRect(i*w/bars, (h-height)/2, Math.max(1,w/bars*.54), height);
  }
}

new ResizeObserver(() => {
  const ratio = Math.min(devicePixelRatio, 2);
  wave.width = Math.round(wave.clientWidth * ratio);
  wave.height = Math.round(wave.clientHeight * ratio);
  renderWave();
}).observe(wave);

function renderScene() {
  const t = video.currentTime;
  const hasCue = started && !video.ended && t < 50.9;
  const index = hasCue ? cues.findLastIndex(cue => t >= cue[0]) : -1;
  cover.hidden = hasCue;
  lyric.hidden = !hasCue;
  if (index !== cueIndex) {
    cueIndex = index;
    lyric.replaceChildren();
    if (index >= 0) {
      const lead = document.createElement('span');
      lead.className = 'lead';
      lead.textContent = cues[index][2];
      const tail = document.createElement('span');
      tail.className = stampCues.has(index) ? 'tail stamp' : 'tail';
      tail.textContent = cues[index][3];
      lyric.append(lead, tail);
    }
  }
  if (hasCue) lyric.lastElementChild.classList.toggle('waiting', t < cues[index][1]);
  city.classList.toggle('visible', hasCue && t >= 18.02 && t < 19.86);
  ocean.classList.toggle('visible', hasCue && t >= 26.37 && t < 28.22);
}

function runScene() {
  renderScene();
  if (!video.paused && !video.ended) animation = requestAnimationFrame(runScene);
}

function revealControls() {
  screen.classList.remove('idle');
  clearTimeout(hideTimer);
  if (!video.paused) hideTimer = setTimeout(() => screen.classList.add('idle'), 1600);
}

function reflectPlayback() {
  const playing = !video.paused && !video.ended;
  const label = playing ? 'Пауза' : video.ended ? 'Смотреть заново' : 'Воспроизвести';
  if (playing) started = true;
  cancelAnimationFrame(animation);
  runScene();
  screen.classList.toggle('playing', playing);
  surface.setAttribute('aria-label', label);
  play.setAttribute('aria-label', label);
  revealControls();
}

function showError() {
  error.textContent = 'Не удалось воспроизвести видео. Попробуй запустить ещё раз.';
  error.hidden = false;
}

async function togglePlayback() {
  if (!video.paused && !video.ended) {
    video.pause();
    return;
  }
  try {
    if (video.error) video.load();
    if (video.ended) video.currentTime = 0;
    await video.play();
    error.hidden = true;
  } catch {
    showError();
  }
}

function updateProgress() {
  if (!Number.isFinite(video.duration)) return;
  seek.max = video.duration;
  seek.value = video.currentTime;
  time.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
  renderScene();
  renderWave();
  seek.setAttribute('aria-valuetext', Math.floor(video.currentTime) + ' секунд');
}

surface.onclick = play.onclick = togglePlayback;
for (const type of ['play', 'pause', 'ended']) video.addEventListener(type, reflectPlayback);
for (const type of ['loadedmetadata', 'timeupdate', 'seeked']) video.addEventListener(type, updateProgress);
video.addEventListener('error', showError);
seek.oninput = () => {
  started = true;
  video.currentTime = Number(seek.value);
  updateProgress();
  revealControls();
};
screen.addEventListener('pointermove', revealControls);
screen.addEventListener('focusin', revealControls);
mute.onclick = () => { video.muted = !video.muted; };
video.onvolumechange = () => {
  screen.classList.toggle('muted', video.muted);
  mute.setAttribute('aria-label', video.muted ? 'Включить звук' : 'Выключить звук');
  revealControls();
};

function syncFullscreen() {
  const expanded = document.fullscreenElement || theater.classList.contains('expanded');
  full.setAttribute('aria-label', expanded ? 'Выйти из полного экрана' : 'Полный экран');
  revealControls();
}
full.onclick = async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (document.fullscreenEnabled && theater.requestFullscreen) {
    try { await theater.requestFullscreen(); } catch { theater.classList.toggle('expanded'); }
  } else theater.classList.toggle('expanded');
  syncFullscreen();
};
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { theater.classList.remove('expanded'); syncFullscreen(); }
  if (event.code === 'Space' && !event.repeat && !event.target.closest('input,button')) {
    event.preventDefault();
    togglePlayback();
  }
});
