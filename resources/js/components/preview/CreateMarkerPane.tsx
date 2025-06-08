import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

export default function CreateMarkerPane() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane('markerPane')) {
      const pane = map.createPane('markerPane');
      pane.style.zIndex = '850'; // Lebih tinggi dari default overlayPane (zIndex 400)
    }
  }, [map]);

  return null; // tidak merender apa-apa
}
