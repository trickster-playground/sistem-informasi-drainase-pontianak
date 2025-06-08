import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

export default function CreateDrainasePane() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane('drainasePane')) {
      const pane = map.createPane('drainasePane');
      pane.style.zIndex = '680'; // Lebih tinggi dari default overlayPane (zIndex 400)
    }
  }, [map]);

  return null; // tidak merender apa-apa
}
