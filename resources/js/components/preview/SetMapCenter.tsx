import { useMap } from "react-leaflet";
import { useEffect } from "react";

interface SetMapCenterProps {
  position: [number, number];
}

export default function SetMapCenter({ position }: SetMapCenterProps) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 18); // atau map.flyTo(position, 14)
    }
  }, [position]);

  return null;
}
