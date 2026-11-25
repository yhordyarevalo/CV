import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./world/world.page').then((m) => m.WorldPage),
    title: 'Yhordy Arevalo · CV',
  },
  {
    path: 'cv',
    loadComponent: () => import('./classic/classic-cv.page').then((m) => m.ClassicCvPage),
    title: 'Yhordy Arevalo · CV clásico',
  },
  { path: '**', redirectTo: '' },
];
