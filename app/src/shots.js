// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the editor with sample photos loaded.
// window.__shotReady is set once the scene has painted.
//   ?shot=cover&size=wide|square|portrait&layout=collage
//     &grade=sunset|neon|gold|noir|acid|frost
//     &caption=...&subtitle=...&photo=pier|boulevard
//     &toon=1|0  (posterise photos via state.toon)
//     &panels=art:skyline,photo:1@neon,art:boat,photo:0,art:car  (comma-separated tokens:
//       art:skyline|art:car|art:boat  or  photo:<index>[@<gradeId>] )
// If `panels` is absent, default mix is used: art:skyline,photo:0,art:car,photo:1,art:boat
// Legacy panelgrade/panelgradeindex still override per-panel grades afterwards.

import { panelsFor } from './layouts.js';

export async function runShot(shot, query, state, helpers) {
  const { redraw, setStatus, loadImage, SAMPLES, refreshThumbs } = helpers;

  // Size map
  const SIZES = { wide: [1920, 1080], square: [1080, 1080], portrait: [1080, 1350] };

  // Apply query params to state
  state.layout = query.get('layout') ?? state.layout;
  state.grade = query.get('grade') ?? state.grade;
  state.size = query.get('size') ?? state.size;
  state.title = query.get('caption') ?? state.title;
  state.subtitle = query.get('subtitle') ?? state.subtitle;
  state.tag = query.get('tag') ?? state.tag;
  state.faceSafe = query.get('facesafe') !== '0';
  state.captionSize = Number(query.get('capsize') ?? 1) / 100 || 1;
  state.toon = query.get('toon') !== '0';

  // Load BOTH samples: photos[0] = pier, photos[1] = boulevard
  const pierImg = await loadImage(SAMPLES[0].url);
  const boulevardImg = await loadImage(SAMPLES[1].url);
  state.photos = [pierImg, boulevardImg];

  // If `photo` query names a sample id, put that sample first
  const photoId = query.get('photo');
  if (photoId) {
    const idx = SAMPLES.findIndex(s => s.id === photoId);
    if (idx === 1) {
      // boulevard first
      state.photos = [boulevardImg, pierImg];
    }
  }

  // Determine panel count from layout at current size
  const [W, H] = SIZES[state.size] ?? SIZES.wide;
  const panelCount = panelsFor(state.layout, W, H).length;

  // Parse panels query param or use default mix
  let tokens = query.get('panels');
  if (!tokens) {
    tokens = 'art:skyline,photo:0,art:car,photo:1,art:boat';
  }
  const tokenList = tokens.split(',').map(t => t.trim()).filter(t => t);

  // Build state.panels by cycling token list to panelCount
  state.panels = [];
  const legacyPanelGrade = query.get('panelgrade');
  const legacyPanelGradeIndex = Math.max(0, Math.min(panelCount - 1, Number(query.get('panelgradeindex') ?? 0)));

  for (let i = 0; i < panelCount; i++) {
    const token = tokenList[i % tokenList.length];
    const zoom = 1.1 + i * 0.06;
    const ox = [-0.04, 0.05, -0.03, 0.04][i % 4] ?? 0;
    const oy = [-0.22, 0.02, 0.35, -0.1][i % 4] ?? 0;

    // Parse token: art:skyline|art:car|art:boat  or  photo:<index>[@<grade>]
    const [type, rest] = token.split(':');
    let panel;
    if (type === 'art') {
      panel = { photo: 0, art: rest, zoom: 1, ox: 0, oy: 0 };
    } else if (type === 'photo') {
      const [idxStr, grade] = rest.split('@');
      const photoIdx = Math.max(0, Math.min(1, Number(idxStr) ?? 0));
      panel = { photo: photoIdx, zoom, ox, oy };
      if (grade) panel.grade = grade;
    } else {
      // fallback: treat as photo:0
      panel = { photo: 0, zoom, ox, oy };
    }

    // Legacy panelgrade/panelgradeindex override
    if (legacyPanelGrade && i === legacyPanelGradeIndex) {
      panel.grade = legacyPanelGrade;
    }

    state.panels.push(panel);
  }

  if (refreshThumbs) refreshThumbs();

  // Sync form inputs
  const captionInput = document.getElementById('caption');
  if (captionInput) captionInput.value = state.title;
  const subtitleInput = document.getElementById('subtitle');
  if (subtitleInput) subtitleInput.value = state.subtitle;
  const tagInput = document.getElementById('tag');
  if (tagInput) tagInput.value = state.tag;
  const capSlider = document.getElementById('capsize');
  if (capSlider) capSlider.value = String(Math.round(state.captionSize * 100));
  const faceSwitch = document.getElementById('facesafe');
  if (faceSwitch) faceSwitch.checked = state.faceSafe !== false;

  // In the editor scene, highlight the panel whose per-panel grade is overridden
  // and reflect the caption-size readout so the screenshot matches the state.
  if (shot === 'editor') {
    document.querySelectorAll('[data-panel]').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.panel) === legacyPanelGradeIndex);
    });
    const capVal = document.getElementById('capsize-val');
    if (capVal) capVal.textContent = `${Math.round(state.captionSize * 100)}%`;
  }

  if (shot === 'cover') document.body.classList.add('shot-cover');

  redraw();
  setStatus(`Shot: ${shot} — ${state.layout} / ${state.grade} / ${state.size}, face-safe ${state.faceSafe ? 'on' : 'off'}.`);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
