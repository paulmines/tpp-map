import { AfterViewInit, Component, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
// import { MapBase } from '../../components/map.base';
import { MapBase } from '../../../components/map.base';
// import { MapBase } from '@root/components/map.base';
import { MapConfigService } from '../../../services/map-config.service';

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [],
  templateUrl: './location.component.html',
  styleUrl: './location.component.scss'
})
// export class LocationComponent extends MapBase implements AfterViewInit {
  // export class LocationComponent extends MapBase {
    export class LocationComponent {
  // @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    mapConfig: MapConfigService
  ) {
    // super(mapContainer, mapConfig);
    // super(mapConfig);
  }

  // async ngAfterViewInit(): Promise<void> {
  //   if (isPlatformBrowser(this.platformId)) {
  //     try {
  //       // const L = await import('leaflet');
  //       // await import('leaflet-routing-machine');
  //       // this.initializeMap();
  //     } catch (error) {
  //       console.error('Error loading Leaflet:', error);
  //     }
  //   }
  // }

  // // Override base class methods if needed for location-specific functionality
  // protected override getMinZoom(): number {
  //   return 15; // Allow more zoom out for location view
  // }

  // protected override getMaxZoom(): number {
  //   return 21;
  // }

  // protected override getInitialZoom(): number {
  //   return 17; // Start more zoomed out for location view
  // }
}
