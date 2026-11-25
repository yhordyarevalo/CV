import * as THREE from 'three';

export const mat = (
  color: number,
  roughness = 0.85,
  metalness = 0,
): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** Generador pseudoaleatorio determinista: el pelo queda igual en cada carga. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Marca un objeto como zona interactiva. */
export function tag<T extends THREE.Object3D>(obj: T, id: string): T {
  obj.userData['hotspot'] = id;
  return obj;
}

/** Sube por el árbol hasta encontrar la marca de zona interactiva. */
export function hotspotOf(obj: THREE.Object3D | null): string | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    const id: unknown = o.userData['hotspot'];
    if (typeof id === 'string') {
      return id;
    }
    o = o.parent;
  }
  return null;
}

export function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

export function cyl(
  rTop: number,
  rBottom: number,
  h: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  segments = 24,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material);
  m.position.set(x, y, z);
  return m;
}

export function sphere(
  r: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

export function invisibleHit(geometry: THREE.BufferGeometry): THREE.Mesh {
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Recorta un texto con puntos suspensivos para que quepa en un ancho. */
export function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

export type DrawFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
) => void;

/** Lienzo 2D que se usa como textura de una pantalla. */
export class CanvasScreen {
  readonly texture: THREE.CanvasTexture;
  private readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly drawFn: DrawFn,
  ) {
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D no disponible');
    }
    this.ctx = ctx;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.redraw(0);
  }

  redraw(time: number): void {
    this.drawFn(this.ctx, this.width, this.height, time);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
