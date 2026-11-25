import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-classic-cv',
  templateUrl: './classic-cv.page.html',
  styleUrl: './classic-cv.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassicCvPage {
  private readonly i18n = inject(I18nService);

  readonly ui = this.i18n.ui;
  readonly intro = computed(() => this.i18n.rooms()[0]);
  readonly sections = computed(() => this.i18n.rooms().slice(1));
  readonly contacts = computed(() => this.i18n.rooms()[5].items ?? []);

  print(): void {
    window.print();
  }
}
