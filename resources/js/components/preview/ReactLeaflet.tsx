import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L, { LatLngExpression, Icon } from "leaflet";
import React, { useState, useEffect } from "react";

// Import custom marker image
const customMarkerUser = "/assets/icons/marker_user.png";
const customMarkerEvent = "/assets/icons/marker_event.png";

// Definisikan tipe props
interface ReactLeafletProps {
  latEvent: number;
  longEvent: number;
}

const ReactLeaflet: React.FC<ReactLeafletProps> = ({ latEvent, longEvent }) => {
  // custom icons harus dideklarasikan dengan tipe Icon
  const customIconUser: Icon = L.icon({
    iconUrl: customMarkerUser,
    iconSize: [38, 38], // Ukuran icon
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });

  const customIconEvent: Icon = L.icon({
    iconUrl: customMarkerEvent,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });

  // Komponen LocationMarker harus beri tipe posisi state yang bisa null atau LatLngExpression
  function LocationMarker() {
    const [position, setPosition] = useState<LatLngExpression | null>(null);
    const map = useMapEvents({
      locationfound(e) {
        setPosition(e.latlng);
        map.flyTo(e.latlng, map.getZoom());
      },
    });

    useEffect(() => {
      map.locate();
    }, [map]);

    if (!position) return null;

    return (
      <Marker position={position} icon={customIconUser}>
        <Popup>You are here</Popup>
      </Marker>
    );
  }

  // Untuk tipe posisi marker event, gunakan tuple number untuk latitude dan longitude
  const positionEvent: [number, number] = [latEvent, longEvent];

  return (
    <div className="mt-2">
      <MapContainer
        className="full-height-map rounded-md"
        center={[-0.039424, 109.348401]}
        zoom={13}
        minZoom={3}
        maxZoom={19}
        maxBounds={[
          [-85.06, -180],
          [85.06, 180],
        ]}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={positionEvent} icon={customIconEvent}>
          <Popup>
            Event Location. <br />
          </Popup>
        </Marker>
        <LocationMarker />
      </MapContainer>
    </div>
  );
};

export default ReactLeaflet;
