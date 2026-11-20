// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the editor with a sample photo loaded.
// window.__shotReady is set once the scene has painted.
//   ?shot=cover&size=wide|square|portrait&layout=trio|strip|duo|quad
//     &grade=sunset|neon|gold|noir|acid|frost
//     &panelGrade=neon&facesafe=1&capsize=60
//     &caption=...&subtitle=...&photo=pier|boulevard

export async function runShot(shot, query, state, helpers) {
  const { redraw, setStatus, loadImage, SAMPLES, refreshThumbs } = helpers;
  const photoId = query.get('photo') ?? 'pier';
  const sample = SAMPLES.find((s) => s.id === photoId) ?? SAMPLES[0];
  state.layout = query.get('layout') ?? state.layout;
  state.grade = query.get('grade') ?? state.grade;
  state.size = query.get('size') ?? state.size;
  state.title = query.get('caption') ?? state.title;
  state.subtitle = query.get('subtitle') ?? state.subtitle;
  state.tag = query.get('tag') ?? state.tag;
  state.faceSafe = query.get('facesafe') !== '0';
  state.captionSize = Number(query.get('capsize') ?? 1) / 100 || 1;
  const panelGrade = query.get('panelgrade');
  const panelGradeIndex = Math.max(0, Math.min(3, Number(query.get('panelgradeindex') ?? 0)));
  const img = await loadImage(sample.url);
  state.photos = [img, img, img];
  // Spread the sample across panels with clearly different crops: top of the
  // photo in the first panel, middle in the second, foot in the third.
  const count = state.layout === 'quad' ? 4 : 3;
  state.panels = [];
  for (let i = 0; i < count; i++) {
    const zoom = 1.1 + i * 0.06;
    const ox = [-0.04, 0.05, -0.03, 0.04][i % 4] ?? 0;
    const oy = [-0.22, 0.02, 0.35, -0.1][i % 4] ?? 0;
    const p = { photo: 0, zoom, ox, oy };
    if (panelGrade && i === panelGradeIndex) p.grade = panelGrade;
    state.panels.push(p);
  }
  if (refreshThumbs) refreshThumbs();
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
      b.classList.toggle('active', Number(b.dataset.panel) === panelGradeIndex);
    });
    const capVal = document.getElementById('capsize-val');
    if (capVal) capVal.textContent = `${Math.round(state.captionSize * 100)}%`;
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  redraw();
  setStatus(`Shot: ${shot} — ${state.layout} / ${state.grade} / ${state.size}, face-safe ${state.faceSafe ? 'on' : 'off'}.`);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
