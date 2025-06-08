import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';

import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, FeatureGroup, Polyline, Popup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import { router } from '@inertiajs/react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Breadcrumbs
const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Drainase',
    href: '/admin/drainase/edit',
  },
];

type Line = {
  id: number;
  name: string;
  type: 'LineString';
  coordinates: [number, number][];
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
};

export default function EditDrainase({ lines, selectedKecamatan = 'all', kecamatanList }: Props) {
  const [name, setName] = useState('');
  const [fungsi, setFungsi] = useState('');

  const [coordinates, setCoordinates] = useState<{
    type: 'LineString';
    coordinates: [number, number][];
  } | null>(null);

  const [drawType, setDrawType] = useState<'LineString' | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  // Ini kecamatan yg dipilih (bisa langsung from selectedKecamatan)
  const [kecamatan, setKecamatan] = useState(selectedKecamatan);

  // Jika lines (data edit) berubah, isi form dengan data tersebut
  useEffect(() => {
    if (lines.length > 0) {
      const firstLine = lines[0];
      setName(firstLine.name || '');
      setFungsi(firstLine.fungsi || '');
      setKecamatan(firstLine.kecamatan || 'all');
      if (firstLine.coordinates && firstLine.coordinates.length > 0) {
        setCoordinates({
          type: 'LineString',
          coordinates: firstLine.coordinates,
        });
        setDrawType('LineString');
      } else {
        setCoordinates(null);
        setDrawType(null);
      }
    }
  }, [lines]);

  function onFilterChange(selected: string) {
    setKecamatan(selected);
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
    if (!drawType || !coordinates) {
      alert("Harap gambar LineString terlebih dahulu.");
      return;
    }
    const payload = {
      name,
      fungsi,
      kecamatan,
      type: drawType,
      coordinates,
    };
    console.log("Payload terkirim:", payload);

    const id = lines[0]?.id;
    if (!id) {
      alert('Data drainase tidak ditemukan.');
      return;
    }


    // Ubah route jika perlu ke update
    router.put(`/admin/drainase/${id}/edit`, payload, {
      onSuccess: () => {
        // Reset jika perlu
        console.log('Berhasil disimpan!');
      },
      onError: (errors) => {
        console.error('Terjadi error:', errors);
      },
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Edit Drainase" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-bold">Edit Data Drainase</h1>
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

            <div className="mb-6 z-50 relative">
              <label htmlFor="kecamatan" className="mr-3 font-medium">
                Kecamatan:
              </label>
              <Select value={kecamatan} onValueChange={onFilterChange}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Pilih Kecamatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Pilih Kecamatan</SelectLabel>
                    <SelectItem value="all">Semua Kecamatan</SelectItem>
                    {kecamatanList.map((kec) => (
                      <SelectItem key={kec.id} value={kec.nama}>
                        {kec.nama}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4 h-[450px] relative z-0">
              <MapContainer
                center={coordinates && coordinates.coordinates.length > 0
                  ? [coordinates.coordinates[0][1], coordinates.coordinates[0][0]]
                  : [-0.02, 109.34]
                }
                zoom={12}
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
                      polygon: false,
                      rectangle: false,
                      circle: false,
                      circlemarker: false,
                      marker: false,
                      polyline: true,
                    }}
                  />
                </FeatureGroup>

                {lines.map((line) => {
                  const latLngCoordinates = line.coordinates.map(
                    ([lng, lat]) => [lat, lng] as [number, number]
                  );
                  return (
                    <Polyline key={line.id} positions={latLngCoordinates} color="blue">
                      <Popup>
                        <div>
                          <strong>{line.name}</strong><br />
                          Fungsi: {line.fungsi}<br />
                          Kecamatan: {line.kecamatan}
                        </div>
                      </Popup>
                    </Polyline>
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
