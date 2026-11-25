import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SCENE_TEXT } from '../data/content';
import { I18nService } from '../i18n/i18n.service';
import { CvScene, HotspotInfo } from './cv-scene';

/** Zonas que llevan a una sección del CV (el resto son pequeñas sorpresas). */
const SECTION_HOTSPOTS = ['eyes', 'monitor', 'laptop', 'tablet', 'phone'];

@Component({
  selector: 'app-world',
  imports: [RouterLink],
  templateUrl: './world.page.html',
  styleUrl: './world.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldPage implements AfterViewInit, OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly zone = inject(NgZone);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  readonly ui = this.i18n.ui;
  readonly rooms = this.i18n.rooms;
  readonly sceneText = computed(() => SCENE_TEXT[this.i18n.lang()]);

  readonly current = signal(0);
  readonly webglOk = signal(true);
  readonly panelOpen = signal(true);
  readonly hintVisible = signal(true);
  readonly toast = signal<string | null>(null);
  readonly tip = signal<{ text: string; x: number; y: number } | null>(null);
  readonly room = computed(() => this.rooms()[this.current()]);

  private scene?: CvScene;
  private toastTimer = 0;
  private hintTimer = 0;
  private readonly eggCount: Record<string, number> = {};
  private readonly onResize = (): void => this.updateInset();

  constructor() {
    // Al cambiar el idioma, las pantallas de la escena se redibujan con los textos nuevos.
    effect(() => {
      const rooms = this.rooms();
      const text = this.sceneText();
      this.scene?.setContent(rooms, text);
    });

    // El panel de texto ocupa sitio: la escena se recentra en el espacio libre.
    effect(() => {
      this.panelOpen();
      this.updateInset();
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      try {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.scene = new CvScene(
          this.host().nativeElement,
          {
            onStop: (i) => this.zone.run(() => this.onStop(i)),
            onHotspot: (id, info) => this.zone.run(() => this.onHotspot(id, info)),
            onHover: (id, x, y) => this.onHover(id, x, y),
          },
          reduced,
        );
        this.scene.setContent(this.rooms(), this.sceneText());
        this.updateInset();
        window.addEventListener('resize', this.onResize);
      } catch {
        this.webglOk.set(false);
      }
    });
    this.hintTimer = window.setTimeout(() => this.hintVisible.set(false), 9000);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.clearTimeout(this.toastTimer);
    window.clearTimeout(this.hintTimer);
    this.scene?.dispose();
  }

  /** Salta a una parada desde el menú inferior. */
  go(index: number): void {
    this.scene?.goTo(index);
    this.panelOpen.set(true);
    this.hintVisible.set(false);
  }

  private onStop(index: number): void {
    this.current.set(index);
    if (index !== 0) {
      this.hintVisible.set(false);
    }
  }

  private onHotspot(id: string, info: HotspotInfo): void {
    this.hintVisible.set(false);
    this.tip.set(null);

    if (SECTION_HOTSPOTS.includes(id)) {
      this.panelOpen.set(true);
      // Tocar los ojos otra vez, ya en el retrato, da pie a un comentario.
      if (id === 'eyes' && info.stopBefore === 1) {
        this.say(this.nextEgg('eyes'));
      }
      return;
    }
    if (id === 'lamp') {
      const text = this.sceneText();
      this.say(info.lampOn ? text.lampOn : text.lampOff);
      return;
    }
    this.say(this.nextEgg(id));
  }

  private onHover(id: string | null, x: number, y: number): void {
    if (id === null) {
      if (this.tip() !== null) {
        this.zone.run(() => this.tip.set(null));
      }
      return;
    }
    const label = this.sceneText().tips[id];
    if (!label) {
      return;
    }
    this.zone.run(() => this.tip.set({ text: label, x, y }));
  }

  private nextEgg(id: string): string | null {
    const list = this.sceneText().eggs[id] ?? [];
    if (list.length === 0) {
      return null;
    }
    const n = this.eggCount[id] ?? 0;
    this.eggCount[id] = n + 1;
    return list[n % list.length];
  }

  private say(message: string | null): void {
    if (!message) {
      return;
    }
    this.toast.set(message);
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.set(null), 3400);
  }

  private updateInset(): void {
    const scene = this.scene;
    if (!scene) {
      return;
    }
    const el = this.host().nativeElement;
    if (!this.panelOpen()) {
      scene.setInset(0, 0);
    } else if (el.clientWidth > 760) {
      scene.setInset(Math.min(460, el.clientWidth * 0.4), 0);
    } else {
      scene.setInset(0, el.clientHeight * 0.4);
    }
  }
}
