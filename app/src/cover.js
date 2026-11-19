/* V12 Neon Heist — cover renderer.
 * Draws a GTA VI-style poster on any 2D canvas: a giant flat "6" over a neon
 * sunset, a red sports car in front three-quarter view, bold block title.
 * Everything is procedural; no image, font or network is needed.
 * All geometry lives in a 1080x1080 virtual space and is fitted to the
 * requested export size, so 1080x1080, 1080x1350 and 1920x1080 share one
 * composition. Photos (when loaded) are drawn cover-fit into panels. */

export const GRADES = {
  neon: {
    skyTop: '#1c0640', skyMid: '#a3135e', skyLow: '#ff5e8a',
    sunCore: '#fff3b0', sunEdge: '#ff9a3d', six: '#2fb9ff', sixDark: '#0b2a6b',
    accent: '#29b6f6', pink: '#ff2e88', title: '#ffffff', tag: '#ffd27a',
  },
  sunset: {
    skyTop: '#160b2e', skyMid: '#c2410c', skyLow: '#ffb74d',
    sunCore: '#fff8d6', sunEdge: '#ff8a00', six: '#ff9e2c', sixDark: '#5b1a05',
    accent: '#ffcf5c', pink: '#ff5e3a', title: '#fff7e8', tag: '#ffe9a8',
  },
  vice: {
    skyTop: '#0b0626', skyMid: '#6a1b9a', skyLow: '#00e5ff',
    sunCore: '#e8fbff', sunEdge: '#7dd3fc', six: '#c084fc', sixDark: '#2e1065',
    accent: '#22d3ee', pink: '#f472b6', title: '#ffffff', tag: '#a5f3fc',
  },
};

export const LAYOUTS = ['hero', 'hero3', 'grid4'];
export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

/* One continuous stroke for the "6": a flat-terminal arm curving over the
 * crown, then a full circle for the ring. The arm joins the ring on its
 * upper-right shoulder (angle -50 deg) with a bezier whose end tangent
 * matches the circle's tangent there, so the join is smooth on both edges
 * and there is no seam, notch or overlapping corner. */
export function sixPath(ctx, cx, cy, r) {
  const join = -50 * Math.PI / 180;
  const jx = cx + r * Math.cos(join), jy = cy + r * Math.sin(join);
  // Tangent at the join, pointing back along the arm: (-sin, cos).
  const tx = -Math.sin(join), ty = Math.cos(join);
  ctx.beginPath();
  ctx.moveTo(cx + 315, cy - 375); // flat arm terminal (butt cap)
  ctx.bezierCurveTo(cx + 220, cy - 410, jx - 90 * tx, jy - 90 * ty, jx, jy);
  ctx.arc(cx, cy, r, join, join + Math.PI * 2, false);
}

function skyGradient(ctx, W, H, g) {
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, g.skyTop);
  gr.addColorStop(0.55, g.skyMid);
  gr.addColorStop(0.85, g.skyLow);
  gr.addColorStop(1, '#160a24');
  return gr;
}

function drawSkyline(ctx, W, H, g) {
  // Dark city blocks hugging the left and right edges only — never inside
  // the "6" loop, which stays sun-only.
  ctx.save();
  ctx.fillStyle = '#150a26';
  const blocks = [
    [0.0, 0.60, 0.075, 0.20], [0.075, 0.56, 0.07, 0.24], [0.145, 0.62, 0.06, 0.18],
    [0.86, 0.58, 0.07, 0.22], [0.93, 0.54, 0.07, 0.26], [0.79, 0.64, 0.07, 0.16],
  ];
  for (const [fx, fy, fw, fh] of blocks) {
    ctx.fillRect(fx * W, fy * H, fw * W, fh * H);
  }
  // Lit windows: tiny warm / cool squares, seeded so the render is stable.
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cols = ['#ffd27a', '#7dd3fc', '#ff8fb3', '#ffe9a8'];
  for (const [fx, fy, fw, fh] of blocks) {
    for (let i = 0; i < 26; i++) {
      if (rnd() < 0.45) continue;
      ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
      ctx.fillRect((fx + 0.12 * fw + rnd() * 0.72 * fw) * W,
        (fy + 0.08 * fh + rnd() * 0.8 * fh) * H, 5, 7);
    }
  }
  ctx.restore();
}

function drawRoad(ctx, W, H) {
  const gr = ctx.createLinearGradient(0, 0.78 * H, 0, H);
  gr.addColorStop(0, '#1d0f33');
  gr.addColorStop(0.25, '#12081f');
  gr.addColorStop(1, '#07030d');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0.78 * H, W, 0.22 * H);
  // Wet-road neon streaks.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(0.06 * W, 0.885 * H, 0.16 * W, 4);
  ctx.fillStyle = '#29b6f6';
  ctx.fillRect(0.78 * W, 0.905 * H, 0.16 * W, 4);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0.30 * W, 0.93 * H, 0.12 * W, 3);
  ctx.restore();
}

/* A wheel with depth: black tyre, metallic rim, five spokes, hub, a top-left
 * rim highlight and a soft contact shadow where rubber meets road. */
function drawWheel(ctx, cx, cy, r, g) {
  // Contact shadow.
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.92, r * 1.15, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Tyre with a shaded sidewall, not a flat disc.
  const tyre = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.2, cx, cy, r);
  tyre.addColorStop(0, '#2a2a33'); tyre.addColorStop(0.75, '#101014'); tyre.addColorStop(1, '#050508');
  ctx.fillStyle = tyre;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.stroke();
  // Bright rim lip.
  ctx.strokeStyle = '#d7dde5'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2); ctx.stroke();
  // Rim.
  const rim = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 0.72);
  rim.addColorStop(0, '#e8edf2'); rim.addColorStop(0.6, '#9aa3ad'); rim.addColorStop(1, '#4b5563');
  ctx.fillStyle = rim;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.fill();
  // Red brake caliper behind the spokes (2 o'clock).
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r * 0.58, -Math.PI * 0.25, Math.PI * 0.15);
  ctx.closePath(); ctx.fill();
  // Five spokes, each with a dark offset shadow so they lift off the disc.
  ctx.save();
  ctx.translate(cx, cy);
  for (const [col, dx, dy] of [['#1f2937', 3, 3], ['#c7ccd4', 0, 0]]) {
    ctx.strokeStyle = col; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.16 + dx, Math.sin(a) * r * 0.16 + dy);
      ctx.lineTo(Math.cos(a) * r * 0.62 + dx, Math.sin(a) * r * 0.62 + dy);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Hub + brake disc hint.
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f3f4f6';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.13, 0, Math.PI * 2); ctx.fill();
  // Rim top-left highlight.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.66, Math.PI * 0.9, Math.PI * 1.45); ctx.stroke();
}

/* The red sports car, front three-quarter view: the nose (right) is closer,
 * so it is taller and wider, its wheel is bigger, the body foreshortens
 * toward the rear, and the front fascia — grille slats + headlight + beam —
 * faces the viewer. The roof is short: this is a coupe, not a limo. */
function drawCar(ctx, g) {
  const ground = 862;
  ctx.save();
  // Long soft shadow under the whole car.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(560, ground + 6, 420, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body silhouette: TWO planes, so the car reads in front three-quarter.
  // The beltline RISES toward the nose (the front is closer, so it is
  // taller), the nose face is tall and wide, the hood is short, the roof
  // is short — a coupe seen from the front quarter, not a side profile.
  const body = ctx.createLinearGradient(0, 660, 0, 860);
  body.addColorStop(0, '#ff4d2e'); body.addColorStop(0.55, '#e8201a'); body.addColorStop(1, '#8f0f0f');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(230, 842);           // tail lower
  ctx.lineTo(245, 782);           // tail top
  ctx.lineTo(360, 752);           // rear deck -> short roof
  ctx.lineTo(450, 706);           // roof rear
  ctx.lineTo(565, 694);           // roof front
  ctx.lineTo(625, 730);           // windshield base
  ctx.lineTo(780, 742);           // short hood, foreshortened
  ctx.lineTo(920, 738);           // nose top — higher than the tail: closer
  ctx.lineTo(940, 838);           // tall nose face
  ctx.lineTo(880, 852);           // front lower
  ctx.lineTo(300, 856);           // sill back to the tail
  ctx.closePath();
  ctx.fill();
  // Front plane, a different shade so the turn toward the viewer is visible.
  const face = ctx.createLinearGradient(780, 742, 940, 838);
  face.addColorStop(0, '#d61f1f'); face.addColorStop(1, '#7f0d0d');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(780, 742); ctx.lineTo(920, 738); ctx.lineTo(940, 838); ctx.lineTo(880, 852); ctx.lineTo(780, 852);
  ctx.closePath(); ctx.fill();
  // Lower side shading for depth.
  ctx.fillStyle = 'rgba(60,0,0,0.35)';
  ctx.beginPath();
  ctx.moveTo(250, 800); ctx.lineTo(880, 800); ctx.lineTo(880, 852); ctx.lineTo(300, 856); ctx.closePath();
  ctx.fill();
  // Rising character line along the flank.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(270, 786); ctx.lineTo(770, 760); ctx.stroke();
  // Sill / skirt.
  ctx.fillStyle = '#1a0505';
  ctx.fillRect(300, 838, 580, 12);

  // Glasshouse: ONE dark band following the roof (windshield + side window),
  // split by a thin B-pillar line — never two floating quads.
  ctx.fillStyle = '#0f2531';
  ctx.beginPath();
  ctx.moveTo(370, 722); ctx.lineTo(450, 710); ctx.lineTo(560, 696);
  ctx.lineTo(605, 728); ctx.lineTo(480, 738); ctx.lineTo(380, 742);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8201a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(455, 706); ctx.lineTo(465, 736); ctx.stroke();
  // Glass highlight streak.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(490, 730); ctx.lineTo(555, 704); ctx.stroke();

  // Wheel arches cut out of the body, then real wheels on top.
  for (const [wx, wy, wr] of [[360, 800, 60], [790, 782, 90]]) {
    ctx.fillStyle = '#12081f';
    ctx.beginPath(); ctx.arc(wx, wy, wr + 12, 0, Math.PI * 2); ctx.fill();
  }
  drawWheel(ctx, 360, 800, 58, g);  // rear: smaller, farther
  drawWheel(ctx, 790, 782, 88, g);  // front: bigger, closer
  // Front fender flare.
  ctx.strokeStyle = 'rgba(255,120,90,0.8)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(790, 782, 104, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();

  // Front fascia on the turned face: wide grille, big headlight, splitter.
  ctx.save();
  ctx.translate(905, 800); ctx.rotate(0.10);
  ctx.fillStyle = '#0d0d12';
  ctx.beginPath(); ctx.moveTo(-18, -34); ctx.lineTo(22, -30); ctx.lineTo(22, 30); ctx.lineTo(-18, 34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c7ccd4';
  for (let i = 0; i < 3; i++) ctx.fillRect(-10 + i * 11, -26, 5, 52);
  ctx.restore();
  // Splitter under the nose.
  ctx.fillStyle = '#0a0a0e';
  ctx.beginPath(); ctx.moveTo(840, 852); ctx.lineTo(928, 840); ctx.lineTo(924, 826); ctx.lineTo(852, 836); ctx.closePath(); ctx.fill();
  // Headlight: big swept lens on the nose face, clear of the front wheel,
  // + glow + beam cone to the right edge.
  ctx.save();
  ctx.translate(890, 752); ctx.rotate(-0.08);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 80);
  glow.addColorStop(0, 'rgba(255,255,220,0.9)'); glow.addColorStop(1, 'rgba(255,255,220,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath(); ctx.ellipse(0, 0, 36, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.ellipse(0, 0, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  const beam = ctx.createLinearGradient(910, 752, 1080, 800);
  beam.addColorStop(0, 'rgba(255,250,210,0.35)'); beam.addColorStop(1, 'rgba(255,250,210,0)');
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(910, 744); ctx.lineTo(1080, 720); ctx.lineTo(1080, 834); ctx.lineTo(910, 768); ctx.closePath(); ctx.fill();

  // Taillight bar at the tail.
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(232, 790, 34, 10);
  ctx.fillStyle = 'rgba(255,120,110,0.8)';
  ctx.fillRect(232, 790, 34, 3);
  // Door handle + mirror.
  ctx.fillStyle = '#7f0d0d';
  ctx.fillRect(505, 748, 34, 7);
  ctx.fillStyle = '#c81e1e';
  ctx.beginPath(); ctx.moveTo(610, 716); ctx.lineTo(638, 710); ctx.lineTo(642, 728); ctx.lineTo(614, 732); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Wet-road reflection: the body flipped under the ground line, squashed
  // and faint so it reads as a reflection, not a red puddle.
  ctx.save();
  ctx.globalAlpha = 0.13;
  try { ctx.filter = 'blur(5px)'; } catch (e) { /* older canvas: unblurred is fine */ }
  ctx.translate(0, ground * 2 + 4);
  ctx.scale(1, -0.55);
  ctx.fillStyle = '#e8201a';
  ctx.beginPath();
  ctx.moveTo(230, 842); ctx.lineTo(245, 782); ctx.lineTo(360, 752); ctx.lineTo(450, 706);
  ctx.lineTo(565, 694); ctx.lineTo(625, 730); ctx.lineTo(780, 742); ctx.lineTo(920, 738); ctx.lineTo(940, 838);
  ctx.lineTo(880, 852); ctx.lineTo(300, 856); ctx.closePath(); ctx.fill();
  ctx.restore();
  try { ctx.filter = 'none'; } catch (e) { /* noop */ }
}

function drawTitleBlock(ctx, W, H, state, g, top) {
  const cx = W / 2;
  // Block title: huge, flat, white with a dark outline, slight forward lean.
  ctx.save();
  ctx.translate(cx, top);
  ctx.transform(1, 0, -0.06, 1, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 148px "Arial Black", "Helvetica Neue", Arial, sans-serif';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a2e'; ctx.lineWidth = 16;
  ctx.strokeText(state.title, 0, 0);
  ctx.fillStyle = g.title;
  ctx.fillText(state.title, 0, 0);
  ctx.restore();
  // Tagline, letterspaced gold.
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 34px "Arial Black", Arial, sans-serif';
  ctx.fillStyle = g.tag;
  const tg = state.tagline;
  ctx.fillText(tg, cx, top + 96);
  // Flanking rules, kept clear of the tagline text.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 480, top + 96); ctx.lineTo(cx - 390, top + 96); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 390, top + 96); ctx.lineTo(cx + 480, top + 96); ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx, state, g) {
  ctx.save();
  const label = state.badge;
  ctx.font = '800 30px "Arial Black", Arial, sans-serif';
  const w = ctx.measureText(label).width + 56;
  ctx.fillStyle = 'rgba(10,6,24,0.85)';
  ctx.strokeStyle = g.accent; ctx.lineWidth = 3;
  roundRect(ctx, 36, 36, w, 58, 29);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 36 + w / 2, 66);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawDashStrip(ctx, W, H, g) {
  const y = H - 16, h = 16, dw = W / 9;
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 === 0 ? g.pink : g.accent;
    ctx.fillRect(i * dw + 2, y, dw - 4, h);
  }
}

/* Draw one photo cover-fit into a rect, with per-panel crop (ox, oy in
 * -1..1) and zoom, plus a neon grade tint so panels match the poster. */
export function drawPhotoPanel(ctx, photo, x, y, w, h, grade) {
  if (!photo || !photo.img || !photo.img.naturalWidth) {
    const gr = ctx.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, '#3b0764'); gr.addColorStop(1, '#9d174d');
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '700 22px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    return;
  }
  const img = photo.img;
  const zoom = photo.zoom || 1;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const ox = (photo.ox || 0) * (dw - w) / 2, oy = (photo.oy || 0) * (dh - h) / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2 - ox, y + (h - dh) / 2 - oy, dw, dh);
  // Grade wash.
  ctx.fillStyle = grade === 'sunset' ? 'rgba(255,120,20,0.16)' : grade === 'vice' ? 'rgba(120,60,255,0.16)' : 'rgba(255,20,120,0.16)';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

function drawHeroScene(ctx, W, H, state, g) {
  // Virtual 1080 space fitted inside the canvas.
  const s = Math.min(W / 1080, H / 1080);
  const ox = (W - 1080 * s) / 2, oy = (H - 1080 * s) / 2;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  // Sun orb, clipped to the loop interior so the loop stays sun-only.
  ctx.save();
  ctx.beginPath(); ctx.arc(540, 470, 232, 0, Math.PI * 2); ctx.clip();
  const sun = ctx.createRadialGradient(540, 440, 10, 540, 470, 215);
  sun.addColorStop(0, g.sunCore); sun.addColorStop(0.65, g.sunEdge); sun.addColorStop(1, g.sunEdge);
  ctx.fillStyle = sun;
  ctx.fillRect(320, 250, 440, 440);
  ctx.restore();
  // The giant "6": dark outline, then one smooth electric stroke.
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  sixPath(ctx, 540, 470, 300);
  ctx.strokeStyle = g.sixDark; ctx.lineWidth = 172; ctx.stroke();
  sixPath(ctx, 540, 470, 300);
  const sixGrad = ctx.createLinearGradient(0, 120, 0, 800);
  sixGrad.addColorStop(0, '#7dd3fc'); sixGrad.addColorStop(0.5, g.six); sixGrad.addColorStop(1, '#0284c7');
  ctx.strokeStyle = sixGrad; ctx.lineWidth = 150; ctx.stroke();
  // Speed lines across the sky.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
  for (const [x1, y1, x2, y2] of [[60, 150, 300, 110], [120, 260, 330, 225], [820, 130, 1020, 95], [760, 240, 1010, 200]]) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  drawCar(ctx, g);
  drawTitleBlock(ctx, 1080, 1080, state, g, 928);
  ctx.restore();
}

/* The whole cover. state: {layout, grade, title, tagline, badge, photos[]}. */
export function drawCover(ctx, W, H, state) {
  const g = GRADES[state.grade] || GRADES.neon;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = skyGradient(ctx, W, H, g);
  ctx.fillRect(0, 0, W, H);
  drawSkyline(ctx, W, H, g);
  drawRoad(ctx, W, H);

  const photos = state.photos || [];
  if (state.layout === 'hero') {
    if (photos[0] && photos[0].img) {
      // One photo fills the whole cover behind the scene, graded + dimmed.
      ctx.save();
      ctx.globalAlpha = 0.3;
      drawPhotoPanel(ctx, photos[0], 0, 0, W, H, state.grade);
      ctx.restore();
      ctx.fillStyle = 'rgba(20,6,40,0.45)';
      ctx.fillRect(0, 0, W, H);
      drawSkyline(ctx, W, H, g);
      drawRoad(ctx, W, H);
    }
    drawHeroScene(ctx, W, H, state, g);
    drawBadge(ctx, state, g);
  } else if (state.layout === 'hero3') {
    const topH = Math.round(H * 0.62);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, topH); ctx.clip();
    drawHeroScene(ctx, W, topH + Math.round(H * 0.10), state, g);
    ctx.restore();
    const gap = 10, pw = (W - gap * 4) / 3, py = topH + gap, ph = H - topH - gap * 2;
    for (let i = 0; i < 3; i++) {
      drawPhotoPanel(ctx, photos[i], gap + i * (pw + gap), py, pw, ph, state.grade);
    }
    drawBadge(ctx, state, g);
    // Title band overlapping the seam so the poster still reads as one cover.
    ctx.save();
    ctx.fillStyle = 'rgba(12,5,26,0.82)';
    ctx.fillRect(0, topH - 78, W, 78);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 54px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = g.title;
    ctx.fillText(state.title, W / 2, topH - 38);
    ctx.restore();
  } else {
    // grid4: 2x2 photo panels, title band across the middle.
    const gap = 10;
    const pw = (W - gap * 3) / 2, ph = (H - gap * 3) / 2;
    for (let i = 0; i < 4; i++) {
      const x = gap + (i % 2) * (pw + gap), y = gap + Math.floor(i / 2) * (ph + gap);
      drawPhotoPanel(ctx, photos[i], x, y, pw, ph, state.grade);
    }
    ctx.fillStyle = 'rgba(12,5,26,0.88)';
    ctx.fillRect(0, H / 2 - 72, W, 144);
    ctx.strokeStyle = g.accent; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, H / 2 - 72); ctx.lineTo(W, H / 2 - 72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H / 2 + 72); ctx.lineTo(W, H / 2 + 72); ctx.stroke();
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 92px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = g.title;
    ctx.fillText(state.title, W / 2, H / 2 - 8);
    ctx.font = '700 30px "Arial Black", Arial, sans-serif';
    ctx.fillStyle = g.tag;
    ctx.fillText(state.tagline, W / 2, H / 2 + 52);
    ctx.restore();
    drawBadge(ctx, state, g);
  }
  drawDashStrip(ctx, W, H, g);
}
