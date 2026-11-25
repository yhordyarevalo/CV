import * as THREE from 'three';
import type { Room, SceneText } from '../data/content';
import { Avatar } from './avatar';
import { AVATAR_POS, AVATAR_YAW, MOUSE_POS, Office } from './office';
import { hotspotOf } from './util';

export interface HotspotInfo {
  /** Parada en la que estaba la cámara justo antes del clic. */
  stopBefore: number;
  lampOn: boolean;
}

export interface SceneCallbacks {
  /** La parada más cercana cambió (0 = entrada … 5 = contacto). */
  onStop(index: number): void;
  /** Clic o toque en una zona interactiva. */
  onHotspot(id: string, info: HotspotInfo): void;
  /** Ratón sobre una zona (o null al salir). Coordenadas de cliente. */
  onHover(id: string | null, x: number, y: number): void;
}

interface Stop {
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

/** Zonas que llevan a una parada del recorrido. */
const HOTSPOT_STOP: Record<string, number> = {
  eyes: 1,
  monitor: 2,
  laptop: 3,
  tablet: 4,
  phone: 5,
};

const STOP_COUNT = 6;
const UP = new THREE.Vector3(0, 1, 0);

export class CvScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);
  private readonly office = new Office();
  private readonly avatar = new Avatar(MOUSE_POS);
  private readonly raycaster = new THREE.Raycaster();
  private readonly stops: Stop[] = [];

  private raf = 0;
  private last = performance.now();
  private readonly start = performance.now();
  private cleanups: Array<() => void> = [];

  private progress = 0;
  private progressTarget = 0;
  private snapAt = 0;
  private gestureStart = 0;
  private stop = 0;

  private readonly pointer = new THREE.Vector2();
  private pointerClient = { x: 0, y: 0 };
  private pointerInside = false;
  private pointerMovedAt = -99;
  private pointerDirty = false;
  private hovered: string | null = null;
  private lookAtCameraUntil = 0;

  private insetLeft = 0;
  private insetBottom = 0;

  private readonly lookTarget = new THREE.Vector3();
  private monitorPoint = new THREE.Vector3(-0.55, 1.38, -1.85);
  private readonly camPos = new THREE.Vector3();
  private readonly camTarget = new THREE.Vector3();

  constructor(
    private readonly host: HTMLElement,
    private readonly cb: SceneCallbacks,
    private readonly reducedMotion: boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x12151d);
    this.scene.add(this.office.group);

    this.avatar.group.position.copy(AVATAR_POS);
    this.avatar.group.rotation.y = AVATAR_YAW;
    this.scene.add(this.avatar.group);

    // Luz de relleno pegada a la cámara: solo se nota de cerca (retratos y pantallas).
    const camLight = new THREE.PointLight(0xfff1e6, 2.2, 9, 2);
    camLight.position.set(-0.3, 0.3, 0.2);
    this.camera.add(camLight);
    this.scene.add(this.camera);
    this.scene.updateMatrixWorld(true);

    this.buildStops();
    this.applyCamera(0);
    this.bindEvents();
    this.resize();
    this.cb.onStop(0);

    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  setContent(rooms: Room[], text: SceneText): void {
    this.office.setContent(rooms, text);
  }

  /** Márgenes ocupados por el panel de texto, para centrar la escena en el espacio libre. */
  setInset(left: number, bottom: number): void {
    this.insetLeft = left;
    this.insetBottom = bottom;
    this.resize();
  }

  getStop(): number {
    return this.stop;
  }

  goTo(index: number): void {
    const i = THREE.MathUtils.clamp(Math.round(index), 0, STOP_COUNT - 1);
    this.progressTarget = i / (STOP_COUNT - 1);
    this.snapAt = 0;
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const list = Array.isArray(material) ? material : material ? [material] : [];
      for (const m of list) {
        m.dispose();
      }
    });
    this.office.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /* ---------------------------------------------------------------- */
  /* Recorrido de cámara                                               */
  /* ---------------------------------------------------------------- */

  private buildStops(): void {
    const stops = this.stops;

    // 0 · Plano general de la habitación.
    stops.push({
      pos: new THREE.Vector3(-3.1, 2.3, 2.9),
      target: new THREE.Vector3(0.05, 0.95, -1.25),
    });

    // 1 · Retrato de tres cuartos del avatar.
    const head = this.avatar.headWorld(new THREE.Vector3());
    const facing = new THREE.Vector3(Math.sin(AVATAR_YAW), 0, Math.cos(AVATAR_YAW));
    const side = facing.clone().applyAxisAngle(UP, 0.8);
    stops.push({
      pos: head.clone().addScaledVector(side, 0.95).add(new THREE.Vector3(0, 0.06, 0)),
      target: head.clone().add(new THREE.Vector3(0, -0.04, 0)),
    });

    // 2-5 · Pantallas y objetos: la cámara se coloca delante de cada una.
    const framing: Array<[string, number, number]> = [
      ['monitor', 1.75, 0.06],
      ['laptop', 1.1, 0.05],
      ['tablet', 0.8, 0.0],
      ['phone', 0.55, 0.0],
    ];
    const monitor = this.office.focusOf('monitor');
    if (monitor) {
      this.monitorPoint.copy(monitor.point);
    }
    for (const [id, dist, lift] of framing) {
      const focus = this.office.focusOf(id);
      if (!focus) {
        stops.push({ pos: stops[0].pos.clone(), target: stops[0].target.clone() });
        continue;
      }
      // La tableta está inclinada: se mira desde menos arriba para que no quede en picado.
      const dir = focus.normal.clone();
      if (id === 'tablet') {
        dir.y *= 0.45;
        dir.normalize();
      }
      stops.push({
        pos: focus.point.clone().addScaledVector(dir, dist).add(new THREE.Vector3(0, lift, 0)),
        target: focus.point.clone(),
      });
    }
  }

  private applyCamera(time: number): void {
    const u = THREE.MathUtils.clamp(this.progress, 0, 1) * (STOP_COUNT - 1);
    const i = Math.min(Math.floor(u), STOP_COUNT - 2);
    const f = u - i;
    // Se queda quieta un momento en cada parada.
    const k = THREE.MathUtils.smoothstep(f, 0.15, 0.85);
    const a = this.stops[i];
    const b = this.stops[i + 1];
    this.camPos.lerpVectors(a.pos, b.pos, k);
    this.camTarget.lerpVectors(a.target, b.target, k);

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);

    // Paralaje suave con el ratón.
    if (!this.reducedMotion) {
      this.camera.translateX(this.pointer.x * 0.1);
      this.camera.translateY(this.pointer.y * 0.05);
      this.camera.translateX(Math.sin(time * 0.3) * 0.012);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Entrada del usuario                                               */
  /* ---------------------------------------------------------------- */

  private bindEvents(): void {
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';

    const clamp = THREE.MathUtils.clamp;

    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      if (this.snapAt === 0) {
        this.gestureStart = this.nearestStopValue(this.progressTarget);
      }
      this.progressTarget = clamp(this.progressTarget + e.deltaY * 0.0006, 0, 1);
      this.snapAt = performance.now() + 380;
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const toNdc = (e: PointerEvent): void => {
      const rect = el.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      );
      this.pointerClient = { x: e.clientX, y: e.clientY };
    };

    let downX = 0;
    let downY = 0;
    let lastY = 0;
    let dragged = false;

    const onDown = (e: PointerEvent): void => {
      toNdc(e);
      downX = e.clientX;
      downY = e.clientY;
      lastY = e.clientY;
      dragged = false;
    };
    const onMove = (e: PointerEvent): void => {
      toNdc(e);
      this.pointerInside = true;
      this.pointerMovedAt = performance.now();
      this.pointerDirty = true;
      if (e.pointerType === 'touch' && e.buttons !== 0) {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) {
          dragged = true;
        }
        if (dragged) {
          if (this.snapAt === 0) {
            this.gestureStart = this.nearestStopValue(this.progressTarget);
          }
          this.progressTarget = clamp(this.progressTarget + (lastY - e.clientY) * 0.0022, 0, 1);
          this.snapAt = performance.now() + 350;
        }
        lastY = e.clientY;
      }
    };
    const onUp = (e: PointerEvent): void => {
      toNdc(e);
      const still = Math.hypot(e.clientX - downX, e.clientY - downY) < 8;
      if (still && !dragged) {
        this.pointerDirty = false;
        this.handleHotspot(this.pick());
      }
    };
    const onLeave = (): void => {
      this.pointerInside = false;
      this.setHover(null, 0, 0);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);

    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }
      if ((e.key === ' ' || e.key === 'Enter') && (tag === 'BUTTON' || tag === 'A')) {
        return;
      }
      const next = ['ArrowDown', 'ArrowRight', 'PageDown', 's', 'S', 'd', 'D', ' '];
      const prev = ['ArrowUp', 'ArrowLeft', 'PageUp', 'w', 'W', 'a', 'A'];
      if (next.includes(e.key)) {
        e.preventDefault();
        this.goTo(this.stop + 1);
      } else if (prev.includes(e.key)) {
        e.preventDefault();
        this.goTo(this.stop - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        this.goTo(STOP_COUNT - 1);
      }
    };
    window.addEventListener('keydown', onKey);

    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.host);

    this.cleanups.push(() => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKey);
      observer.disconnect();
    });
  }

  private nearestStopValue(v: number): number {
    return Math.round(v * (STOP_COUNT - 1)) / (STOP_COUNT - 1);
  }

  /** Zona interactiva bajo el puntero (respeta lo que tapa a qué). */
  private pick(): string | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([this.office.group, this.avatar.group], true);
    for (const hit of hits) {
      const mesh = hit.object as THREE.Mesh;
      // Las cajas invisibles del avatar solo cuentan si nada las tapa; el resto de mallas bloquean.
      const id = hotspotOf(hit.object);
      if (id) {
        return id;
      }
      if (mesh.isMesh && !(mesh.material as THREE.Material).transparent) {
        return null;
      }
    }
    return null;
  }

  private setHover(id: string | null, x: number, y: number): void {
    if (id !== this.hovered) {
      this.hovered = id;
      this.renderer.domElement.style.cursor = id ? 'pointer' : 'default';
    }
    this.cb.onHover(id, x, y);
  }

  private handleHotspot(id: string | null): void {
    if (!id) {
      return;
    }
    const info: HotspotInfo = { stopBefore: this.stop, lampOn: this.office.isLampOn() };

    switch (id) {
      case 'eyes':
        this.avatar.poke();
        this.lookAtCameraUntil = performance.now() + 3600;
        break;
      case 'head':
        this.avatar.ruffle();
        break;
      case 'lamp':
        info.lampOn = this.office.toggleLamp();
        break;
      case 'plant':
      case 'mug':
        this.office.react(id);
        break;
      default:
        break;
    }

    const stop = HOTSPOT_STOP[id];
    if (stop !== undefined) {
      this.goTo(stop);
    }
    this.cb.onHotspot(id, info);
  }

  /* ---------------------------------------------------------------- */
  /* Tamaño y bucle                                                    */
  /* ---------------------------------------------------------------- */

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    if (this.insetLeft > 0 || this.insetBottom > 0) {
      this.camera.setViewOffset(w, h, -this.insetLeft / 2, this.insetBottom / 2, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
  }

  private tick(now: number): void {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const time = (now - this.start) / 1000;

    // Scroll suave y ajuste a la parada más cercana cuando se deja de mover.
    if (this.snapAt > 0 && now > this.snapAt) {
      // Una muesca de rueda o un gesto corto avanza una parada; uno largo avanza varias.
      const per = 1 / (STOP_COUNT - 1);
      const delta = this.progressTarget - this.gestureStart;
      const steps = Math.abs(delta) < per * 0.06 ? 0 : Math.max(1, Math.round(Math.abs(delta) / per));
      this.progressTarget = THREE.MathUtils.clamp(this.gestureStart + Math.sign(delta) * steps * per, 0, 1);
      this.snapAt = 0;
    }
    const k = this.reducedMotion ? 0.35 : 1 - Math.exp(-dt * 4.5);
    this.progress += (this.progressTarget - this.progress) * k;

    const stop = THREE.MathUtils.clamp(Math.round(this.progress * (STOP_COUNT - 1)), 0, STOP_COUNT - 1);
    if (stop !== this.stop) {
      this.stop = stop;
      this.cb.onStop(stop);
    }

    this.applyCamera(time);

    // Hover (una vez por fotograma).
    if (this.pointerDirty && this.pointerInside) {
      this.pointerDirty = false;
      this.setHover(this.pick(), this.pointerClient.x, this.pointerClient.y);
    }

    this.updateLook(now, time);
    this.avatar.update(dt, time, this.lookTarget);
    this.office.update(dt, time);

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  /** A dónde mira el avatar: al cursor, a la cámara o a su pantalla. */
  private updateLook(now: number, time: number): void {
    const lookAtCamera =
      now < this.lookAtCameraUntil || (this.stop === 1 && this.progress > 0.12 && this.progress < 0.28);
    const pointerRecent = this.pointerInside && now - this.pointerMovedAt < 2500;
    const glance = time % 11 > 8.6;

    if (lookAtCamera) {
      this.lookTarget.copy(this.camera.position);
    } else if (pointerRecent) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.lookTarget.copy(this.raycaster.ray.origin).addScaledVector(this.raycaster.ray.direction, 1.8);
    } else if (glance) {
      this.lookTarget.copy(this.camera.position);
    } else {
      this.lookTarget.copy(this.monitorPoint);
    }
  }
}
