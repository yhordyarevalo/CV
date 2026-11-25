import * as THREE from 'three';
import type { Room, SceneText } from '../data/content';
import { box, CanvasScreen, cyl, fit, invisibleHit, mat, roundRect, sphere, tag } from './util';

/* Colores de la marca (los mismos del CV clásico). */
const CORAL = '#f0997b';
const TEAL = '#5dcaa5';
const AMBER = '#ef9f27';
const BLUE = '#85b7eb';
const INK = '#e7eaf1';
const MUTED = '#8f99ae';
const MONO = 'ui-monospace, Menlo, Consolas, "Courier New", monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/* Posiciones clave (metros). La silla del avatar y el ratón se reutilizan en la escena. */
export const AVATAR_POS = new THREE.Vector3(0.65, 0, -0.95);
export const AVATAR_YAW = -2.28;
export const MOUSE_POS = new THREE.Vector3(0.62, 0.775, -1.5);

export interface FocusInfo {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

const EMPTY_TEXT: SceneText = {
  tips: {},
  eggs: {},
  lampOn: '',
  lampOff: '',
  screens: {
    experience: 'experience',
    education: 'education',
    projects: 'projects',
    contact: 'contact',
    open: 'open',
    hello: 'Hi',
    reply: 'Hello',
    posterTop: 'From design',
    posterBottom: 'to code',
  },
  hint: '',
  closePanel: '',
  openPanel: '',
};

/** Escritorio, pantallas, objetos y luces. */
export class Office {
  readonly group = new THREE.Group();
  /** Objetos tocables (con su marca de zona). */
  readonly hotspots: THREE.Object3D[] = [];

  private rooms: Room[] = [];
  private text: SceneText = EMPTY_TEXT;

  private readonly monitorScreen: CanvasScreen;
  private readonly laptopScreen: CanvasScreen;
  private readonly tabletScreen: CanvasScreen;
  private readonly phoneScreen: CanvasScreen;
  private readonly screens: CanvasScreen[];
  private readonly screenMeshes = new Map<string, THREE.Mesh>();

  private readonly hemi = new THREE.HemisphereLight(0xdde3ff, 0x3a3f4d, 0.9);
  private readonly key = new THREE.DirectionalLight(0xfff0e0, 1.6);
  private readonly fill = new THREE.DirectionalLight(0xffe9d6, 0.55);
  private readonly lampLight = new THREE.PointLight(0xffc58a, 2.4, 7, 2);
  private readonly lampBulb: THREE.MeshBasicMaterial;
  private lampOn = true;

  private readonly plant = new THREE.Group();
  private readonly leaves: THREE.Group[] = [];
  private plantBoost = 0;
  private readonly steam: THREE.Mesh[] = [];
  private steamBoost = 0;
  private lastSlow = -1;
  private lastFast = -1;

  constructor() {
    this.monitorScreen = new CanvasScreen(1024, 600, (c, w, h, t) => this.drawMonitor(c, w, h, t));
    this.laptopScreen = new CanvasScreen(640, 400, (c, w, h, t) => this.drawLaptop(c, w, h, t));
    this.tabletScreen = new CanvasScreen(640, 380, (c, w, h, t) => this.drawTablet(c, w, h, t));
    this.phoneScreen = new CanvasScreen(300, 600, (c, w, h, t) => this.drawPhone(c, w, h, t));
    this.screens = [this.monitorScreen, this.laptopScreen, this.tabletScreen, this.phoneScreen];

    this.lampBulb = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });

    this.buildLights();
    this.buildRoom();
    this.buildDesk();
    this.buildMonitor();
    this.buildKeyboardAndMouse();
    this.buildLaptop();
    this.buildTablet();
    this.buildPhone();
    this.buildLamp();
    this.buildMug();
    this.buildPlant();
    this.buildPoster();

    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !mesh.userData['noShadow']) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  /** Textos y datos del CV en el idioma actual. */
  setContent(rooms: Room[], text: SceneText): void {
    this.rooms = rooms;
    this.text = text;
    this.screens.forEach((s) => s.redraw(0));
  }

  /** Punto y normal de una pantalla (mundo), para colocar la cámara delante. */
  focusOf(id: string): FocusInfo | null {
    const mesh = this.screenMeshes.get(id);
    if (!mesh) {
      return null;
    }
    this.group.updateMatrixWorld(true);
    const point = mesh.getWorldPosition(new THREE.Vector3());
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()));
    return { point, normal };
  }

  toggleLamp(): boolean {
    this.lampOn = !this.lampOn;
    this.lampBulb.color.set(this.lampOn ? 0xffe2b0 : 0x3a3a3f);
    return this.lampOn;
  }

  isLampOn(): boolean {
    return this.lampOn;
  }

  react(id: string): void {
    if (id === 'plant') {
      this.plantBoost = 1;
    } else if (id === 'mug') {
      this.steamBoost = 1;
    }
  }

  update(dt: number, time: number): void {
    // Luces: transición suave entre lámpara encendida y apagada.
    const k = 1 - Math.exp(-dt * 6);
    this.lampLight.intensity += ((this.lampOn ? 2.4 : 0) - this.lampLight.intensity) * k;
    this.hemi.intensity += ((this.lampOn ? 0.9 : 0.3) - this.hemi.intensity) * k;
    this.key.intensity += ((this.lampOn ? 1.6 : 0.5) - this.key.intensity) * k;
    this.fill.intensity += ((this.lampOn ? 0.55 : 0.2) - this.fill.intensity) * k;

    // Pantallas animadas.
    const slow = Math.floor(time * 2);
    if (slow !== this.lastSlow) {
      this.lastSlow = slow;
      this.monitorScreen.redraw(time);
    }
    const fast = Math.floor(time * 10);
    if (fast !== this.lastFast) {
      this.lastFast = fast;
      this.laptopScreen.redraw(time);
      this.tabletScreen.redraw(time);
      this.phoneScreen.redraw(time);
    }

    // Planta.
    this.plantBoost = Math.max(0, this.plantBoost - dt * 0.6);
    const sway = 0.02 + this.plantBoost * 0.14;
    this.plant.rotation.z = Math.sin(time * 1.2 + (this.plantBoost > 0 ? 6 * this.plantBoost : 0)) * sway;
    this.leaves.forEach((leaf, i) => {
      leaf.rotation.z = Math.sin(time * 1.6 + i) * (0.015 + this.plantBoost * 0.08);
    });

    // Vapor de la taza.
    this.steamBoost = Math.max(0, this.steamBoost - dt * 0.5);
    this.steam.forEach((puff, i) => {
      const phase = (time * (0.35 + this.steamBoost * 0.5) + i / this.steam.length) % 1;
      puff.position.set(Math.sin(phase * 6 + i) * 0.012, 0.1 + phase * 0.16, 0);
      const puffMat = puff.material as THREE.MeshBasicMaterial;
      puffMat.opacity = (1 - phase) * (0.14 + this.steamBoost * 0.26);
      puff.scale.setScalar(0.7 + phase * 1.4);
    });
  }

  dispose(): void {
    this.screens.forEach((s) => s.dispose());
  }

  /* ---------------------------------------------------------------- */
  /* Construcción                                                      */
  /* ---------------------------------------------------------------- */

  private buildLights(): void {
    this.key.position.set(-3, 4.5, 3.5);
    this.key.target.position.set(0, 0.4, -1.2);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const cam = this.key.shadow.camera;
    cam.left = -4;
    cam.right = 4;
    cam.top = 4;
    cam.bottom = -4;
    cam.near = 1;
    cam.far = 14;
    this.key.shadow.bias = -0.0005;
    this.key.shadow.normalBias = 0.025;
    this.fill.position.set(4, 3, 3);
    this.group.add(this.hemi, this.key, this.key.target, this.fill, this.lampLight);
  }

  private buildRoom(): void {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(11, 9), mat(0x343948, 0.9));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    this.group.add(floor);

    const rug = cyl(1.5, 1.5, 0.012, mat(0x26424a, 1), 0.1, 0.006, -0.4, 64);
    this.group.add(rug);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.8), mat(0x2a3040, 0.95));
    back.position.set(0.5, 1.9, -2.2);
    this.group.add(back);

    const side = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.8), mat(0x262b38, 0.95));
    side.rotation.y = -Math.PI / 2;
    side.position.set(3.2, 1.9, -0.3);
    this.group.add(side);

    // Tiras LED con los colores de la marca (diseño coral, código verde).
    const coral = new THREE.MeshBasicMaterial({ color: 0xf0997b });
    const teal = new THREE.MeshBasicMaterial({ color: 0x5dcaa5 });
    const ledBack = box(11, 0.035, 0.02, coral, 0.5, 0.06, -2.19);
    const ledSide = box(0.02, 0.035, 9, teal, 3.19, 0.06, -0.3);
    const ledTop = box(11, 0.03, 0.02, teal, 0.5, 3.1, -2.19);
    [ledBack, ledSide, ledTop].forEach((m) => (m.userData['noShadow'] = true));
    this.group.add(ledBack, ledSide, ledTop);
  }

  private buildDesk(): void {
    const wood = mat(0x6b5442, 0.65);
    const metal = mat(0x15171c, 0.5, 0.3);
    this.group.add(box(4.0, 0.06, 1.0, wood, -0.2, 0.73, -1.65));
    for (const x of [-2.1, 1.7]) {
      for (const z of [-2.07, -1.23]) {
        this.group.add(box(0.05, 0.7, 0.05, metal, x, 0.35, z));
      }
    }
    this.group.add(box(3.8, 0.25, 0.02, metal, -0.2, 0.55, -2.08));
  }

  private buildMonitor(): void {
    const g = new THREE.Group();
    g.position.set(-0.55, 0.76, -1.85);
    g.rotation.y = 0.55;

    const black = mat(0x0b0c10, 0.5, 0.2);
    g.add(cyl(0.15, 0.17, 0.02, black, 0, 0.01, 0.02));
    g.add(box(0.05, 0.36, 0.03, black, 0, 0.2, -0.03));
    g.add(box(1.3, 0.78, 0.045, black, 0, 0.62, 0));
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, 0.7),
      new THREE.MeshBasicMaterial({ map: this.monitorScreen.texture }),
    );
    screen.position.set(0, 0.62, 0.0235);
    screen.userData['noShadow'] = true;
    g.add(screen);
    this.screenMeshes.set('monitor', screen);

    tag(g, 'monitor');
    this.hotspots.push(g);
    this.group.add(g);
  }

  private buildKeyboardAndMouse(): void {
    const kb = new THREE.Group();
    kb.position.set(0.16, 0.769, -1.37);
    kb.rotation.y = AVATAR_YAW;
    kb.add(box(0.44, 0.018, 0.14, mat(0x1a1c22, 0.6)));

    const keysTex = new CanvasScreen(512, 160, (ctx, w, h) => {
      ctx.fillStyle = '#1a1c22';
      ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 14; c++) {
          ctx.fillStyle = r === 4 && c > 2 && c < 10 ? '#3a3f4d' : '#2d313c';
          roundRect(ctx, 10 + c * 34.5, 10 + r * 28.5, 30, 24, 4);
          ctx.fill();
        }
      }
    });
    const keys = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.13),
      new THREE.MeshBasicMaterial({ map: keysTex.texture }),
    );
    keys.rotation.x = -Math.PI / 2;
    keys.position.y = 0.0095;
    keys.userData['noShadow'] = true;
    kb.add(keys);
    this.group.add(kb);
    this.screens.push(keysTex);

    this.group.add(box(0.3, 0.004, 0.26, mat(0x14161b, 1), MOUSE_POS.x, 0.762, MOUSE_POS.z));
    const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 12), mat(0x22252c, 0.5));
    mouse.scale.set(0.7, 0.4, 1.1);
    mouse.position.set(MOUSE_POS.x, 0.775, MOUSE_POS.z);
    mouse.rotation.y = AVATAR_YAW;
    this.group.add(mouse);
  }

  private buildLaptop(): void {
    const g = new THREE.Group();
    g.position.set(-1.65, 0.76, -1.62);
    g.rotation.y = -0.5;

    const alu = mat(0x8e939c, 0.5, 0.4);
    g.add(box(0.46, 0.016, 0.32, alu, 0, 0.008, 0));
    const lid = new THREE.Group();
    lid.position.set(0, 0.016, -0.15);
    lid.rotation.x = -0.3;
    lid.add(box(0.46, 0.3, 0.012, alu, 0, 0.15, 0));
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.43, 0.27),
      new THREE.MeshBasicMaterial({ map: this.laptopScreen.texture }),
    );
    screen.position.set(0, 0.15, 0.0067);
    screen.userData['noShadow'] = true;
    lid.add(screen);
    g.add(lid);
    this.screenMeshes.set('laptop', screen);

    tag(g, 'laptop');
    this.hotspots.push(g);
    this.group.add(g);
  }

  private buildTablet(): void {
    const g = new THREE.Group();
    g.position.set(-1.0, 0.76, -1.2);
    g.rotation.y = -0.3;

    const tilt = new THREE.Group();
    tilt.position.y = 0.05;
    tilt.rotation.x = 0.4;
    tilt.add(box(0.44, 0.014, 0.28, mat(0x111318, 0.4, 0.3)));
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.41, 0.245),
      new THREE.MeshBasicMaterial({ map: this.tabletScreen.texture }),
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.y = 0.0075;
    screen.userData['noShadow'] = true;
    tilt.add(screen);
    g.add(tilt);
    // Patas del soporte.
    g.add(box(0.36, 0.045, 0.02, mat(0x111318, 0.5), 0, 0.022, -0.1));
    // Lápiz óptico.
    const pen = cyl(0.006, 0.006, 0.16, mat(0xe9e6df, 0.4), 0.27, 0.007, 0.02, 10);
    pen.rotation.z = Math.PI / 2;
    pen.rotation.y = 0.5;
    g.add(pen);

    this.screenMeshes.set('tablet', screen);
    tag(g, 'tablet');
    this.hotspots.push(g);
    this.group.add(g);
  }

  private buildPhone(): void {
    const g = new THREE.Group();
    g.position.set(1.45, 0.76, -1.5);
    g.rotation.y = 0.25;

    g.add(box(0.1, 0.014, 0.08, mat(0x1a1c22, 0.5), 0, 0.007, 0.02));
    const tilt = new THREE.Group();
    tilt.position.set(0, 0.095, 0);
    tilt.rotation.x = -0.28;
    tilt.add(box(0.075, 0.152, 0.008, mat(0x0b0c10, 0.3, 0.4)));
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.068, 0.144),
      new THREE.MeshBasicMaterial({ map: this.phoneScreen.texture }),
    );
    screen.position.z = 0.0045;
    screen.userData['noShadow'] = true;
    tilt.add(screen);
    g.add(tilt);
    this.screenMeshes.set('phone', screen);

    tag(g, 'phone');
    this.hotspots.push(g);
    this.group.add(g);
  }

  private buildLamp(): void {
    const g = new THREE.Group();
    g.position.set(-2.0, 0.76, -1.95);
    const metal = mat(0x2a2d36, 0.4, 0.5);
    g.add(cyl(0.09, 0.1, 0.02, metal, 0, 0.01, 0));
    const arm1 = box(0.016, 0.34, 0.016, metal, 0.05, 0.19, 0);
    arm1.rotation.z = -0.28;
    const arm2 = box(0.016, 0.3, 0.016, metal, 0.2, 0.36, 0);
    arm2.rotation.z = 1.0;
    g.add(arm1, arm2);
    g.add(sphere(0.02, metal, 0.075, 0.35, 0));

    const shade = cyl(0.03, 0.095, 0.13, mat(0xe4573d, 0.6), 0.33, 0.42, 0, 24);
    shade.rotation.z = -0.55;
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), this.lampBulb);
    bulb.position.set(0.355, 0.375, 0);
    bulb.userData['noShadow'] = true;
    g.add(bulb);
    this.lampLight.position.set(-2.0 + 0.36, 0.76 + 0.34, -1.95);

    // Zona de clic generosa: el brazo es muy fino y costaría acertar.
    const hit = invisibleHit(new THREE.BoxGeometry(0.46, 0.5, 0.2));
    hit.position.set(0.2, 0.27, 0);
    g.add(hit);

    tag(g, 'lamp');
    this.hotspots.push(g);
    this.group.add(g);
  }

  private buildMug(): void {
    const g = new THREE.Group();
    g.position.set(1.15, 0.76, -1.28);
    g.add(cyl(0.036, 0.032, 0.085, mat(0xe9e6df, 0.5), 0, 0.0425, 0, 24));
    g.add(cyl(0.031, 0.031, 0.002, mat(0x3a2418, 0.4), 0, 0.0862, 0, 24));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 16), mat(0xe9e6df, 0.5));
    handle.position.set(0.04, 0.045, 0);
    g.add(handle);

    const steamMat = (): THREE.MeshBasicMaterial =>
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), steamMat());
      puff.userData['noShadow'] = true;
      this.steam.push(puff);
      g.add(puff);
    }

    tag(g, 'mug');
    this.hotspots.push(g);
    this.group.add(g);
  }

  private buildPlant(): void {
    this.plant.position.set(-2.55, 0, -1.7);
    this.plant.add(cyl(0.18, 0.13, 0.3, mat(0xb8694a, 0.85), 0, 0.15, 0, 24));
    this.plant.add(cyl(0.17, 0.17, 0.02, mat(0x2a1d16, 1), 0, 0.3, 0, 24));

    const greens = [0x2f9e6e, 0x3bb583, 0x258a5d];
    for (let i = 0; i < 9; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(0, 0.3, 0);
      pivot.rotation.y = (i / 9) * Math.PI * 2 + i * 0.4;
      const lean = new THREE.Group();
      lean.rotation.z = 0.35 + (i % 3) * 0.22;
      const leaf = sphere(0.1, mat(greens[i % 3], 0.8), 0, 0.22 + (i % 3) * 0.05, 0, 0.55, 2.1 + (i % 2) * 0.4, 0.14);
      lean.add(leaf);
      pivot.add(lean);
      this.leaves.push(lean);
      this.plant.add(pivot);
    }

    tag(this.plant, 'plant');
    this.hotspots.push(this.plant);
    this.group.add(this.plant);
  }

  private buildPoster(): void {
    const g = new THREE.Group();
    g.position.set(0.45, 2.0, -2.19);
    g.add(box(0.96, 1.31, 0.02, mat(0x0b0c10, 0.6), 0, 0, -0.005));
    const tex = new CanvasScreen(512, 700, (ctx, w, h) => this.drawPoster(ctx, w, h));
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.25),
      new THREE.MeshBasicMaterial({ map: tex.texture }),
    );
    poster.position.z = 0.006;
    poster.userData['noShadow'] = true;
    g.add(poster);
    this.screens.push(tex);

    tag(g, 'poster');
    this.hotspots.push(g);
    this.group.add(g);
  }

  /* ---------------------------------------------------------------- */
  /* Contenido de las pantallas                                        */
  /* ---------------------------------------------------------------- */

  private drawMonitor(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f1320');
    bg.addColorStop(1, '#171d31');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1b2133';
    ctx.fillRect(0, 0, w, 54);
    ['#f0997b', '#ef9f27', '#5dcaa5'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(34 + i * 32, 27, 9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = MUTED;
    ctx.font = `24px ${MONO}`;
    ctx.fillText(`~/${this.text.screens.experience}`, 150, 35);

    const items = this.rooms[2]?.items ?? [];
    const rowH = 118;
    items.slice(0, 4).forEach((item, i) => {
      const y = 96 + i * rowH;
      const color = i % 2 === 0 ? CORAL : TEAL;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(62, y + 26, 11, 0, Math.PI * 2);
      ctx.fill();
      if (i < Math.min(items.length, 4) - 1) {
        ctx.fillRect(60, y + 40, 4, rowH - 28);
      }
      ctx.fillStyle = INK;
      ctx.font = `600 32px ${SANS}`;
      ctx.fillText(fit(ctx, item.title, w - 150), 100, y + 36);
      ctx.fillStyle = MUTED;
      ctx.font = `24px ${SANS}`;
      ctx.fillText(fit(ctx, item.meta ?? '', w - 150), 100, y + 72);
    });

    ctx.fillStyle = AMBER;
    ctx.font = `26px ${MONO}`;
    const caret = Math.floor(t * 2) % 2 === 0 ? '_' : ' ';
    ctx.fillText(`> ${this.text.screens.open}${caret}`, 40, h - 26);
  }

  private drawLaptop(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    ctx.fillStyle = '#10141c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1b2130';
    ctx.fillRect(0, 0, w, 40);
    ctx.fillStyle = MUTED;
    ctx.font = `20px ${MONO}`;
    ctx.fillText(`${this.text.screens.education}.ts`, 20, 27);

    const items = this.rooms[3]?.items ?? [];
    const lines: Array<{ text: string; indent: number; kind: 'kw' | 'str' | 'plain' }> = [
      { text: `const ${this.text.screens.education} = [`, indent: 0, kind: 'kw' },
    ];
    items.slice(0, 5).forEach((it) => {
      lines.push({ text: `'${it.title.replace(/\s*\(.*\)/, '')}',`, indent: 1, kind: 'str' });
    });
    lines.push({ text: '];', indent: 0, kind: 'plain' });

    ctx.font = `22px ${MONO}`;
    lines.forEach((ln, i) => {
      const y = 82 + i * 38;
      ctx.fillStyle = '#4a5368';
      ctx.fillText(String(i + 1).padStart(2, ' '), 14, y);
      ctx.fillStyle = ln.kind === 'kw' ? '#ed93b1' : ln.kind === 'str' ? AMBER : INK;
      ctx.fillText(fit(ctx, ln.text, w - 90 - ln.indent * 30), 56 + ln.indent * 30, y);
    });
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = TEAL;
      ctx.fillRect(56, 82 + lines.length * 38 - 20, 12, 26);
    }
  }

  private drawTablet(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    ctx.fillStyle = '#12151d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#242a3a';
    for (let x = 20; x < w; x += 32) {
      for (let y = 20; y < h; y += 32) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.fillStyle = MUTED;
    ctx.font = `20px ${MONO}`;
    ctx.fillText(this.text.screens.projects, 20, 34);

    // Boceto que se dibuja solo: marco, círculo y curva.
    ctx.strokeStyle = CORAL;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const progress = (t * 0.3) % 1.5;
    const shapes: Array<Array<[number, number]>> = [
      [[90, 80], [550, 80], [550, 320], [90, 320], [90, 80]],
      [[120, 110], [300, 110], [300, 220], [120, 220], [120, 110]],
    ];
    const circle: Array<[number, number]> = [];
    for (let a = 0; a <= 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      circle.push([440 + Math.cos(ang) * 50, 170 + Math.sin(ang) * 50]);
    }
    shapes.push(circle);
    const wave: Array<[number, number]> = [];
    for (let x = 0; x <= 20; x++) {
      wave.push([330 + x * 11, 270 + Math.sin(x * 0.5) * 18]);
    }
    shapes.push(wave);

    const total = shapes.length;
    shapes.forEach((pts, si) => {
      const local = THREE.MathUtils.clamp(progress * total * 0.7 - si * 0.7 + 0.35, 0, 1);
      const n = Math.max(1, Math.floor(local * (pts.length - 1)));
      if (local <= 0) {
        return;
      }
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= n; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
    });
  }

  private drawPhone(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#171d31');
    bg.addColorStop(1, '#0f1320');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = INK;
    ctx.font = `600 26px ${SANS}`;
    ctx.fillText(this.text.screens.contact, 24, 60);
    ctx.fillStyle = '#242a3a';
    ctx.fillRect(0, 84, w, 2);

    ctx.fillStyle = '#2a3148';
    roundRect(ctx, 20, 120, 170, 64, 20);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `26px ${SANS}`;
    ctx.fillText(this.text.screens.hello, 40, 162);

    ctx.fillStyle = TEAL;
    roundRect(ctx, 110, 220, 170, 64, 20);
    ctx.fill();
    ctx.fillStyle = '#0b1612';
    ctx.fillText(this.text.screens.reply, 134, 262);

    // Puntos de "escribiendo…".
    ctx.fillStyle = '#2a3148';
    roundRect(ctx, 20, 320, 110, 56, 18);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = Math.floor(t * 3) % 3 === i ? INK : MUTED;
      ctx.beginPath();
      ctx.arc(48 + i * 28, 348, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    const mail = this.rooms[5]?.items?.[0]?.meta ?? '';
    ctx.fillStyle = AMBER;
    ctx.font = `20px ${MONO}`;
    ctx.fillText(fit(ctx, mail, w - 40), 20, h - 60);
  }

  private drawPoster(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = '#12151d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a1620';
    ctx.fillRect(0, 0, w / 2, h);
    ctx.fillStyle = '#0f1a1c';
    ctx.fillRect(w / 2, 0, w / 2, h);

    ctx.strokeStyle = CORAL;
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 70, 170, 120);
    ctx.beginPath();
    ctx.arc(120, 300, 50, 0, Math.PI * 2);
    ctx.moveTo(40, 420);
    ctx.bezierCurveTo(100, 360, 160, 480, 220, 410);
    ctx.stroke();

    ctx.fillStyle = TEAL;
    ctx.font = `22px ${MONO}`;
    ['<div>', '  const x', '  = 42;', '</div>', 'ng serve', 'signal()'].forEach((l, i) => {
      ctx.fillText(l, 290, 100 + i * 40);
    });

    ctx.fillStyle = INK;
    ctx.font = `700 54px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(this.text.screens.posterTop, w / 2, h - 150);
    ctx.fillStyle = AMBER;
    ctx.fillText(this.text.screens.posterBottom, w / 2, h - 80);
    ctx.textAlign = 'left';
  }
}
