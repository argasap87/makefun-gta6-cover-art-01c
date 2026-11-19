/* V12 Neon Heist — editor wiring.
 * Loads photos from the user's machine (never uploaded), binds the layout /
 * grade / size / caption controls, keeps a live preview on canvas, and
 * exports the cover as a PNG at the exact post size. */

import { drawCover, GRADES, LAYOUTS, SIZES } from './cover.js';

const PREVIEW_W = 640;

const state = {
  layout: 'hero',
  grade: 'neon',
  size: 'square',
  title: 'GTA VI',
  tagline: '1 CAR. 1 LIGHT. 6 WAYS OUT.',
  badge: 'V12 NEON HEIST',
  photos: [null, null, null, null],
  panel: 0,
};

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');

function previewSize() {
  const size = SIZES[state.size];
  const scale = PREVIEW_W / size.w;
  return { w: PREVIEW_W, h: Math.round(size.h * scale) };
}

export function renderPreview() {
  const { w, h } = previewSize();
  canvas.width = w; canvas.height = h;
  drawCover(ctx, w, h, state);
  $('sizeNote').textContent = `${SIZES[state.size].label} · live preview`;
}

function loadImageFile(file, slot) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.photos[slot] = { img, zoom: 1, ox: 0, oy: 0, name: file.name };
      URL.revokeObjectURL(url);
      renderPreview();
      refreshPanelList();
      resolve();
    };
    img.onerror = () => reject(new Error('could not read ' + file.name));
    img.src = url;
  });
}

function loadSample(url, slot) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      state.photos[slot] = { img, zoom: 1, ox: 0, oy: 0, name: url.split('/').pop() };
      renderPreview();
      refreshPanelList();
      resolve();
    };
    img.onerror = () => reject(new Error('could not load sample'));
    img.src = url;
  });
}

export function loadSamples() {
  return Promise.all([
    loadSample('samples/boulevard.jpg', 0),
    loadSample('samples/pier.jpg', 1),
  ]);
}

function refreshPanelList() {
  const list = $('panelList');
  list.innerHTML = '';
  state.photos.forEach((p, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (state.panel === i ? ' active' : '');
    chip.textContent = `Panel ${i + 1}: ${p ? p.name : 'empty'}`;
    chip.addEventListener('click', () => {
      state.panel = i;
      syncPanelControls();
      refreshPanelList();
    });
    list.appendChild(chip);
  });
}

function syncPanelControls() {
  const p = state.photos[state.panel];
  $('zoom').value = p ? p.zoom : 1;
  $('posX').value = p ? p.ox : 0;
  $('posY').value = p ? p.oy : 0;
  $('zoomVal').textContent = `${Math.round(($('zoom').value) * 100)}%`;
  $('posXVal').textContent = $('posX').value;
  $('posYVal').textContent = $('posY').value;
}

function bindControls() {
  $('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 4);
    for (let i = 0; i < files.length; i++) {
      try { await loadImageFile(files[i], i); } catch (err) { console.warn(err); }
    }
    e.target.value = '';
  });
  $('sampleBtn').addEventListener('click', () => loadSamples());
  $('clearBtn').addEventListener('click', () => {
    state.photos = [null, null, null, null];
    renderPreview(); refreshPanelList();
  });

  document.querySelectorAll('input[name="layout"]').forEach((r) => {
    r.addEventListener('change', () => { state.layout = r.value; renderPreview(); });
  });
  document.querySelectorAll('input[name="grade"]').forEach((r) => {
    r.addEventListener('change', () => { state.grade = r.value; renderPreview(); });
  });
  document.querySelectorAll('input[name="size"]').forEach((r) => {
    r.addEventListener('change', () => { state.size = r.value; renderPreview(); });
  });

  $('titleInput').addEventListener('input', () => { state.title = $('titleInput').value || 'GTA VI'; renderPreview(); });
  $('tagInput').addEventListener('input', () => { state.tagline = $('tagInput').value; renderPreview(); });
  $('badgeInput').addEventListener('input', () => { state.badge = $('badgeInput').value; renderPreview(); });

  for (const id of ['zoom', 'posX', 'posY']) {
    $(id).addEventListener('input', () => {
      const p = state.photos[state.panel];
      if (!p) return;
      if (id === 'zoom') p.zoom = parseFloat($(id).value);
      if (id === 'posX') p.ox = parseFloat($(id).value);
      if (id === 'posY') p.oy = parseFloat($(id).value);
      syncPanelControls();
      renderPreview();
    });
  }

  $('exportBtn').addEventListener('click', exportPng);
  $('randomBtn').addEventListener('click', () => {
    const grades = Object.keys(GRADES);
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    document.querySelector(`input[name="grade"][value="${state.grade}"]`).checked = true;
    renderPreview();
  });
}

export function exportPng() {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `v12-neon-heist-${state.size}-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}

// Exposed for screenshots / automation: ?shot=cover|wide renders the hero at
// full export size into the preview canvas; ?sample=1 loads the samples.
function bootFromQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get('sample') === '1') loadSamples();
  const shot = q.get('shot');
  if (shot === 'cover' || shot === 'wide') {
    state.size = shot === 'wide' ? 'wide' : 'square';
    state.layout = 'hero';
    const size = SIZES[state.size];
    canvas.width = size.w; canvas.height = size.h;
    drawCover(ctx, size.w, size.h, state);
  }
}

bindControls();
refreshPanelList();
syncPanelControls();
renderPreview();
bootFromQuery();
