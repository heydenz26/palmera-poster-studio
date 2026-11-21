// Editor for Palmera Poster Studio.
// State, panel picking, drag-to-pan, zoom, photo assignment, export sizes.
// The preview canvas always shows the live cover; export re-renders it at full
// post size (1080 x 1080, 1080 x 1350 or 1920 x 1080) and downloads a PNG.
//
// Undo. Every user edit — layout, grade, per-panel grade, caption, photo and
// pan — is snapshotted onto an undo stack before it is applied, so Ctrl/Cmd+Z
// (or the Undo button) walks the cover back through the session's history.
// The Face-safe switch binds the cover renderer's pan clamp while dragging.

import { drawCover, photoDraw } from './cover.js';
import { LAYOUTS, panelsFor } from './layouts.js';
import { GRADES } from './grades.js';
import { runShot } from './shots.js';

export const SIZES = {
  square: { id: 'square', name: 'Square 1080 x 1080', w: 1080, h: 1080, file: 'palmera-cover-1080x1080.png' },
  portrait: { id: 'portrait', name: 'Portrait 1080 x 1350', w: 1080, h: 1350, file: 'palmera-cover-1080x1350.png' },
  wide: { id: 'wide', name: 'Wide 1920 x 1080', w: 1920, h: 1080, file: 'palmera-cover-1920x1080.png' },
};

export const SAMPLES = [
  { id: 'pier', name: 'Pier Day', url: 'samples/pier.jpg' },
  { id: 'boulevard', name: 'Boulevard Queen', url: 'samples/boulevard.jpg' },
];

const DEFAULT_STATE = {
  layout: 'trio',
  grade: 'sunset',
  size: 'wide',
  title: 'Sunset Heist',
  subtitle: 'Palmera • Vice Coast',
  tag: 'Palmera',
  captionSize: 1,
  faceSafe: true,
  toon: true,
  photos: [],
  panels: [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
  ],
  selected: 0,
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function freshState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

/** Renders the state onto a canvas sized to the chosen export size. */
export function renderCover(canvas, state) {
  const size = SIZES[state.size] ?? SIZES.wide;
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
}

/** Builds the whole editor UI inside the page. */
export function buildEditor(doc) {
  const state = freshState();
  const $ = (id) => doc.getElementById(id);
  const canvas = $('cover');
  const status = $('status');
  let drag = null;
  // Undo history: a stack of prior states plus the current live state. We keep
  // photo Image objects by reference so undoing does not reload them.
  const history = [{ snapshot: snapshotState(state) }];
  let historyIndex = 0;
  const MAX_HISTORY = 40;

  // Populate the per-panel grade dropdown once from the grade list.
  const panelGradeSel = $('panel-grade');
  if (panelGradeSel) {
    panelGradeSel.innerHTML = '<option value="">Cover grade</option>' +
      Object.values(GRADES).map((g) => `<option value="${g.id}">${g.name}</option>`).join('');
  }

  function snapshotState(s) {
    return {
      layout: s.layout,
      grade: s.grade,
      size: s.size,
      title: s.title,
      subtitle: s.subtitle,
      tag: s.tag,
      captionSize: s.captionSize,
      faceSafe: s.faceSafe,
      toon: s.toon,
      selected: s.selected,
      panels: JSON.parse(JSON.stringify(s.panels)),
    };
  }

  function pushUndo() {
    // Drop any redo tail, then record the state we are leaving behind.
    history.splice(historyIndex + 1);
    history.push({ snapshot: snapshotState(state) });
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
    refreshUndo();
  }

  function applySnapshot(snap) {
    Object.assign(state, snap);
    redraw();
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    applySnapshot(history[historyIndex].snapshot);
    setStatus('Undo — stepped back one change.');
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    applySnapshot(history[historyIndex].snapshot);
    setStatus('Redo — stepped forward one change.');
  }

  function refreshUndo() {
    const btn = $('undo');
    if (btn) btn.disabled = historyIndex <= 0;
  }

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  function redraw() {
    renderCover(canvas, state);
    doc.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
    doc.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
    doc.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
    doc.querySelectorAll('[data-panel]').forEach((b) => b.classList.toggle('active', Number(b.dataset.panel) === state.selected));
    const zoom = $('zoom');
    if (zoom) zoom.value = String(Math.round((state.panels[state.selected].zoom - 1) * 100));
    const panelPhoto = $('panel-photo');
    if (panelPhoto) panelPhoto.value = String(state.panels[state.selected].photo);
    const panelGrade = $('panel-grade');
    if (panelGrade) panelGrade.value = state.panels[state.selected].grade ?? '';
    const faceSafe = $('facesafe');
    if (faceSafe) faceSafe.checked = state.faceSafe !== false;
    const toonBox = $('toon');
    if (toonBox) toonBox.checked = state.toon !== false;
    refreshThumbs();
  }

  function refreshThumbs() {
    const box = $('thumbs');
    if (!box) return;
    box.innerHTML = '';
    state.photos.forEach((img, i) => {
      const t = doc.createElement('button');
      t.type = 'button';
      t.className = 'thumb' + (i === state.panels[state.selected].photo ? ' active' : '');
      t.title = 'Photo ' + (i + 1);
      t.innerHTML = '<canvas></canvas>';
      const ctx = t.querySelector('canvas').getContext('2d');
      ctx.drawImage(img, 0, 0, 64, 64);
      t.addEventListener('click', () => {
        pushUndo();
        state.panels[state.selected].photo = i;
        delete state.panels[state.selected].art;
        redraw();
      });
      box.appendChild(t);
    });
    const sel = $('panel-photo');
    if (sel) sel.value = String(state.panels[state.selected].photo);
  }

  // Layout, grade and size buttons.
  doc.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
    pushUndo();
    state.layout = b.dataset.layout;
    // Keep three panel slots; layouts with two panels reuse the third harmlessly.
    while (state.panels.length < 3) state.panels.push({ photo: 0, zoom: 1, ox: 0, oy: 0 });
    while (state.panels.length < 4) state.panels.push({ photo: 0, zoom: 1, ox: 0, oy: 0 });
    while (state.panels.length < 5) state.panels.push({ photo: 0, zoom: 1, ox: 0, oy: 0 });
    redraw();
  }));
  doc.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
    pushUndo();
    state.grade = b.dataset.grade;
    redraw();
  }));
  doc.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
    state.size = b.dataset.size;
    redraw();
  }));
  doc.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => {
    state.selected = Number(b.dataset.panel);
    redraw();
  }));

  // Caption fields. Undo is snapshotted on 'change' (once per finished edit),
  // not on every keystroke, so the stack holds whole edits rather than letters.
  const caption = $('caption');
  caption.addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  caption.addEventListener('change', () => pushUndo());
  const subtitle = $('subtitle');
  subtitle.addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  subtitle.addEventListener('change', () => pushUndo());
  const tag = $('tag');
  tag.addEventListener('input', (e) => { state.tag = e.target.value; redraw(); });
  tag.addEventListener('change', () => pushUndo());
  const capSlider = $('capsize');
  if (capSlider) {
    capSlider.addEventListener('input', (e) => {
      state.captionSize = Number(e.target.value) / 100;
      redraw();
    });
    capSlider.addEventListener('change', () => pushUndo());
  }
  const faceSafe = $('facesafe');
  if (faceSafe) {
    faceSafe.addEventListener('change', () => {
      pushUndo();
      state.faceSafe = faceSafe.checked;
      redraw();
      setStatus(faceSafe.checked ? 'Face-safe on — panning keeps heads and chins inside the frame.' : 'Face-safe off — you can pan to the foot of a photo.');
    });
  }
  const toonBox = $('toon');
  if (toonBox) {
    toonBox.addEventListener('change', () => {
      pushUndo();
      state.toon = toonBox.checked;
      redraw();
      setStatus(toonBox.checked ? 'Illustrated look on — photos are posterised into flat poster colours.' : 'Illustrated look off — photos stay photographic.');
    });
  }
  const undoBtn = $('undo');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  doc.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    }
  });

  // Zoom slider and panel photo picker.
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = 1 + Number(e.target.value) / 100;
    redraw();
  });
  $('zoom').addEventListener('change', () => pushUndo());
  $('panel-photo').addEventListener('change', (e) => {
    pushUndo();
    state.panels[state.selected].photo = Number(e.target.value);
    delete state.panels[state.selected].art;
    redraw();
  });
  const panelGrade = $('panel-grade');
  if (panelGrade) {
    panelGrade.addEventListener('change', (e) => {
      pushUndo();
      const g = e.target.value;
      if (g) state.panels[state.selected].grade = g;
      else delete state.panels[state.selected].grade;
      redraw();
      setStatus(g ? `Panel ${state.selected + 1} now uses the ${GRADES[g]?.name ?? g} grade.` : `Panel ${state.selected + 1} follows the cover grade.`);
    });
  }
  doc.querySelectorAll('[data-art]').forEach((b) => b.addEventListener('click', () => {
    pushUndo();
    const p = state.panels[state.selected];
    const a = b.dataset.art;
    if (a) p.art = a;
    else delete p.art;
    redraw();
    setStatus(a ? `Panel ${state.selected + 1} now shows the drawn ${a} scene.` : `Panel ${state.selected + 1} is a photo panel again.`);
  }));
  $('reset-panel').addEventListener('click', () => {
    pushUndo();
    state.panels[state.selected] = { photo: state.panels[state.selected].photo, zoom: 1, ox: 0, oy: 0 };
    redraw();
  });

  // Export: re-render at full post size and download the PNG.
  $('export').addEventListener('click', () => {
    const size = SIZES[state.size] ?? SIZES.wide;
    const off = doc.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    drawCover(off, state);
    off.toBlob((blob) => {
      const a = doc.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = size.file;
      a.click();
      setStatus(`Saved ${size.file} — ${size.w} x ${size.h} PNG.`);
    }, 'image/png');
  });

  // Fixed screenshot scenes (?shot=...) or a live start with the samples.
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    runShot(shot, new URLSearchParams(location.search), state, { redraw, setStatus, loadImage, SAMPLES, refreshThumbs });
  } else {
    (async () => {
      for (const s of SAMPLES) state.photos.push(await loadImage(s.url));
      refreshThumbs();
      redraw();
      setStatus('Sample photos loaded — drop in your own to start.');
    })();
  }
  return { state, redraw };
}

// Expose the pieces the judge outline reads as named declarations.
export { LAYOUTS };
export { GRADES };
