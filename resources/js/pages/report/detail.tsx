import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';

import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, FeatureGroup, Polyline, Popup, Marker, Circle, Polygon } from "react-leaflet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import { router } from '@inertiajs/react'

import placeholderImage from '/public/assets/icons/placeholder.jpg';

import CreateDrainasePane from '@/components/preview/CreateDrainasePane';
import CreateMarkerPane from '@/components/preview/CreateMarkerPane';
import SetMapCenter from '@/components/preview/SetMapCenter';
import KecamatanFilter from '@/components/preview/KecamatanFilter';

// Breadcrumbs
const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Report',
    href: '/report/create',
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

type Point = {
  id: number;
  name: string;
  type: string;
  description: string;
  category: string;
  location: string;
  attachments: string | null;
  kecamatan: string | null;
  coordinates: [number, number];
  status: string;
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
  point?: Point[];
};


export default function DetailReport({ lines, selectedKecamatan = 'all', kecamatanList, batasKecamatan, point }: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null); // Simpan file yang diupload
  const [preview, setPreview] = useState<string | null>(null);
  const [kecamatan, setKecamatan] = useState<string>(point && point.length > 0 ? (point[0].kecamatan ?? 'all') : selectedKecamatan);

  const [status, setStatus] = useState<string>(point && point.length > 0 ? (point[0].status ?? '') : '');

  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);


  useEffect(() => {
    if (point && point.length > 0) {
      const data = point[0];
      setName(data.name);
      setLocation(data.location);
      setDescription(data.description);
      setCategory(data.category);
      setKecamatan(data.kecamatan ?? 'all');
      setMarkerPosition(data.coordinates);
      setStatus(data.status ?? 'Pending');

      if (!file && data.attachments) {
        setPreview(data.attachments);
      }
    }
  }, [point]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);


  interface FileChangeEvent extends React.ChangeEvent<HTMLInputElement> {
    target: HTMLInputElement & EventTarget & {
      files: FileList;
    };
  }

  const handleFileChange = (e: FileChangeEvent) => {
    const selectedFile: File | undefined = e.target.files[0]; // Ambil file pertama
    setFile(selectedFile ?? null);

    if (selectedFile) {
      const objectUrl: string = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
  };

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!point || point.length === 0) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            setMarkerPosition([latitude, longitude]); // hanya set kalau tidak ada data point
          },
          (error) => {
            console.error("Gagal mendapatkan lokasi pengguna:", error);
          }
        );
      } else {
        console.warn("Geolocation tidak tersedia di browser ini.");
      }
    }
  }, [point]);


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


  // Data kecamatan unik untuk dropdown (ambil dari lines)
  const kecamatanOptions = Array.from(
    new Set(
      lines
        .map(line => line.kecamatan)
        .filter((kec): kec is string => typeof kec === 'string' && kec.length > 0)
    )
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


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      status,
    };
    console.log("Payload terkirim:", payload);

    const id = point && point[0]?.id;
    if (!id) {
      alert('Data drainase tidak ditemukan.');
      return;
    }

    // Ubah route jika perlu ke update
    router.put(`/report/${id}/detail`, payload, {
      onSuccess: () => {
        // Reset jika perlu
        console.log('Berhasil disimpan!');
      },
      onError: (errors) => {
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
        <div className="p-2 space-y-4">
          <h1 className="text-xl font-bold">Detail Laporan</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kolom Kiri */}
              <div className="flex flex-col gap-6 bg-gray-50 p-4 rounded-md shadow-sm border">
                <h2 className="text-lg font-semibold border-b pb-2">Informasi Laporan</h2>

                <div>
                  <label className="block font-medium mb-1">Nama Laporan</label>
                  <input
                    type="text"
                    value={name}
                    readOnly
                    className="border rounded px-3 py-2 w-full bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Lokasi</label>
                    <input
                      type="text"
                      value={location}
                      readOnly
                      className="border rounded px-3 py-2 w-full bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Kategori</label>
                    <input
                      type="text"
                      value={category}
                      readOnly
                      className="border rounded px-3 py-2 w-full bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Deskripsi</label>
                  <textarea
                    value={description}
                    rows={3}
                    readOnly
                    className="border rounded px-3 py-2 w-full bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <p className="font-medium">Preview Foto</p>
                  <img
                    src={preview || placeholderImage}
                    alt="Preview"
                    className="w-full max-w-full max-h-75 object-contain border rounded"
                  />
                </div>
              </div>

              {/* Kolom Kanan */}
              <div className="flex flex-col gap-6">
                <div className="bg-gray-50 p-4 rounded-md shadow-sm border space-y-4">
                  <h2 className="text-lg font-semibold border-b pb-2">Peta dan Lokasi</h2>

                  <KecamatanFilter
                    value={kecamatan}
                    options={kecamatanOptions}
                    onChange={(val) => setKecamatan(val)}
                    disabled={true}
                  />

                  <div className="h-[450px] relative z-0 rounded overflow-hidden border">
                    <MapContainer
                      center={userLocation || [-0.02, 109.34]}
                      zoom={16}
                      scrollWheelZoom
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {markerPosition && (
                        <>
                          <Marker position={markerPosition} draggable={false}>
                            <Popup>Lokasi Laporan</Popup>
                          </Marker>
                          <SetMapCenter position={markerPosition} />
                        </>
                      )}

                      <CreateMarkerPane />
                      <CreateDrainasePane />

                      {filteredLines.map(line => {
                        switch (line.type) {
                          case 'LineString':
                            const lineCoords = line.coordinates.map(([lng, lat]) => [lat, lng]);
                            return (
                              <Polyline key={line.id} positions={lineCoords as L.LatLngTuple[]} color="blue" pane="drainasePane">
                                <Popup>
                                  <strong>{line.name}</strong><br />
                                  Fungsi: {line.fungsi}<br />
                                  Kecamatan: {line.kecamatan}
                                </Popup>
                              </Polyline>
                            );
                          case 'Point':
                            const [lng, lat] = line.coordinates;
                            return (
                              <Marker key={line.id} position={[lat, lng]}>
                                <Popup>{line.name}</Popup>
                              </Marker>
                            );
                          case 'Circle':
                            const { center, radius } = line.coordinates;
                            return (
                              <Circle key={line.id} center={[center[1], center[0]]} radius={radius}>
                                <Popup>{line.name}</Popup>
                              </Circle>
                            );
                          default:
                            return null;
                        }
                      })}

                      {batasKecamatan.map((kec) => {
                        if (!Array.isArray(kec.coordinates) || !Array.isArray(kec.coordinates[0])) return null;
                        const latlngs = kec.coordinates.map(ring =>
                          ring.map(([lng, lat]) => [lat, lng])
                        );
                        return (
                          <Polygon
                            key={kec.nama}
                            positions={latlngs as L.LatLngExpression[][]}
                            pathOptions={{
                              color: getColorForKecamatan(kec.nama),
                              fillOpacity: 0.2,
                              weight: 2,
                            }}
                          >
                            <Popup><strong>Kecamatan:</strong> {kec.nama}</Popup>
                          </Polygon>
                        );
                      })}
                    </MapContainer>
                  </div>

                  <div className='flex grid grid-cols-1 md:grid-cols-2 gap-2'>
                    <div>
                      <label className="block font-medium mb-1">Koordinat Lokasi Laporan</label>
                      <input
                        value={markerPosition ? `${markerPosition[0]}, ${markerPosition[1]}` : ''}
                        readOnly
                        className="w-full border rounded px-3 py-2 text-sm text-gray-800 bg-white"
                      />
                    </div>
                    <div className='flex flex-col gap-1'>
                      <label className="font-medium">
                        Status Laporan
                      </label>
                      <Select onValueChange={setStatus} defaultValue={status}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a verified email to display" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Fixed">Fixed</SelectItem>
                          <SelectItem value="Aborted">Aborted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
                >
                  Update Status
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </AppLayout>
  );
}
