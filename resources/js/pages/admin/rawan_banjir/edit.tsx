import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';

import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, FeatureGroup, Circle, Popup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Rawan Banjir',
    href: '/admin/rawan-banjir/edit',
  },
];

type CircleData = {
  id: number;
  name: string;
  type: 'Circle';
  coordinates: [number, number]; // [lng, lat]
  radius: number;
  fungsi?: string;
  kecamatan?: string | null;
};

type Kecamatan = {
  id: number;
  nama: string;
};

type Props = {
  lines: CircleData[];
  selectedKecamatan: string;
  kecamatanList: Kecamatan[];
};

export default function EditRawanBanjir({ lines, selectedKecamatan = 'all', kecamatanList }: Props) {
  const [name, setName] = useState('');
  const [fungsi, setFungsi] = useState('');
  const [radius, setRadius] = useState(100);
  const [coordinates, setCoordinates] = useState<{
    type: 'Circle';
    coordinates: [number, number];
  } | null>(null);
  const [drawType, setDrawType] = useState<'Circle' | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const [kecamatan, setKecamatan] = useState(selectedKecamatan);

  useEffect(() => {
    if (lines.length > 0) {
      const first = lines[0];
      setName(first.name || '');
      setFungsi(first.fungsi || '');
      setKecamatan(first.kecamatan || 'all');

      if (first.coordinates) {
        setCoordinates({
          type: 'Circle',
          coordinates: first.coordinates,
        });
        setRadius(first.radius);
        setDrawType('Circle');
      } else {
        setCoordinates(null);
        setDrawType(null);
      }
    }
  }, [lines]);

  const handleDrawCreated = (e: any) => {
    const layer = e.layer;
    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      setCoordinates({
        type: 'Circle',
        coordinates: [center.lng, center.lat],
      });
      setRadius(layer.getRadius());
      setDrawType('Circle');
    } else {
      setCoordinates(null);
      setRadius(0);
      setDrawType(null);
    }
  };

  const handleDrawDeleted = () => {
    setCoordinates(null);
    setRadius(0);
    setDrawType(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!drawType || !coordinates) {
      alert("Harap gambar Circle terlebih dahulu.");
      return;
    }

    const payload = {
      name,
      kecamatan,
      type: drawType,
      coordinates,
      radius,
    };

    const id = lines[0]?.id;
    if (!id) {
      alert('Data tidak ditemukan.');
      return;
    }

    router.put(`/admin/rawan-banjir/${id}/edit`, payload, {
      onSuccess: () => console.log('Berhasil disimpan!'),
      onError: (errors) => console.error('Terjadi error:', errors),
    });
  };

  const onFilterChange = (selected: string) => {
    setKecamatan(selected);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Edit Daerah Rawan Banjir" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-bold">Edit Data Daerah Rawan Banjir</h1>
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
                center={
                  coordinates
                    ? [coordinates.coordinates[1], coordinates.coordinates[0]]
                    : [-0.02, 109.34]
                }
                zoom={13}
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
                      circlemarker: false,
                      marker: false,
                      polyline: false,
                      circle: true,
                    }}
                  />
                </FeatureGroup>

                {coordinates && (
                  <Circle
                    center={[coordinates.coordinates[1], coordinates.coordinates[0]]}
                    radius={radius}
                    color="red"
                  >
                    <Popup>
                      <strong>{name}</strong><br />
                      Kecamatan: {kecamatan}<br />
                      Radius: {radius} meter
                    </Popup>
                  </Circle>
                )}
              </MapContainer>
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1">Tipe, Koordinat & Radius</label>
              <textarea
                readOnly
                className="border rounded px-3 py-2 w-full"
                rows={5}
                value={coordinates
                  ? JSON.stringify({ ...coordinates, radius }, null, 2)
                  : ''}
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
