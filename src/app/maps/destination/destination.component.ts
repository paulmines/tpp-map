import { AfterViewInit, Component, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-destination',
  standalone: true,
  imports: [],
  templateUrl: './destination.component.html',
  styleUrl: './destination.component.scss'
})
export class DestinationComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  private map: any;
  private markerLayer: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const L = await import('leaflet');
        await import('leaflet-routing-machine');
        
        // Fix for Leaflet icons
        // const iconRetinaUrl = 'assets/marker-icon-2x.png';
        // const iconUrl = 'assets/marker-icon.png';
        // const shadowUrl = 'assets/marker-shadow.png';
        // const iconDefault = L.icon({
        //   iconRetinaUrl,
        //   iconUrl,
        //   shadowUrl,
        //   iconSize: [25, 41],
        //   iconAnchor: [12, 41],
        //   popupAnchor: [1, -34],
        //   tooltipAnchor: [16, -28],
        //   shadowSize: [41, 41]
        // });
        // L.Marker.prototype.options.icon = iconDefault;

        this.initMap(L);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    }
  }

  private initMap(L: any): void {
    try {
      const bounds = L.latLngBounds(
        [14.069498, 121.133057],
        [14.082540, 121.152675]
      );

      const mapElement = this.mapContainer.nativeElement.querySelector('#map');
      if (!mapElement) {
        console.error('Map element not found');
        return;
      }

      this.map = new L.Map(mapElement, {
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        minZoom: 17,
        maxZoom: 21,
        bounceAtZoomLimits: true
      });

      this.map.setView([14.076733, 121.143158], 19);

      const tiles = L.tileLayer('/assets/maps/tiles-google/{z}/{x}/{y}.png', {
        maxZoom: 21,
        minZoom: 17,
        attribution: 'TPP Map'
      }).addTo(this.map);

      this.markerLayer = L.layerGroup().addTo(this.map);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }
}
