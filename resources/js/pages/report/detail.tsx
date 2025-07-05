import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';

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

import customIconUser from '/public/assets/icons/marker_user.png';

import * as turf from '@turf/turf';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  reporter_name: string;
  reporter_contact: string;
  report_details?: {
    id: number;
    name?: string;
    status?: string;
    fungsi?: string;
    panjang?: number;
    pivot?: {
      id: number
      drainase_id: number
      report_id: number
      status: string
      coordinates: [number, number];
      attachments: string | null;
    }
  }[];
};

type Kecamatan = {
  id: number;
  nama: string;
};

type Reports = {
  id: number;
  title: string;
  category: string;
  description: string;
  location_name: string;
  status: string;
  reporter_name: string;
  reporter_contact: string;
  kecamatan?: {
    nama: string;
  };
  type: string;
  coordinates: [number, number];
  kondisi: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    email: string
  };
  drainase?: {
    id: number;
    name?: string;
  }[];
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
  selectedDrainaseIds?: number[]; // tambahkan ini
  data: Reports[];
};

function findNearbyDrainase(
  pointCoord: [number, number],
  lines: Line[],
  thresholdMeters = 20
): Line[] {
  const pointFeature = turf.point([pointCoord[1], pointCoord[0]]);
  const thresholdKm = thresholdMeters / 1000;

  return lines.filter((line) => {
    if (line.type !== 'LineString') return false;

    const lineFeature = turf.lineString(line.coordinates);
    const dist = turf.pointToLineDistance(pointFeature, lineFeature, { units: 'kilometers' });

    return dist <= thresholdKm;
  });
}

export default function DetailReport({ lines, selectedKecamatan = 'all', kecamatanList, batasKecamatan, point, selectedDrainaseIds: initialSelectedDrainaseIds }: Props) {
  const [name, setName] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null); // Simpan file yang diupload
  const [preview, setPreview] = useState<string | null>(null);
  const [kecamatan, setKecamatan] = useState<string>(point && point.length > 0 ? (point[0].kecamatan ?? 'all') : selectedKecamatan);


  const [status, setStatus] = useState<string>(point && point.length > 0 ? (point[0].status ?? '') : '');

  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  // Fetching reports data from the page props
  const { reports } = usePage<{ reports: Props }>().props;

  const [nearbyDrainase, setNearbyDrainase] = useState<Line[]>([]);
  const [selectedDrainaseIds, setSelectedDrainaseIds] = useState<number[]>(initialSelectedDrainaseIds ?? []);

  const [fileReportDetails, setFileReportDetails] = useState<File | null>(null); // Simpan file yang diupload
  const [previewReportDetails, setPreviewReportDetails] = useState<string | null>(null);

  console.log(point);

  interface FileChangeEventReportDetails extends React.ChangeEvent<HTMLInputElement> {
    target: HTMLInputElement & EventTarget & {
      files: FileList;
    };
  }

  const handleFileChangeReportDetails = (e: FileChangeEventReportDetails) => {
    const selectedFile: File | undefined = e.target.files[0]; // Ambil file pertama
    setFileReportDetails(selectedFile ?? null);

    if (selectedFile) {
      const objectUrl: string = URL.createObjectURL(selectedFile);
      setPreviewReportDetails(objectUrl);
    } else {
      setPreviewReportDetails(null);
    }
  };

  useEffect(() => {
    if (point && point.length > 0) {
      const data = point[0];
      setName(data.name);
      setReporterName(data.reporter_name);
      setReporterContact(data.reporter_contact);
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

  console.log(point)


  const isMobile = window.innerWidth < 768;
  const iconSize: [number, number] = isMobile ? [36, 36] : [48, 48];

  const userIcon = L.icon({
    iconUrl: customIconUser,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });


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

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Gagal mendapatkan lokasi pengguna:", error);
        }
      );
    } else {
      console.warn("Geolocation tidak tersedia di browser ini.");
    }
  }, []);


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

  const filteredLines = kecamatan === 'all'
    ? lines
    : lines.filter((line) => line.kecamatan === kecamatan);

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

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    setPreviewReportDetails(null)
  };

  const updateReportDetails = (e: React.FormEvent<HTMLFormElement>, reportDetailId: number) => {
    e.preventDefault();

    const formData = new FormData();

    // Nama drainase (optional kalau kamu mau)
    formData.append('name', name);
    formData.append('type', 'Point');

    if (userLocation) {
      formData.append('coordinates[]', String(userLocation[0]));
      formData.append('coordinates[]', String(userLocation[1]));
    }

    if (fileReportDetails) {
      formData.append('file', fileReportDetails);
    }

    // Tambahkan _method=put
    formData.append('_method', 'put');

    // Kirim request ke route yang sesuai
    router.post(`/report-details/${reportDetailId}/update`, formData, {
      forceFormData: true,
      onSuccess: () => {
        console.log('Berhasil disimpan!', formData);
        // Kalau mau bisa reset preview/file
        setFileReportDetails(null);
        setPreviewReportDetails('');
      },
      onError: (errors) => {
        console.error('Terjadi error:', errors);
      },
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Detail Laporan" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        <div className="p-2 space-y-4">
          <h1 className="text-xl font-bold">Detail Laporan</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kolom Kiri */}
              <div className="flex flex-col gap-6 bg-gray-50 p-4 rounded-md shadow-sm border">
                <h2 className="text-lg font-semibold border-b pb-2">Informasi Laporan</h2>
                {(reporterName && reporterContact) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium mb-1">Nama Pelapor</label>
                      <input
                        type="text"
                        name="reporterName"
                        value={reporterName}
                        className="border rounded px-3 py-2 w-full"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Email Pelapor</label>
                      <input
                        type="email"
                        name="reporterContact"
                        value={reporterContact}
                        className="border rounded px-3 py-2 w-full"
                        readOnly
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block font-medium mb-1">Nama Laporan</label>
                  <input
                    type="text"
                    value={name}
                    readOnly
                    className="border rounded px-3 py-2 w-full bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Lokasi</label>
                    <input
                      type="text"
                      value={location}
                      readOnly
                      className="border rounded px-3 py-2 w-full bg-white"
                    />
                  </div>
                  {/* <div>
                    <label className="block font-medium mb-1">Kategori</label>
                    <input
                      type="text"
                      value={category}
                      readOnly
                      className="border rounded px-3 py-2 w-full bg-white"
                    />
                  </div> */}
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

                  <div className="h-[500px] relative z-0 rounded overflow-hidden border">
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
                          <Marker position={markerPosition} draggable={false} icon={userIcon}>
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
                              <Polyline key={`${line.id}-${selectedDrainaseIds.includes(line.id) ? 'red' : 'blue'}`} positions={lineCoords as L.LatLngTuple[]} color={selectedDrainaseIds.includes(line.id) ? 'red' : 'blue'} pane="drainasePane" >
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
                      <Select onValueChange={setStatus} defaultValue={status} disabled={status === "Fixed"}>
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
                {status !== 'Fixed' && (<button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full cursor-pointer"
                >
                  Update Status Laporan
                </button>)}

              </div>
            </div>
          </form>
        </div>
      </div>
      <div className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-sm border">
        <h1 className="text-2xl font-bold text-blue-700">📝 Drainase Dilaporkan</h1>

        {point && point[0] && point[0].report_details && point[0].report_details.length > 0 ? (
          <ul className="flex flex-col gap-5">
            {point[0].report_details.map(detail => (
              <li
                key={detail.id}
                className="rounded-lg border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-4"
              >
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-800">{detail.name || '-'}</span>
                    <Badge
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        {
                          "bg-green-100 text-green-800": detail.status === "Baik",
                          "bg-red-100 text-red-800": detail.status === "Terdapat Masalah",
                        }
                      )}
                    >
                      {detail.status}
                    </Badge>
                  </div>

                  {detail.pivot?.status !== 'Fixed' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md shadow"
                        >
                          Update Status
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl md:max-w-3xl rounded-lg shadow-lg">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold">📌 Bukti Penanganan</DialogTitle>
                          <DialogDescription className="text-gray-600">
                            Lengkapi form untuk penanganan drainase
                          </DialogDescription>
                        </DialogHeader>

                        <form
                          onSubmit={(e) => {
                            if (detail.pivot?.id !== undefined) {
                              updateReportDetails(e, detail.pivot.id);
                            } else {
                              e.preventDefault();
                              alert('ID detail drainase tidak ditemukan.');
                            }
                          }}
                          className="space-y-6"
                        >
                          <div className="space-y-4">
                            <div className="rounded-lg overflow-hidden border shadow-sm h-[300px] md:h-[400px]">
                              <MapContainer
                                center={userLocation || [-0.02, 109.34]}
                                zoom={20}
                                scrollWheelZoom
                                style={{ height: '100%', width: '100%' }}
                              >
                                <TileLayer
                                  attribution="&copy; OpenStreetMap contributors"
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {userLocation && (
                                  <Marker position={userLocation} icon={userIcon}>
                                    <Popup>
                                      <div className="max-w-xs p-3 text-sm">
                                        <h3 className="font-semibold text-blue-600 mb-1">📍 Lokasi Saat Ini</h3>
                                        <p className="font-mono">{userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}</p>
                                      </div>
                                    </Popup>
                                  </Marker>
                                )}
                              </MapContainer>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Unggah Foto Bukti</label>
                              <div className="rounded-lg border bg-gray-50 p-3 flex flex-col gap-3 items-center">
                                <img
                                  src={previewReportDetails || placeholderImage}
                                  alt="Preview"
                                  className="max-h-56 object-contain rounded border bg-white shadow"
                                />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileChangeReportDetails}
                                  className="text-sm border rounded px-3 py-2 file:bg-blue-600 file:text-white file:px-4 file:py-2 file:rounded-md cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="flex justify-end gap-3">
                            <DialogClose asChild>
                              <Button variant="outline" onClick={handleCancel}>Batal</Button>
                            </DialogClose>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                              Simpan Perubahan
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {detail.pivot?.status === 'Fixed' && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-4">
                    <p className="text-green-700 font-medium flex items-center gap-2">
                      ✅ Status sudah Fixed
                    </p>

                    {/* Koordinat */}
                    {detail.pivot?.coordinates && (
                      <div>
                        <span className="block font-semibold text-gray-700 mb-1">📍 Koordinat:</span>
                        <code className="block bg-white border rounded px-3 py-2 text-sm text-gray-800 shadow-inner">
                          {(() => {
                            const coords = detail.pivot.coordinates;
                            if (typeof coords === 'string') {
                              try {
                                const parsed = JSON.parse(coords);
                                return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
                              } catch {
                                return coords;
                              }
                            } else if (Array.isArray(coords)) {
                              return coords.join(', ');
                            } else {
                              return String(coords);
                            }
                          })()}
                        </code>
                      </div>
                    )}

                    {/* Lampiran Foto */}
                    {detail.pivot?.attachments && (
                      <div>
                        <span className="block font-semibold text-gray-700 mb-2">🖼️ Bukti Foto:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {(() => {
                            try {
                              const parsed = JSON.parse(detail.pivot.attachments);
                              if (Array.isArray(parsed)) {
                                return parsed.map((path, idx) => (
                                  <img
                                    key={idx}
                                    src={`/storage/${path}`}
                                    alt={`Lampiran ${idx + 1}`}
                                    className="h-full w-full object-cover rounded-lg border shadow"
                                  />
                                ));
                              }
                              return (
                                <img
                                  src={`/storage/${parsed}`}
                                  alt="Lampiran"
                                  className="h-full w-full object-cover rounded-lg border shadow"
                                />
                              );
                            } catch {
                              return (
                                <img
                                  src={`/storage/${detail.pivot.attachments}`}
                                  alt="Lampiran"
                                  className="h-full w-full object-cover rounded-lg border shadow"
                                />
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 italic">Tidak ada drainase dilaporkan.</p>
        )}
      </div>


    </AppLayout >
  );
}
