export const environment = {
  production: true,
  map: {
    defaultBounds: {
      southWest: [14.069498, 121.133057],
      northEast: [14.082540, 121.152675]
    },
    initialCenter: [14.076733, 121.143158],
    initialZoom: 19,
    minZoom: 17,
    maxZoom: 21,
    tileLayer: {
      url: '/assets/maps/tiles-google/{z}/{x}/{y}.png',
      attribution: 'TPP Map'
    }
  }
}; 