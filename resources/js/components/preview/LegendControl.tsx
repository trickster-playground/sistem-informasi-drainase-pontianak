import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function LegendControl({
  showDrainase = true,
  showUser = true,
  showEvent = true
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const legend = new L.Control({ position: 'topright' });

    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'leaflet-legend-control');

      // Dynamic content builder
      let html = `
        <div class="bg-white/90 backdrop-blur rounded-lg shadow-md p-4 text-sm space-y-2">
          <h4 class="font-semibold text-gray-800 mb-2">Lagenda Peta</h4>
      `;

      if (showDrainase) {
        html += `
          <div class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 rounded-full bg-blue-600"></span>
            <span>Drainase Normal</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block w-4 h-4 rounded-full bg-red-600"></span>
            <span>Drainase Bermasalah</span>
          </div>
        `;
      }

      if (showUser) {
        html += `
          <div class="flex items-center gap-2">
            <img src="/assets/icons/marker_user.png" alt="User Marker" class="w-4 h-4" />
            <span>Lokasi Anda</span>
          </div>
        `;
      }

      if (showEvent) {
        html += `
          <div class="flex items-center gap-2">
            <img src="/assets/icons/marker_event.png" alt="Event Marker" class="w-4 h-4" />
            <span>Lokasi Laporan</span>
          </div>
        `;
      }

      html += `</div>`;
      div.innerHTML = html;

      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map, showDrainase, showUser, showEvent]);

  return null;
}
