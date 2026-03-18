import { Routes } from '@angular/router';
import { AppShellComponent } from './app-shell/app-shell.component';

export const routes: Routes = [
  { path: '', component: AppShellComponent },
  { path: '**', redirectTo: '' },
];
