import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { Icon } from 'leaflet';

// Configure Leaflet's default icon path globally
Icon.Default.imagePath = 'assets/';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
