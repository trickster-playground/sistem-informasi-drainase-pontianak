import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

export default function CreateCirclePane() {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane('circlePane')) {
      const pane = map.createPane('circlePane');
      pane.style.zIndex = '650'; // Lebih tinggi dari default overlayPane (zIndex 400)
    }
  }, [map]);

  return null; // tidak merender apa-apa
}
