import { Routes } from '@angular/router';
import { CurrentLocationComponent } from './maps/current-location/current-location.component';
import { RouteComponent } from './maps/route/route.component';
import { TestComponent } from './maps/test/test.component';

export const routes: Routes = [
  { path: 'maps/current-location', component: CurrentLocationComponent },
  { path: 'maps/route/:coordinates', component: RouteComponent },
  { path: 'maps/test', component: TestComponent },
  { path: '', redirectTo: 'maps/current-location', pathMatch: 'full' }
];
