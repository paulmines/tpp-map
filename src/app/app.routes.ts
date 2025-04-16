import { Routes } from '@angular/router';
import { CurrentLocationComponent } from './maps/current-location/current-location.component';
import { TestComponent } from './maps/test/test.component';

export const routes: Routes = [
  { path: 'maps/current-location', component: CurrentLocationComponent },
  { path: 'maps/test', component: TestComponent },
  { path: '', redirectTo: 'maps/current-location', pathMatch: 'full' }
];
