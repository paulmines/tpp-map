import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { Map, latLngBounds, LatLngBounds, Icon } from 'leaflet';
import 'leaflet-routing-machine';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [LeafletModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss'
})
export class TestComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  private map!: Map;

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    const bounds: LatLngBounds = latLngBounds(
      [14.069498, 121.133057],
      [14.082540, 121.152675]
    );

    this.map = new Map(this.mapContainer.nativeElement, {
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
      attribution: 'Local Tiles'
    }).addTo(this.map);
  }
} 