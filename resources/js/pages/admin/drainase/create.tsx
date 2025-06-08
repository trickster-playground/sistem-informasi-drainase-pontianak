import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';

import { useState, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, Polyline, Popup, Marker, Circle, Polygon } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import { router } from '@inertiajs/react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CreateDrainasePane from '@/components/preview/CreateDrainasePane';
import KecamatanFilter from '@/components/preview/KecamatanFilter';

// Breadcrumbs
const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Drainase',
    href: '/admin/drainase/create',
  },
];

type Line =
  | {
    id: number;
    name: string;
    type: 'LineString';
    coordinates: [number, number][];
    fungsi?: string;
    kecamatan?: string | null;
  }
  | {
    id: number;
    name: string;
    type: 'Point';
    coordinates: [number, number];
    fungsi?: string;
    kecamatan?: string | null;
  }
  | {
    id: number;
    name: string;
    type: 'Circle';
    coordinates: {
      center: [number, number];
      radius: number;
    };
    fungsi?: string;
    kecamatan?: string | null;
  };


type Kecamatan = {
  id: number;
  nama: string;
};

type Props = {
  lines: Line[];
  selectedKecamatan: string;
  kecamatanList: Kecamatan[];
  batasKecamatan: {
    id: number;
    nama: string;
    coordinates: [number, number][][];
  }[];
};

export default function CreateDrainase({ lines, selectedKecamatan = 'all', kecamatanList, batasKecamatan }: Props) {
  const [name, setName] = useState('');
  const [fungsi, setFungsi] = useState('');

  const [coordinates, setCoordinates] = useState<
    | {
      type: 'LineString' | 'Polygon';
      coordinates: [number, number][] | [number, number][][]; // polygon: array of array
    }
    | {
      type: 'Point';
      coordinates: [number, number];
    }
    | {
      type: 'Circle';
      center: [number, number];
      radius: number;
    }
    | null
  >(null);

  const [drawType, setDrawType] = useState<'LineString' | 'Polygon' | 'Circle' | 'Point' | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  // State filter kecamatan, default dari prop backend
  const [kecamatan, setKecamatan] = useState<string>(selectedKecamatan ?? 'all');


  // Inertia form helper untuk submit filter
  const { get } = useForm();

  // Data kecamatan unik untuk dropdown (ambil dari lines)
  const kecamatanOptions: string[] = Array.from(
    new Set(lines.map(line => line.kecamatan).filter((kec): kec is string => typeof kec === 'string' && !!kec))
  );

  const kecamatanColors: Record<string, string> = {
    'Pontianak Kota': '#FF5733',    // Orange kemerahan
    'Pontianak Utara': '#33C1FF',   // Biru langit cerah
    'Pontianak Selatan': '#8D33FF', // Ungu terang
    'Pontianak Timur': '#33FF57',   // Hijau stabilo
    'Pontianak Barat': '#FFD700',   // Kuning emas
    'Pontianak Tenggara': '#FF33A6' // Pink terang
  };

  function getColorForKecamatan(nama: string): string {
    return kecamatanColors[nama] || '#3cb44b'; // fallback hitam kalau nama gak ada
  }

  // Handler ketika kecamatan berubah
  function onFilterChange(selected: string) {
    setKecamatan(selected);

    const url = selected !== 'all'
      ? route('admin.drainase.create') + '?kecamatan=' + encodeURIComponent(selected)
      : route('admin.drainase.create');

    get(url, { preserveState: true, replace: true });
  }


  const handleDrawCreated = (e: any) => {
    const layer = e.layer;

    if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
      const latlngs = layer.getLatLngs() as L.LatLng[];
      const coords: [number, number][] = latlngs.map(
        (latlng): [number, number] => [latlng.lng, latlng.lat]
      );
      setDrawType('LineString');
      setCoordinates({
        type: 'LineString',
        coordinates: coords,
      });
    } else if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];
      const coords: [number, number][] = latlngs.map(
        (latlng): [number, number] => [latlng.lng, latlng.lat]
      );
      setDrawType('Polygon');
      setCoordinates({
        type: 'Polygon',
        coordinates: [coords],
      });
    } else if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      setDrawType('Circle');
      setCoordinates({
        type: 'Circle',
        center: [center.lng, center.lat],
        radius,
      });
    } else if (layer instanceof L.Marker) {
      const latlng = layer.getLatLng();
      setDrawType('Point');
      setCoordinates({
        type: 'Point',
        coordinates: [latlng.lng, latlng.lat],
      });
    } else {
      setDrawType(null);
      setCoordinates(null);
    }
  };


  const handleDrawDeleted = () => {
    setDrawType(null);
    setCoordinates(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      name,
      fungsi,
      kecamatan,
      type: drawType,
      coordinates,
    };
    console.log("Payload terkirim:", payload);

    router.post('/admin/drainase/create', payload, {
      onSuccess: () => {
        setDrawType(null);
        setCoordinates(null);
        setName('');
        setFungsi('');
        console.log('Berhasil disimpan!');
      },
      onError: (errors) => {
        // Tangani error validasi, dll
        console.error('Terjadi error:', errors);
      },
    });
  };

  const filteredLines = kecamatan === 'all'
    ? lines
    : lines.filter((line) => line.kecamatan === kecamatan);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Tambah Drainase" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-bold">Tambah Data</h1>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-medium mb-1">Nama</label>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Fungsi</label>
                <input
                  type="text"
                  name="fungsi"
                  value={fungsi}
                  onChange={(e) => setFungsi(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </div>
            </div>

            {/* Dropdown Filter Kecamatan */}
            <KecamatanFilter
              value={kecamatan}
              options={kecamatanOptions}
              onChange={(val) => setKecamatan(val)}
            />

            <div className="mb-4 h-[450px] relative z-0">
              <MapContainer
                center={[-0.02, 109.34]}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FeatureGroup ref={featureGroupRef}>
                  <EditControl
                    position="topright"
                    onCreated={handleDrawCreated}
                    onDeleted={handleDrawDeleted}
                    draw={{
                      polygon: true,
                      rectangle: false,
                      circle: true,
                      circlemarker: true,
                      marker: true,
                      polyline: true,
                    }}
                  />
                </FeatureGroup>

                <CreateDrainasePane />

                {filteredLines.map(line => {
                  switch (line.type) {
                    case 'LineString': {
                      const latLngCoordinates = (line.coordinates as [number, number][]).map(
                        ([lng, lat]) => [lat, lng] as [number, number]
                      );
                      return (
                        <Polyline key={line.id} positions={latLngCoordinates} color="blue" pane='drainasePane'>
                          <Popup><div>
                            <strong>{line.name}</strong><br />
                            Fungsi: {line.fungsi}<br />
                            Kecamatan: {line.kecamatan}
                          </div></Popup>
                        </Polyline>
                      );
                    }

                    case 'Point': {
                      const [lng, lat] = line.coordinates as [number, number];
                      return (
                        <Marker key={line.id} position={[lat, lng]}>
                          <Popup>{line.name}</Popup>
                        </Marker>
                      );
                    }

                    case 'Circle': {
                      const { center, radius } = line.coordinates as {
                        center: [number, number];
                        radius: number;
                      };
                      const [lng, lat] = center;
                      return (
                        <Circle key={line.id} center={[lat, lng]} radius={radius}>
                          <Popup>{line.name}</Popup>
                        </Circle>
                      );
                    }

                    default:
                      return null;
                  }
                })}

                {batasKecamatan.map((kec) => {
                  if (!Array.isArray(kec.coordinates) || !Array.isArray(kec.coordinates[0])) {
                    return null;
                  }

                  const latlngs: [number, number][][] = kec.coordinates.map(
                    (ring) =>
                      ring.map(([lng, lat]) => [lat, lng] as [number, number])
                  );

                  return (
                    <Polygon
                      key={kec.nama}
                      positions={latlngs}
                      pathOptions={{
                        color: getColorForKecamatan(kec.nama),
                        fillOpacity: 0.2,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <strong>Kecamatan:</strong> {kec.nama}
                      </Popup>
                    </Polygon>
                  );
                })}

              </MapContainer>
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1">Tipe & Koordinat</label>
              <textarea
                readOnly
                className="border rounded px-3 py-2 w-full"
                rows={5}
                value={coordinates ? JSON.stringify(coordinates, null, 2) : ''}
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Simpan
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
