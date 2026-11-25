import { Injectable, computed, signal } from '@angular/core';
import { CONTENT, Lang } from '../data/content';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(this.initialLang());
  readonly content = computed(() => CONTENT[this.lang()]);
  readonly ui = computed(() => this.content().ui);
  readonly rooms = computed(() => this.content().rooms);

  constructor() {
    document.documentElement.lang = this.lang();
  }

  set(lang: Lang): void {
    this.lang.set(lang);
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('lang', lang);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private initialLang(): Lang {
    try {
      const saved = localStorage.getItem('lang');
      if (saved === 'es' || saved === 'en') {
        return saved;
      }
    } catch {
      /* almacenamiento no disponible */
    }
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
  }
}
