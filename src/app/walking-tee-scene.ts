import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/*
 * Ghost-mannequin oversized tee that walks in place while turning.
 *
 * Proportions, turn timing and walk cadence are matched to the reference
 * animation https://dribbble.com/shots/27648973-Clothing-walking-animation,
 * with MOVI artwork in place of the original print.
 *
 * The garment is generated procedurally (no model download). All motion —
 * walk cycle, hip/shoulder counter-twist, arm swing, leg push on the hem and
 * cloth folds — runs in the vertex shader, so the CPU only updates a few
 * uniforms per frame and the whole tee is a single draw call.
 */

type V3 = [number, number, number];
type UV = [number, number];

export type TeeScene = { start(): void; stop(): void; dispose(): void };

const LOGO_SRC = "/movi/logo.jpg";
const MONOGRAM_CROP = [372, 205, 530, 500]; // crown + MV in logo.jpg pixels
const FABRIC = "#232323";
const INSIDE = "#141414";
const PRINT_INK: V3 = [234, 227, 214];

// Timing measured from the reference: a step every ~0.53 s, and a full turn
// every ~10.5 s that slows down facing front and facing back.
const STRIDE_SECONDS = 1.07; // one full walk cycle (two steps)
const HALF_TURN_SECONDS = 5.235; // front → back
const STRIDE_PHASE = 1.07; // lines the steps up with the turn, as in the reference

// Garment measurements in scene units (1 unit = hem width), taken from the
// reference: 1.81 long from back collar to hem, 1.8 across the sleeves.
const NECK_Y = 0.62;
const HEM_Y = NECK_Y - 1.81;
const TOP_Y = 0.36;
const YOKE_LEN = 0.45;
const ARMPIT_T = (-0.42 - HEM_Y) / (TOP_Y - HEM_Y);
const SHOULDER_K = 0.12; // armhole top sits just over the shoulder rounding
const ARMHOLE_DU = 0.085; // armhole half-width around the side seam (fraction of the girth)
const SLEEVE_TILT = MathUtils.degToRad(21);
const CUFF_X = 0.72;
const CUFF_Y = -0.355;
const CUFF_R1 = 0.18;
const CUFF_R2 = 0.155;
const V_MAX = TOP_Y - HEM_Y + YOKE_LEN;
const SUPER = 2.5;
const COLS = 144;
const TUBE_ROWS = 72;
const YOKE_ROWS = 22;
const SLEEVE_ROWS = 30;
const SLEEVE_COLS = 72;
const PLAIN_UV: UV = [0.4, 0.15];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const gauss = (x: number, m: number, s: number) => Math.exp(-(((x - m) / s) ** 2));
const sgnPow = (v: number, e: number) => Math.sign(v) * Math.abs(v) ** e;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/* ---------------------------------------------------------------- geometry */

type GridSpec = {
  rows: number;
  cols: number;
  point: (r: number, c: number) => V3;
  uv: (r: number, c: number) => UV;
  swing?: (r: number) => number;
  rib?: number;
  /** Analytic normal; when omitted normals are accumulated from faces. */
  normal?: (r: number, c: number) => V3;
  /** Direction cloth folds displace along; defaults to the surface normal. */
  disp?: (r: number, c: number) => V3;
};

class GarmentBuilder {
  pos: number[] = [];
  nor: number[] = [];
  disp: number[] = [];
  uv: number[] = [];
  swing: number[] = [];
  rib: number[] = [];
  idx: number[] = [];

  /** Grid whose columns wrap around (a closed loop); rows are open. */
  addLoopGrid(spec: GridSpec) {
    const { rows, cols } = spec;
    const P: V3[][] = [];
    for (let r = 0; r < rows; r++) {
      P.push([]);
      for (let c = 0; c < cols; c++) P[r].push(spec.point(r, c));
    }

    // Face normals follow the winding (i0, i1, i2) = (r c, r c+1, r+1 c).
    const faceN = (r: number, c: number) => {
      const a = P[r][c];
      return cross(sub(P[r][(c + 1) % cols], a), sub(P[r + 1][c], a));
    };

    let N: V3[][];
    let flip = false;
    if (spec.normal) {
      N = P.map((row, r) => row.map((_, c) => spec.normal!(r, c)));
      flip = dot(faceN(0, 0), N[0][0]) < 0;
    } else {
      N = P.map((row) => row.map((): V3 => [0, 0, 0]));
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols; c++) {
          const fn = faceN(r, c);
          const c1 = (c + 1) % cols;
          for (const [rr, cc] of [[r, c], [r, c1], [r + 1, c], [r + 1, c1]]) N[rr][cc] = add(N[rr][cc], fn);
        }
      }
      // Orient outward: compare against the direction away from each ring's centre.
      let score = 0;
      for (let r = 0; r < rows; r++) {
        const centre = scale(P[r].reduce(add, [0, 0, 0] as V3), 1 / cols);
        for (let c = 0; c < cols; c++) score += dot(N[r][c], sub(P[r][c], centre));
      }
      flip = score < 0;
      N = N.map((row) => row.map((n) => norm(flip ? scale(n, -1) : n)));
    }

    const base = this.pos.length / 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const cc = c % cols;
        const n = N[r][cc];
        this.pos.push(...P[r][cc]);
        this.nor.push(...n);
        this.disp.push(...(spec.disp ? spec.disp(r, cc) : n));
        this.uv.push(...spec.uv(r, c));
        this.swing.push(spec.swing ? spec.swing(r) : 0);
        this.rib.push(spec.rib ?? 0);
      }
    }
    const stride = cols + 1;
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = base + r * stride + c;
        const i1 = i0 + 1;
        const i2 = i0 + stride;
        const i3 = i2 + 1;
        if (flip) this.idx.push(i0, i2, i1, i1, i2, i3);
        else this.idx.push(i0, i1, i2, i1, i3, i2);
      }
    }
    return { P, N };
  }

  /** Thin rolled edge (hem, cuff, collar) following a closed ring of points. */
  addTube(ring: { c: V3; out: V3; up: V3; disp: V3 }[], rOut: number, rUp: number, steps: number, swing = 0, rib = 0) {
    this.addLoopGrid({
      rows: steps + 1,
      cols: ring.length,
      point: (r, c) => {
        const a = (r / steps) * Math.PI * 2;
        const { c: p, out, up } = ring[c];
        return add(p, add(scale(out, rOut * Math.cos(a)), scale(up, rUp * Math.sin(a))));
      },
      normal: (r, c) => {
        const a = (r / steps) * Math.PI * 2;
        const { out, up } = ring[c];
        return norm(add(scale(out, Math.cos(a) / rOut), scale(up, Math.sin(a) / rUp)));
      },
      disp: (_, c) => ring[c].disp,
      uv: () => PLAIN_UV,
      swing: () => swing,
      rib,
    });
  }

  build() {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute("normal", new BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute("aDisp", new BufferAttribute(new Float32Array(this.disp), 3));
    g.setAttribute("uv", new BufferAttribute(new Float32Array(this.uv), 2));
    g.setAttribute("aSwing", new BufferAttribute(new Float32Array(this.swing), 1));
    g.setAttribute("aRib", new BufferAttribute(new Float32Array(this.rib), 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

type Shape = { a: number; bF: number; bB: number };

// Measured off the reference (hem width = 1): straight boxy sides up to the
// armpit, widening into a dropped shoulder; ~0.6 deep, hanging loose.
function torsoShape(t: number): Shape {
  return {
    a: 0.505 + 0.012 * (1 - smooth(0, 0.12, t)) + 0.08 * smooth(ARMPIT_T - 0.05, 1, t),
    bF: 0.3 + 0.015 * gauss(t, 0.72, 0.25),
    bB: 0.29 + 0.015 * gauss(t, 0.85, 0.2),
  };
}

// θ runs from the wearer's right side seam (u = 0), across the front (u = .25),
// the left seam (u = .5) and the back (u = .75), so artwork reads correctly.
function ringXZ(theta: number, s: Shape): [number, number] {
  const c = Math.cos(theta);
  const sn = Math.sin(theta);
  return [s.a * sgnPow(c, 2 / SUPER), (sn >= 0 ? s.bF : s.bB) * sgnPow(sn, 2 / SUPER)];
}

function neckPoint(theta: number): V3 {
  const sn = Math.sin(theta);
  return [0.2 * Math.cos(theta), NECK_Y - 0.09 * Math.max(0, sn) ** 1.4, -0.015 + (sn >= 0 ? 0.15 : 0.13) * sn];
}

/** Column angles spaced evenly by arc length so the print is not stretched. */
function arcThetas(shape: Shape, cols: number) {
  const S = 1024;
  const lengths = [0];
  let prev = ringXZ(Math.PI, shape);
  for (let i = 1; i <= S; i++) {
    const p = ringXZ(Math.PI - (2 * Math.PI * i) / S, shape);
    lengths.push(lengths[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
    prev = p;
  }
  const total = lengths[S];
  const thetas: number[] = [];
  let j = 0;
  for (let c = 0; c <= cols; c++) {
    const target = Math.min(total, (total * c) / cols);
    while (j < S - 1 && lengths[j + 1] < target) j++;
    const f = (target - lengths[j]) / (lengths[j + 1] - lengths[j] || 1);
    thetas.push(Math.PI - (2 * Math.PI * (j + f)) / S);
  }
  return { thetas, length: total };
}

/**
 * Torso surface. t ∈ [0, 1] runs hem → top of the side walls, t ∈ (1, 2] runs
 * over the shoulder yoke to the neckline; u ∈ [0, 1) goes around.
 */
function torsoSurface() {
  const tables = new Map<number, number[]>();
  const thetaAt = (t: number, u: number) => {
    const key = Math.round(Math.min(t, 1) * 4096);
    let th = tables.get(key);
    if (!th) {
      th = arcThetas(torsoShape(key / 4096), 512).thetas;
      tables.set(key, th);
    }
    const f = (((u % 1) + 1) % 1) * 512;
    const i = Math.floor(f);
    return mix(th[i], th[i + 1], f - i);
  };
  const topShape = torsoShape(1);
  return (t: number, u: number): V3 => {
    const th = thetaAt(t, u);
    if (t <= 1) {
      const [x, z] = ringXZ(th, torsoShape(t));
      return [x, mix(HEM_Y, TOP_Y, t), z];
    }
    // Shoulder yoke: rounds over the dropped shoulder, slopes in to the neck.
    const k = Math.min(1, t - 1);
    const [ox, oz] = ringXZ(th, topShape);
    const [nx, ny, nz] = neckPoint(th);
    const sk = k ** 1.15;
    return [mix(ox, nx, sk), mix(TOP_Y, ny, 1 - (1 - k) ** 2.2), mix(oz, nz, sk)];
  };
}

const bezier = (a: V3, b: V3, c: V3, d: V3, s: number): V3 => {
  const m = 1 - s;
  return add(add(scale(a, m * m * m), scale(b, 3 * m * m * s)), add(scale(c, 3 * m * s * s), scale(d, s * s * s)));
};

function buildTee() {
  const b = new GarmentBuilder();
  const torsoAt = torsoSurface();
  const rows = TUBE_ROWS + YOKE_ROWS;
  const tOfRow = (r: number) => (r < TUBE_ROWS ? r / (TUBE_ROWS - 1) : 1 + (r - TUBE_ROWS + 1) / YOKE_ROWS);

  const torso = b.addLoopGrid({
    rows,
    cols: COLS,
    point: (r, c) => torsoAt(tOfRow(r), c / COLS),
    uv: (r, c) => {
      const t = tOfRow(r);
      const v = t <= 1 ? t * (TOP_Y - HEM_Y) : TOP_Y - HEM_Y + (t - 1) * YOKE_LEN;
      return [c / COLS, v / V_MAX];
    },
  });

  const lastRow = rows - 1;
  b.addTube(
    torso.P[0].map((p, c) => {
      const n = torso.N[0][c];
      return { c: p, out: norm([n[0], 0, n[2]]), up: [0, 1, 0], disp: n };
    }),
    0.005,
    0.007,
    10,
  );
  b.addTube(
    torso.P[lastRow].map((p, c) => ({
      c: add(p, [0, 0.012, 0]),
      out: norm([p[0], 0, p[2] + 0.015]),
      up: [0, 1, 0] as V3,
      disp: torso.N[lastRow][c],
    })),
    0.014,
    0.026,
    12,
    0,
    1,
  );

  for (const side of [1, -1]) {
    // Sleeves are sewn into an armhole on the body (a loop on the torso surface
    // from the dropped shoulder down to the armpit), then hang nearly straight
    // down to a cuff that sits just outside the body — as in the reference.
    const u0 = side > 0 ? 0.5 : 0;
    const armhole = (phi: number) =>
      torsoAt(mix(ARMPIT_T, 1 + SHOULDER_K, (1 + Math.cos(phi)) / 2), u0 - side * ARMHOLE_DU * Math.sin(phi));

    const axis = norm([side * Math.sin(SLEEVE_TILT), -Math.cos(SLEEVE_TILT), 0.04]);
    const e1 = norm([side * Math.cos(SLEEVE_TILT), Math.sin(SLEEVE_TILT), 0]); // up-and-out across the cuff
    let e2 = norm(cross(axis, e1));
    if (e2[2] < 0) e2 = scale(e2, -1);
    const cuffCentre: V3 = [side * CUFF_X, CUFF_Y, 0.03];
    const cuff = (phi: number) => add(cuffCentre, add(scale(e1, CUFF_R1 * Math.cos(phi)), scale(e2, CUFF_R2 * Math.sin(phi))));

    const ringAt = (s: number, phi: number) => {
      const a = armhole(phi);
      const c = cuff(phi);
      const upper = (1 + Math.cos(phi)) / 2; // 1 on the shoulder, 0 under the arm
      const k1 = add(a, [side * (0.05 + 0.13 * upper), 0.02 * upper, 0]);
      const k2 = sub(c, scale(axis, 0.06 + 0.16 * upper));
      return bezier(a, k1, k2, c, s);
    };
    const swing = (s: number) => side * Math.max(0.002, smooth(0, 0.85, s));

    const sleeve = b.addLoopGrid({
      rows: SLEEVE_ROWS,
      cols: SLEEVE_COLS,
      point: (r, c) => ringAt(r / (SLEEVE_ROWS - 1), (2 * Math.PI * c) / SLEEVE_COLS),
      uv: () => PLAIN_UV,
      swing: (r) => swing(r / (SLEEVE_ROWS - 1)),
    });
    const end = SLEEVE_ROWS - 1;
    b.addTube(
      sleeve.P[end].map((p, c) => ({ c: p, out: norm(sub(p, cuffCentre)), up: axis, disp: sleeve.N[end][c] })),
      0.006,
      0.009,
      10,
      side,
    );
  }

  const chest = arcThetas(torsoShape(0.75), COLS).length;
  return { geometry: b.build(), perimeter: chest };
}

/* ----------------------------------------------------------------- texture */

async function loadImage(src: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  return img;
}

/** Crown monogram from the badge, turned into screen-print ink. */
function monogramInk(logo: HTMLImageElement) {
  const [sx, sy, sw, sh] = MONOGRAM_CROP;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = Math.round((640 * sh) / sw);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(logo, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    const shade = 0.68 + 0.32 * l;
    px[i] = PRINT_INK[0] * shade;
    px[i + 1] = PRINT_INK[1] * shade;
    px[i + 2] = PRINT_INK[2] * shade;
    px[i + 3] = 255 * smooth(0.26, 0.56, l);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Framed graphic, laid out like the reference print: brand name arched over a
 * glowing centrepiece, fading out at the bottom — but all MOVI.
 */
function drawPrintPanel(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, mono: HTMLCanvasElement) {
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  ctx.save();

  // Washed panel with soft, distressed edges.
  const panel = ctx.createLinearGradient(0, y0, 0, y0 + h);
  panel.addColorStop(0, "rgba(120,116,110,0.22)");
  panel.addColorStop(0.75, "rgba(110,106,100,0.16)");
  panel.addColorStop(1, "rgba(110,106,100,0)");
  ctx.fillStyle = panel;
  ctx.fillRect(x0, y0, w, h);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.05)";
    const s = 1 + Math.random() * 2.5;
    ctx.fillRect(x0 + Math.random() * w, y0 + Math.random() * h, s, s);
  }

  // Warm halo behind the monogram.
  const gy = y0 + h * 0.5;
  const glow = ctx.createRadialGradient(cx, gy, 0, cx, gy, w * 0.52);
  glow.addColorStop(0, "rgba(214,160,98,0.55)");
  glow.addColorStop(0.45, "rgba(150,72,52,0.28)");
  glow.addColorStop(1, "rgba(87,38,32,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x0, y0, w, h);

  // Crown monogram.
  const mw = w * 0.86;
  const mh = (mw * mono.height) / mono.width;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = w * 0.03;
  ctx.drawImage(mono, cx - mw / 2, gy - mh / 2, mw, mh);
  ctx.shadowBlur = 0;

  // Arched wordmark.
  const text = "MOVI CLOTHING";
  const size = w * 0.165;
  ctx.font = `500 ${size}px "Cormorant Garamond", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const radius = w * 0.78;
  const arcCy = y0 + Math.min(h * 0.14, w * 0.2) + radius;
  const widths = [...text].map((ch) => ctx.measureText(ch).width + size * 0.06);
  const total = widths.reduce((sum, v) => sum + v, 0);
  let angle = -total / radius / 2;
  ctx.lineJoin = "round";
  for (let i = 0; i < text.length; i++) {
    const a = angle + widths[i] / radius / 2;
    ctx.save();
    ctx.translate(cx + Math.sin(a) * radius, arcCy - Math.cos(a) * radius);
    ctx.rotate(a);
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = "rgba(10,10,10,0.85)";
    ctx.strokeText(text[i], 0, 0);
    ctx.fillStyle = `rgb(${PRINT_INK.join(",")})`;
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
    angle += widths[i] / radius;
  }

  // Tagline where the reference has its stem.
  ctx.font = `500 ${w * 0.045}px Inter, sans-serif`;
  ctx.fillStyle = `rgba(${PRINT_INK.join(",")},0.8)`;
  ctx.fillText("M O V E   Y O U R   W A Y .", cx, y0 + h * 0.86);
  ctx.restore();
}

function fabricTexture(perimeter: number, logo: HTMLImageElement) {
  const W = 2048;
  const H = Math.round((W * V_MAX) / perimeter);
  const pxPerUnit = W / perimeter;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const yAt = (worldY: number) => H * (1 - (worldY - HEM_Y) / V_MAX);

  ctx.fillStyle = FABRIC;
  ctx.fillRect(0, 0, W, H);

  // Garment-dyed wash: soft uneven patches.
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 40 + Math.random() * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, Math.random() > 0.5 ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.035)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Twin-needle hem stitching and side seams.
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  for (const y of [HEM_Y + 0.028, HEM_Y + 0.042]) {
    ctx.beginPath();
    ctx.moveTo(0, yAt(y));
    ctx.lineTo(W, yAt(y));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  for (const x of [0, W / 2, W]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Same artwork twice, as in the reference: chest-sized front, full back.
  const mono = monogramInk(logo);
  drawPrintPanel(ctx, W * 0.25, yAt(0.0), 0.47 * pxPerUnit, 0.62 * pxPerUnit, mono);
  drawPrintPanel(ctx, W * 0.75, yAt(-0.27), 0.7 * pxPerUnit, 1.2 * pxPerUnit, mono);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/* ------------------------------------------------------------------ shader */

const NOISE_GLSL = /* glsl */ `
float teeHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float teeNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(teeHash(i), teeHash(i + vec3(1, 0, 0)), f.x), mix(teeHash(i + vec3(0, 1, 0)), teeHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(teeHash(i + vec3(0, 0, 1)), teeHash(i + vec3(1, 0, 1)), f.x), mix(teeHash(i + vec3(0, 1, 1)), teeHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`;

const VERTEX_HEADER = /* glsl */ `
uniform float uPhase;
uniform float uWalk;
uniform float uTime;
attribute vec3 aDisp;
attribute float aSwing;
attribute float aRib;
varying vec3 vRest;
varying float vRib;
${NOISE_GLSL}
mat3 teeRotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 teeRotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 teeRotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

vec3 teeDeform(vec3 p, vec3 dn) {
  float w = uWalk;
  float ph = uPhase;
  float sleeve = step(0.001, abs(aSwing));
  float side = sign(aSwing);
  float sw = abs(aSwing);

  // 0 at the hem, 1 at the shoulders; sleeves ride with the shoulders.
  float hy = mix(smoothstep(${HEM_Y.toFixed(3)}, 0.42, p.y), 1.0, sleeve);
  float lower = 1.0 - hy;
  // Lower cloth lags the body a little — that is what reads as fabric.
  float phL = ph - 0.75 * lower;
  float hipYaw = -0.07 * sin(phL) * w;
  float shYaw = 0.25 * sin(ph) * w;

  // Folds: resting drape, counter-twist creases, hem flutter, soft noise.
  float ang = atan(p.z, p.x);
  float d = 0.012 * sin(ang * 8.0 + p.y * 1.6 + 1.3) * lower;
  d += 0.016 * sin(ang * 3.0 + p.y * 0.8 + 0.6) * smoothstep(0.15, -0.9, p.y);
  d += 0.0045 * sin(ang * 5.0 - p.y * 3.0) * lower;
  d += (hipYaw - shYaw) * 0.24 * cos(ang * 6.0 + 0.4) * sin(p.y * 10.0 + ang * 2.0) * hy * lower;
  d += 0.012 * (teeNoise(p * vec3(3.0, 1.6, 3.0) + vec3(0.0, 0.0, uTime * 0.05)) - 0.5);
  d += 0.005 * (teeNoise(p * 7.0) - 0.5);
  d += 0.005 * sin(ang * 4.0 - ph * 2.0 + p.y * 3.0) * lower * lower * w;
  p += dn * d;

  // Arms swing opposite the legs (with the shoulder going forward); the cuff
  // trails slightly behind the arm.
  vec3 pivot = vec3(0.52 * side, 0.4, 0.0);
  p = pivot + teeRotX(side * 0.36 * sin(ph - 0.25) * w * sw - side * 0.08 * sin(ph - 1.2) * w * sw * sw) * (p - pivot);

  // Thighs push the front hem forward and the back hem out on the trailing leg.
  float legL = sin(phL);
  float fwdL = max(legL, 0.0);
  float fwdR = max(-legL, 0.0);
  float hemZone = (1.0 - smoothstep(${(HEM_Y + 0.02).toFixed(3)}, -0.45, p.y)) * (1.0 - sleeve);
  float gL = exp(-pow((p.x - 0.16) / 0.2, 2.0)); // wearer's left is +x
  float gR = exp(-pow((p.x + 0.16) / 0.2, 2.0));
  float frontF = smoothstep(-0.05, 0.22, p.z);
  float backF = smoothstep(0.05, -0.22, p.z);
  float lead = fwdL * gL + fwdR * gR;
  float trail = fwdR * gL + fwdL * gR;
  p.z += (lead * 0.05 * frontF - trail * 0.03 * backF) * hemZone * w;
  p.y += lead * frontF * hemZone * hemZone * 0.02 * w;

  // Body: shoulders yaw with the arms, hips counter-rotate, weight shifts
  // side to side, and the whole tee dips at each heel strike.
  p = teeRotY(mix(hipYaw, shYaw, hy)) * p;
  p = teeRotZ(mix(0.035 * sin(phL), -0.03 * sin(ph), hy) * w) * p;
  p.x += mix(0.05 * sin(phL), 0.03 * sin(ph), hy) * w;
  p.y += 0.015 * cos(2.0 * ph) * w; // lowest at heel strike
  return p;
}
`;

const VERTEX_NORMAL = /* glsl */ `
vec3 teeN = normalize(normal);
vec3 teeTA = normalize(abs(teeN.y) < 0.95 ? cross(teeN, vec3(0.0, 1.0, 0.0)) : cross(teeN, vec3(1.0, 0.0, 0.0)));
vec3 teeTB = cross(teeN, teeTA);
vec3 dPos = teeDeform(position, aDisp);
vec3 objectNormal = normalize(cross(
  teeDeform(position + teeTA * 0.004, aDisp) - dPos,
  teeDeform(position + teeTB * 0.004, aDisp) - dPos));
#ifdef USE_TANGENT
  vec3 objectTangent = vec3(tangent.xyz);
#endif
`;

const FRAGMENT_HEADER = /* glsl */ `
uniform vec3 uInside;
varying vec3 vRest;
varying float vRib;
${NOISE_GLSL}
`;

const FRAGMENT_COLOR = /* glsl */ `
#include <map_fragment>
float teeMottle = teeNoise(vRest * 7.0) * 0.6 + teeNoise(vRest * 19.0) * 0.4;
diffuseColor.rgb *= (0.95 + 0.1 * teeMottle) * mix(1.0, 0.8, vRib);
if (!gl_FrontFacing) diffuseColor.rgb = uInside * (0.85 + 0.3 * teeMottle);
`;

function teeMaterial(map: CanvasTexture) {
  const uniforms = {
    uPhase: { value: 0 },
    uWalk: { value: 1 },
    uTime: { value: 0 },
    uInside: { value: new Color(INSIDE) },
  };
  const material = new MeshPhysicalMaterial({
    map,
    side: DoubleSide,
    roughness: 0.9,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.55,
    sheenColor: 0x8b8680,
    envMapIntensity: 0.35,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_HEADER}`)
      .replace("#include <beginnormal_vertex>", VERTEX_NORMAL)
      .replace("#include <begin_vertex>", "vec3 transformed = dPos;\nvRest = position;\nvRib = aRib;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_HEADER}`)
      .replace("#include <map_fragment>", FRAGMENT_COLOR);
  };
  return { material, uniforms };
}

/* ------------------------------------------------------------------- scene */

export async function createTeeScene(host: HTMLElement, { reduceMotion }: { reduceMotion: boolean }): Promise<TeeScene> {
  const [logo] = await Promise.all([
    loadImage(LOGO_SRC),
    document.fonts?.load('500 120px "Cormorant Garamond"').catch(() => undefined),
    document.fonts?.load("500 40px Inter").catch(() => undefined),
  ]);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "default" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = "walking-tee__canvas";
  canvas.setAttribute("aria-hidden", "true");

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = env;

  const key = new DirectionalLight(0xfff1e0, 2.4);
  key.position.set(-2, 3, 3);
  const rim = new DirectionalLight(0xd9a066, 2.6);
  rim.position.set(2.6, 1.4, -3);
  const rimLeft = new DirectionalLight(0xb7a58f, 1.1);
  rimLeft.position.set(-2.8, 0.6, -2.2);
  scene.add(key, rim, rimLeft, new HemisphereLight(0xb9b2a7, 0x1a1410, 0.3));

  const { geometry, perimeter } = buildTee();
  const map = fabricTexture(perimeter, logo);
  const { material, uniforms } = teeMaterial(map);
  const tee = new Mesh(geometry, material);
  scene.add(tee);

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const tanHalf = Math.tan(MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(2.6 / 2 / tanHalf, 2.15 / 2 / (tanHalf * camera.aspect));
    camera.position.set(0, dist * 0.05 - 0.26, dist);
    camera.lookAt(0, -0.27, 0);
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  };

  let elapsed = 0;
  let last = 0;
  let running = false;
  const update = (t: number) => {
    uniforms.uTime.value = t;
    uniforms.uPhase.value = (((t / STRIDE_SECONDS) % 1) * Math.PI * 2 + STRIDE_PHASE) % (Math.PI * 2);
    // Each half turn eases in and out, so the tee lingers front-on and back-on.
    const half = t / HALF_TURN_SECONDS;
    const k = Math.floor(half);
    const u = half - k;
    tee.rotation.y = Math.PI * ((k % 2) + 0.4 * u + 0.6 * u * u * (3 - 2 * u));
  };
  if (reduceMotion) {
    uniforms.uWalk.value = 0;
    tee.rotation.y = -0.45;
  } else {
    update(0);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  host.appendChild(canvas);
  resize();
  renderer.compile(scene, camera);

  const stop = () => {
    running = false;
    renderer.setAnimationLoop(null);
  };

  return {
    start() {
      if (running || reduceMotion) return;
      running = true;
      last = 0;
      renderer.setAnimationLoop((now) => {
        elapsed += last ? Math.min((now - last) / 1000, 0.1) : 0;
        last = now;
        update(elapsed);
        renderer.render(scene, camera);
      });
    },
    stop,
    dispose() {
      stop();
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      map.dispose();
      env.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
