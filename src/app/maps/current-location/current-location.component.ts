import { AfterViewInit, Component, ElementRef, PLATFORM_ID, Inject, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MapBase } from '../../../components/map.base';
import { MapConfigService } from '../../../services/map-config.service';

@Component({
  selector: 'app-current-location',
  standalone: true,
  imports: [],
  templateUrl: './current-location.component.html',
  styleUrl: './current-location.component.scss'
})
export class CurrentLocationComponent extends MapBase implements AfterViewInit {
    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  constructor(
    // @Inject(PLATFORM_ID) private platformId: Object,
    protected override mapConfig: MapConfigService
  ) {
    super(mapConfig);
  }

//   async ngAfterViewInit(): Promise<void> {
    ngAfterViewInit(): void {
    // if (isPlatformBrowser(this.platformId)) {
    //   try {
    //     const L = await import('leaflet');
    //     await import('leaflet-routing-machine');
    //     this.initializeMap();
    //   } catch (error) {
    //     console.error('Error loading Leaflet:', error);
    //   }
    // }

    this.mapElement = this.mapContainer;
    this.initializeMap();
  }
} 