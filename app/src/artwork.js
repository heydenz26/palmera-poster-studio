// Vector artwork for Palmera Poster Studio.
// Fully deterministic, code-drawn scenes — no images, no randomness.
// All coordinates scale from the panel rect (u = rect.w/100, v = rect.h/100).

/** Builds a vertical gradient from colour stops [{offset, color}, ...]. */
function makeSkyGradient(ctx, rect, stops) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  stops.forEach(s => grad.addColorStop(s.offset, s.color));
  return grad;
}

/** Draws a sun disc with two thin horizontal slit cuts near its bottom. */
function drawSun(ctx, cx, cy, radius, fill, slitColor) {
  ctx.save();
  // Main disc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();

  // Two horizontal slits across lower third of sun
  const slitY1 = cy + radius * 0.38;
  const slitY2 = cy + radius * 0.55;
  const slitHalfW = radius * 0.85;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = slitColor || '#000';
  // Slit 1
  ctx.beginPath();
  ctx.rect(cx - slitHalfW, slitY1 - 1, slitHalfW * 2, 2);
  ctx.fill();
  // Slit 2
  ctx.beginPath();
  ctx.rect(cx - slitHalfW, slitY2 - 1, slitHalfW * 2, 2);
  ctx.fill();
  ctx.restore();
}

/** Draws a palm silhouette at (px, py, scale, flip). Trunk + 6-7 arcing fronds. */
function drawPalm(ctx, px, py, scale = 1, flip = false) {
  ctx.save();
  ctx.translate(px, py);
  if (flip) ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#170a26';

  // Trunk — curved with quadratic curves, tapering upward
  ctx.beginPath();
  const trunkBaseW = 4;
  const trunkTopW = 2;
  const trunkH = -80;
  ctx.moveTo(-trunkBaseW, 0);
  ctx.quadraticCurveTo(-trunkBaseW * 0.5, trunkH * 0.3, -trunkTopW, trunkH);
  ctx.quadraticCurveTo(-trunkTopW * 0.5, trunkH * 0.7, -trunkTopW * 0.3, trunkH * 1.05);
  ctx.quadraticCurveTo(0, trunkH * 1.1, trunkTopW * 0.3, trunkH * 1.05);
  ctx.quadraticCurveTo(trunkTopW * 0.5, trunkH * 0.7, trunkTopW, trunkH);
  ctx.quadraticCurveTo(trunkBaseW * 0.5, trunkH * 0.3, trunkBaseW, 0);
  ctx.closePath();
  ctx.fill();

  // Fronds — 7 arcing leaves fanning from trunk top
  const frondCount = 7;
  const frondLen = 55;
  for (let i = 0; i < frondCount; i++) {
    const angle = -Math.PI / 2 + (i / (frondCount - 1)) * Math.PI * 0.7 - Math.PI * 0.35;
    const cx = Math.cos(angle) * 2;
    const cy = Math.sin(angle) * 2 + trunkH * 1.05;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    // Quadratic curve for the frond spine
    const ctrlX = cx + Math.cos(angle) * frondLen * 0.4;
    const ctrlY = cy + Math.sin(angle) * frondLen * 0.4;
    const endX = cx + Math.cos(angle) * frondLen;
    const endY = cy + Math.sin(angle) * frondLen;
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    // Return along other edge (slightly offset)
    const ctrlX2 = cx + Math.cos(angle + 0.15) * frondLen * 0.4;
    const ctrlY2 = cy + Math.sin(angle + 0.15) * frondLen * 0.4;
    const endX2 = cx + Math.cos(angle + 0.15) * frondLen * 0.95;
    const endY2 = cy + Math.sin(angle + 0.15) * frondLen * 0.95;
    ctx.quadraticCurveTo(ctrlX2, ctrlY2, endX2, endY2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Draws a simple cloud blob from overlapping ellipses, soft white. */
function drawCloud(ctx, cx, cy, scale = 1, alpha = 0.7) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale * 0.6);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  // 5 overlapping ellipses
  const lobes = [
    { x: -25, y: 0, rx: 22, ry: 14 },
    { x: 0, y: -5, rx: 28, ry: 18 },
    { x: 25, y: 0, rx: 22, ry: 14 },
    { x: -10, y: 8, rx: 16, ry: 10 },
    { x: 10, y: 8, rx: 16, ry: 10 },
  ];
  lobes.forEach(l => {
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

/** Scene: Vice Skyline at sunset */
function drawSkyline(ctx, rect) {
  const u = rect.w / 100;
  const v = rect.h / 100;
  const x = rect.x;
  const y = rect.y;

  // Sky gradient
  const skyStops = [
    { offset: 0, color: '#3b1470' },
    { offset: 0.45, color: '#a02080' },
    { offset: 0.70, color: '#ff2e88' },
    { offset: 1, color: '#ff9a3d' },
  ];
  ctx.fillStyle = makeSkyGradient(ctx, rect, skyStops);
  ctx.fillRect(x, y, rect.w, rect.h);

  // Sun — big disc centred at (50u, 58v), radius 17u
  drawSun(ctx, x + 50 * u, y + 58 * v, 17 * u, '#ffd76a', '#3b1470');

  // Skyline silhouette — row of dark rectangles along y=62v baseline
  ctx.fillStyle = '#1a0b2e';
  const baselineY = y + 62 * v;
  const buildings = [
    { x: 0, w: 8, h: 38 },
    { x: 8, w: 12, h: 28 },
    { x: 20, w: 10, h: 42 },
    { x: 30, w: 7, h: 22 },
    { x: 37, w: 15, h: 35 },
    { x: 52, w: 9, h: 18 },
    { x: 61, w: 11, h: 40 },
    { x: 72, w: 8, h: 25 },
    { x: 80, w: 10, h: 30 },
    { x: 90, w: 10, h: 20 },
  ];
  buildings.forEach(b => {
    ctx.fillRect(x + b.x * u, baselineY - b.h * v, b.w * u, b.h * v);
  });

  // Lit windows — ~40 tiny rectangles at random-ish positions per building
  ctx.fillStyle = '#ffd76a';
  buildings.forEach((b, bi) => {
    const bx = x + b.x * u;
    const by = baselineY - b.h * v;
    const bw = b.w * u;
    const bh = b.h * v;
    const cols = Math.max(1, Math.floor(bw / (6 * u)));
    const rows = Math.max(1, Math.floor(bh / (6 * v)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((bi * 17 + r * 7 + c * 3) % 3 === 0) {
          ctx.fillRect(bx + c * 6 * u + 2 * u, by + r * 6 * v + 2 * v, 3 * u, 3 * v);
        }
      }
    }
  });
}

/** Scene: Muscle Car in neon */
function drawCar(ctx, rect) {
  const u = rect.w / 100;
  const v = rect.h / 100;
  const x = rect.x;
  const y = rect.y;

  // Sky gradient dark
  const skyStops = [
    { offset: 0, color: '#1a0a2e' },
    { offset: 0.6, color: '#2d1047' },
    { offset: 1, color: '#0f0517' },
  ];
  ctx.fillStyle = makeSkyGradient(ctx, rect, skyStops);
  ctx.fillRect(x, y, rect.w, rect.h);

  // Ground strip
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(x, y + 70 * v, rect.w, rect.h - 70 * v);

  // Neon glow lines behind car
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 3 * u;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(x + 10 * u, y + 75 * v);
  ctx.lineTo(x + 90 * u, y + 75 * v);
  ctx.stroke();
  ctx.strokeStyle = '#ff2e88';
  ctx.beginPath();
  ctx.moveTo(x + 10 * u, y + 85 * v);
  ctx.lineTo(x + 90 * u, y + 85 * v);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Car centered at (50u, 75v), facing right
  const carX = x + 50 * u;
  const carY = y + 75 * v;
  const carW = 52 * u;
  const carH = 18 * v;

  ctx.save();
  ctx.translate(carX, carY);

  // Body — long low wedge, pointed nose right, squared tail left
  ctx.beginPath();
  // Bottom line left to right
  ctx.moveTo(-carW / 2, carH / 2);
  ctx.lineTo(carW / 2 * 0.85, carH / 2);
  // Nose curve up
  ctx.quadraticCurveTo(carW / 2, carH / 2 * 0.5, carW / 2, -carH / 2 * 0.2);
  // Hood line back
  ctx.lineTo(-carW / 2 * 0.2, -carH / 2 * 0.8);
  // Roof line
  ctx.lineTo(-carW / 2 * 0.55, -carH / 2 * 0.85);
  // Rear window down
  ctx.lineTo(-carW / 2 * 0.8, -carH / 2 * 0.1);
  // Tail vertical
  ctx.lineTo(-carW / 2, carH / 2 * 0.1);
  ctx.closePath();

  // Body fill — deep red
  ctx.fillStyle = '#8b1538';
  ctx.fill();
  // Cyan accent stripe along side
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(-carW / 2, -carH / 2 * 0.3, carW, 4 * v);
  ctx.restore();
  // Dark outline
  ctx.strokeStyle = '#170a26';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Windows (black)
  ctx.fillStyle = '#0a0a12';
  // Windshield
  ctx.beginPath();
  ctx.moveTo(-carW / 2 * 0.35, -carH / 2 * 0.75);
  ctx.lineTo(carW / 2 * 0.15, -carH / 2 * 0.95);
  ctx.lineTo(carW / 2 * 0.05, -carH / 2 * 0.5);
  ctx.lineTo(-carW / 2 * 0.4, -carH / 2 * 0.45);
  ctx.closePath();
  ctx.fill();
  // Side window
  ctx.beginPath();
  ctx.moveTo(-carW / 2 * 0.4, -carH / 2 * 0.45);
  ctx.lineTo(-carW / 2 * 0.05, -carH / 2 * 0.5);
  ctx.lineTo(-carW / 2 * 0.1, -carH / 2 * 0.1);
  ctx.lineTo(-carW / 2 * 0.7, -carH / 2 * 0.1);
  ctx.closePath();
  ctx.fill();
  // Rear window
  ctx.beginPath();
  ctx.moveTo(-carW / 2 * 0.7, -carH / 2 * 0.1);
  ctx.lineTo(-carW / 2 * 0.9, -carH / 2 * 0.3);
  ctx.lineTo(-carW / 2, -carH / 2 * 0.2);
  ctx.lineTo(-carW / 2, -carH / 2 * 0.05);
  ctx.closePath();
  ctx.fill();

  // Wheels — two dark circles with hub circles
  const wheelR = 5.2 * u;
  const wheelY = carH / 2 - 2 * v;
  // Rear wheel
  ctx.beginPath();
  ctx.arc(-carW / 2 + 10 * u, wheelY, wheelR, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a12';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-carW / 2 + 10 * u, wheelY, wheelR * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#cfd6e4';
  ctx.fill();
  // Front wheel
  ctx.beginPath();
  ctx.arc(carW / 2 - 10 * u, wheelY, wheelR, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a12';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(carW / 2 - 10 * u, wheelY, wheelR * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#cfd6e4';
  ctx.fill();

  // Headlight at nose — small circle + translucent beam triangle to right edge
  ctx.beginPath();
  ctx.arc(carW / 2 * 0.75, -carH / 2 * 0.3, 1.5 * u, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6c9';
  ctx.fill();
  // Beam
  ctx.beginPath();
  ctx.moveTo(carW / 2 * 0.8, -carH / 2 * 0.3);
  ctx.lineTo(carW / 2 * 1.5, -carH / 2 * 0.5);
  ctx.lineTo(carW / 2 * 1.5, -carH / 2 * 0.1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 246, 201, 0.15)';
  ctx.fill();

  // Cyan underglow ellipse beneath body
  ctx.beginPath();
  ctx.ellipse(0, carH / 2 + 2 * v, carW * 0.45, 4 * v, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
  ctx.fill();

  ctx.restore();
}

/** Scene: Turquoise sea day with speedboat */
function drawBoat(ctx, rect) {
  const u = rect.w / 100;
  const v = rect.h / 100;
  const x = rect.x;
  const y = rect.y;

  // Sky top 42%: gradient #8ed8ff -> #e8fbff
  const skyStops = [
    { offset: 0, color: '#8ed8ff' },
    { offset: 1, color: '#e8fbff' },
  ];
  ctx.fillStyle = makeSkyGradient(ctx, { x, y, w: rect.w, h: rect.h * 0.42 }, skyStops);
  ctx.fillRect(x, y, rect.w, rect.h * 0.42);

  // Sun top-right (86u, 14v) radius 7u #fff3b0 with 8 short rays
  const sunX = x + 86 * u;
  const sunY = y + 14 * v;
  const sunR = 7 * u;
  // Rays
  ctx.strokeStyle = 'rgba(255, 243, 176, 0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = sunX + Math.cos(angle) * (sunR + 4 * u);
    const y1 = sunY + Math.sin(angle) * (sunR + 4 * u);
    const x2 = sunX + Math.cos(angle) * (sunR + 12 * u);
    const y2 = sunY + Math.sin(angle) * (sunR + 12 * u);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // Sun disc
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3b0';
  ctx.fill();

  // Two cloud blobs
  drawCloud(ctx, x + 20 * u, y + 10 * v, 1.2, 0.6);
  drawCloud(ctx, x + 60 * u, y + 18 * v, 1.0, 0.5);

  // Distant island left: dark teal silhouette hump with TOP at sea line (42v)
  const islandX = x + 18 * u;
  const islandTopY = y + 42 * v; // island top exactly at sea line
  ctx.fillStyle = '#0a4d5e';
  ctx.beginPath();
  ctx.moveTo(islandX - 15 * u, islandTopY + 5 * v); // left base slightly below sea
  ctx.quadraticCurveTo(islandX, islandTopY - 18 * v, islandX + 12 * u, islandTopY); // hump peak at sea line
  ctx.lineTo(islandX + 12 * u, islandTopY + 5 * v);
  ctx.lineTo(islandX - 15 * u, islandTopY + 5 * v);
  ctx.closePath();
  ctx.fill();

  // Lighthouse ON the island's highest point (base at island top, tower rising into sky)
  const lhX = islandX;
  const lhBaseY = islandTopY - 18 * v; // base at island peak
  // Tower
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(lhX - 1.5 * u, lhBaseY - 22 * v, 3 * u, 22 * v);
  // Two red bands
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(lhX - 1.5 * u, lhBaseY - 18 * v, 3 * u, 2 * v);
  ctx.fillRect(lhX - 1.5 * u, lhBaseY - 8 * v, 3 * u, 2 * v);
  // Lantern room
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(lhX - 2.5 * u, lhBaseY - 26 * v, 5 * u, 4 * v);
  // Tiny light at top
  ctx.beginPath();
  ctx.arc(lhX, lhBaseY - 27 * v, 1.2 * u, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3b0';
  ctx.fill();

  // Sea from 42v: gradient #12b5cb -> #0a7d99
  const seaGrad = ctx.createLinearGradient(x, y + 42 * v, x, y + rect.h);
  seaGrad.addColorStop(0, '#12b5cb');
  seaGrad.addColorStop(1, '#0a7d99');
  ctx.fillStyle = seaGrad;
  ctx.fillRect(x, y + 42 * v, rect.w, rect.h - 42 * v);

  // White wave dashes scattered (fixed positions, alpha .6)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  const waveDashes = [
    { x: 10, y: 50 }, { x: 30, y: 52 }, { x: 50, y: 48 }, { x: 70, y: 51 }, { x: 90, y: 49 },
    { x: 15, y: 58 }, { x: 35, y: 60 }, { x: 55, y: 56 }, { x: 75, y: 59 }, { x: 95, y: 57 },
    { x: 5, y: 66 }, { x: 25, y: 68 }, { x: 45, y: 64 }, { x: 65, y: 67 }, { x: 85, y: 65 },
    { x: 12, y: 74 }, { x: 32, y: 76 }, { x: 52, y: 72 }, { x: 72, y: 75 }, { x: 92, y: 73 },
    { x: 8, y: 82 }, { x: 28, y: 84 }, { x: 48, y: 80 }, { x: 68, y: 83 }, { x: 88, y: 81 },
  ];
  waveDashes.forEach(w => {
    ctx.fillRect(x + w.x * u, y + w.y * v, 5 * u, 1.2 * v);
  });

  // Speedboat centred around (50u, 60v), length ~54u, facing RIGHT
  const boatX = x + 50 * u;
  const boatY = y + 60 * v;
  const boatL = 54 * u;

  ctx.save();
  ctx.translate(boatX, boatY);

  // Hull path — side profile speedboat facing right
  // Stern (left) is flat, bow (right) is pointed and rises slightly
  ctx.beginPath();
  // Keel line (bottom of hull) - sits in water at y=0
  ctx.moveTo(-boatL / 2, 0);           // stern bottom
  ctx.lineTo(-boatL / 2 + 8 * u, -2 * v);  // slight rise from stern
  ctx.lineTo(boatL / 2 - 10 * u, -2 * v);  // run along bottom
  ctx.lineTo(boatL / 2, -6 * v);       // pointed bow rising
  // Chine / upper hull line
  ctx.lineTo(boatL / 2 - 4 * u, -14 * v); // top of bow
  ctx.lineTo(-boatL / 2 + 4 * u, -14 * v); // top deck line back to stern
  ctx.closePath();

  // Hull fill white
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // Teal stripe along hull (clipped to hull)
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#0a7d99';
  ctx.fillRect(-boatL / 2, -14 * v, boatL, 8 * v);
  ctx.restore();
  // Dark outline
  ctx.strokeStyle = '#0a3d4d';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Soft white foam ellipse under hull (at waterline)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 2 * v, boatL * 0.35, 4 * v, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark windshield wedge (open cockpit)
  ctx.fillStyle = '#17324a';
  ctx.beginPath();
  ctx.moveTo(-boatL / 2 + 12 * u, -14 * v);  // base of windshield at deck
  ctx.lineTo(-boatL / 2 + 6 * u, -22 * v);   // top of windshield angled back
  ctx.lineTo(boatL / 2 - 10 * u, -22 * v);   // top of windshield forward
  ctx.lineTo(boatL / 2 - 4 * u, -14 * v);    // front of cockpit at deck
  ctx.closePath();
  ctx.fill();

  // Driver silhouette (head + shoulders) inside cockpit
  ctx.fillStyle = '#17324a';
  // Head
  ctx.beginPath();
  ctx.arc(-boatL / 2 + 9 * u, -24 * v, 2.5 * u, 0, Math.PI * 2);
  ctx.fill();
  // Shoulders
  ctx.beginPath();
  ctx.moveTo(-boatL / 2 + 6 * u, -18 * v);
  ctx.lineTo(-boatL / 2 + 12 * u, -20 * v);
  ctx.lineTo(-boatL / 2 + 12 * u, -17 * v);
  ctx.closePath();
  ctx.fill();

  // Dark outboard motor block at stern (left)
  ctx.fillStyle = '#1a0b2e';
  ctx.fillRect(-boatL / 2 - 4 * u, -8 * v, 6 * u, 10 * v);
  // Motor detail - lower unit
  ctx.fillStyle = '#0a3d4d';
  ctx.fillRect(-boatL / 2 - 3 * u, 0, 4 * u, 4 * v);

  // Wake — two diverging foam trails starting at stern running back LEFT at shallow angles
  // Made of short white dashes/dots of decreasing size + foam dots behind stern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  
  // Wake parameters: start at stern (left), go backwards (negative x), shallow angle
  const wakeSegments = 18;
  const wakeStartX = -boatL / 2 + 2 * u; // just behind stern
  const wakeStartY = 0; // at waterline
  
  // Left wake trail (angles slightly down/left)
  for (let i = 0; i < wakeSegments; i++) {
    const progress = i / wakeSegments;
    const dashX = wakeStartX - progress * 35 * u; // extending left
    const dashY = wakeStartY + progress * 3 * v;  // very shallow downward
    const size = (1.5 - progress * 1.0) * u;      // decreasing size
    const alpha = 0.8 - progress * 0.5;
    
    if (i % 2 === 0) { // dashed pattern
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(dashX, dashY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Right wake trail (angles slightly up/left)
  for (let i = 0; i < wakeSegments; i++) {
    const progress = i / wakeSegments;
    const dashX = wakeStartX - progress * 35 * u; // extending left
    const dashY = wakeStartY - progress * 3 * v;  // very shallow upward
    const size = (1.5 - progress * 1.0) * u;      // decreasing size
    const alpha = 0.8 - progress * 0.5;
    
    if (i % 2 === 0) { // dashed pattern
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(dashX, dashY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Foam dots behind stern (small burst at transom)
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 6; i++) {
    const dotX = wakeStartX - i * 3 * u;
    const dotY = wakeStartY + (Math.random() * 4 - 2) * v; // slight scatter
    const size = (1.2 - i * 0.15) * u;
    ctx.beginPath();
    ctx.arc(dotX, dotY, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Scene registry */
export const ART_SCENES = {
  skyline: { id: 'skyline', name: 'Vice Skyline' },
  car: { id: 'car', name: 'Muscle Car' },
  boat: { id: 'boat', name: 'Speedboat' },
};

/**
 * Draws a named artwork scene into rect {x,y,w,h}.
 * Unknown id falls back to 'skyline'.
 * All drawing scales from rect.w/rect.h using u,v units.
 */
export function drawArt(ctx, id, rect) {
  const sceneId = ART_SCENES[id] ? id : 'skyline';
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  switch (sceneId) {
    case 'skyline': drawSkyline(ctx, rect); break;
    case 'car': drawCar(ctx, rect); break;
    case 'boat': drawBoat(ctx, rect); break;
  }
  ctx.restore();
}
