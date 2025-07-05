import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';

import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, FeatureGroup, Polyline, Popup, Marker, Circle, Polygon } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
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
  selectedDrainaseIds?: number[]; // tambahkan ini
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

export default function EditReport({ lines, selectedKecamatan = 'all', kecamatanList, batasKecamatan, point, selectedDrainaseIds: initialSelectedDrainaseIds }: Props) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null); // Simpan file yang diupload
  const [preview, setPreview] = useState<string | null>(null);
  const [kecamatan, setKecamatan] = useState<string>(point && point.length > 0 ? (point[0].kecamatan ?? 'all') : selectedKecamatan); // Default ke kecamatan dari point atau prop

  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [nearbyDrainase, setNearbyDrainase] = useState<Line[]>([]);
  const [selectedDrainaseIds, setSelectedDrainaseIds] = useState<number[]>(initialSelectedDrainaseIds ?? []);



  const isMobile = window.innerWidth < 768;
  const iconSize: [number, number] = isMobile ? [36, 36] : [48, 48];

  const userIcon = L.icon({
    iconUrl: customIconUser,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });

  useEffect(() => {
    if (point && point.length > 0) {
      const data = point[0];
      setName(data.name);
      setLocation(data.location);
      setDescription(data.description);
      setCategory(data.category);
      setKecamatan(data.kecamatan ?? 'all');
      setMarkerPosition(data.coordinates);

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

  const [drawType, setDrawType] = useState<'LineString' | 'Polygon' | 'Circle' | 'Point' | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  // Inertia form helper untuk submit filter
  const { get } = useForm();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('location', location);
    formData.append('category', category);
    formData.append('kecamatan', kecamatan);
    formData.append('type', 'Point');
    if (markerPosition) {
      formData.append('coordinates[]', String(markerPosition[0]));
      formData.append('coordinates[]', String(markerPosition[1]));
    }

    if (file) {
      formData.append('file', file);
    }

    // NEW: tambahkan ini
    selectedDrainaseIds.forEach((id) => {
      formData.append('selectedDrainaseIds[]', String(id));
    });

    // Tambahkan _method ke formData untuk spoofing PUT
    formData.append('_method', 'put');

    try {
      const id = point && point[0]?.id;
      if (!id) {
        alert('Data drainase tidak ditemukan.');
        return;
      }
      router.post(`/report/${id}/edit`, formData, {
        forceFormData: true,
        onSuccess: () => {
          console.log('Berhasil disimpan!');
          // Tampilkan notifikasi sukses jika perlu
        },
        onError: (errors) => {
          console.error('Terjadi error:', errors);
          // Tampilkan pesan ke user kalau mau
        },
      });
    } catch (error) {
      console.error("Gagal fetch:", error);
    }
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
              <div className='flex flex-col gap-4'>
                <div>
                  <label className="block font-medium mb-1">Nama Laporan</label>
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Lokasi</label>
                    <input
                      type="text"
                      name="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                      required
                    />
                  </div>
                  {/* <div>
                    <label className="block font-medium mb-1">Kategori</label>
                    <input
                      type="text"
                      name="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="border rounded px-3 py-2 w-full"

                    />
                  </div> */}
                </div>
                <div>
                  <label className="block font-medium mb-1">Deskripsi</label>
                  <textarea
                    name="description"
                    value={description}
                    rows={2}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border rounded px-3 py-2 w-full"

                  />
                </div>

                {/* Preview Foto dengan placeholder */}
                <div>
                  <p className="font-medium mb-1">Tambah Foto:</p>
                  <img
                    src={
                      preview ||
                      placeholderImage
                    }
                    alt="Preview"
                    className="max-w-xs max-h-55 object-contain border rounded"
                  />
                </div>
                <div>
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="border rounded px-3 py-2 w-full cursor-pointer"

                  />
                </div>
              </div>

              <div>
                {/* Dropdown Filter Kecamatan */}
                <KecamatanFilter
                  value={kecamatan}
                  options={kecamatanOptions}
                  onChange={(val) => setKecamatan(val)}
                />

                <div className="mb-4 h-[450px] relative z-0">
                  <MapContainer
                    center={userLocation || [-0.02, 109.34]} // Pusat Kota Pontianak
                    zoom={16}
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
                          polyline: false,
                        }}
                      />
                    </FeatureGroup>

                    {markerPosition && (
                      <>
                        <Marker
                          position={markerPosition}
                          icon={userIcon}
                          draggable={true}
                          eventHandlers={{
                            dragend: (e) => {
                              const marker = e.target;
                              const position = marker.getLatLng();
                              const coords: [number, number] = [position.lng, position.lat];
                              setMarkerPosition([position.lat, position.lng]);
                              setCoordinates({
                                type: 'Point',
                                coordinates: coords,
                              });
                              setDrawType('Point');
                              const found = findNearbyDrainase([position.lat, position.lng], lines);
                              setNearbyDrainase(found);
                              setSelectedDrainaseIds(found.map((line) => line.id));
                            },
                          }}
                        >
                          <Popup>Lokasi Anda (bisa dipindah)</Popup>
                        </Marker>
                        <SetMapCenter position={markerPosition} />
                      </>
                    )}

                    <CreateMarkerPane />
                    <CreateDrainasePane />

                    {filteredLines.map(line => {
                      switch (line.type) {
                        case 'LineString': {
                          const latLngCoordinates = (line.coordinates as [number, number][]).map(
                            ([lng, lat]) => [lat, lng] as [number, number]
                          );
                          return (
                            <Polyline
                              key={`${line.id}-${selectedDrainaseIds.includes(line.id) ? 'red' : 'blue'}`}
                              positions={latLngCoordinates}
                              color={selectedDrainaseIds.includes(line.id) ? 'red' : 'blue'}
                              pane='drainasePane'
                            >
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

                <div className="mt-4">
                  <label className="block font-medium mb-1">Koordinat Lokasi Anda</label>
                  <textarea
                    value={markerPosition ? `${markerPosition[0]}, ${markerPosition[1]}` : ''}
                    readOnly
                    rows={2}
                    className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                  />
                </div>
                {selectedDrainaseIds.length > 0 && (
                  <div className="mt-4 gap-3">
                    <h3 className="font-medium mb-2">Drainase Terdekat (dalam 20m):</h3>
                    {selectedDrainaseIds.map((drainaseId) => {
                      const drainase = lines.find(line => line.id === drainaseId);
                      return (
                        <div key={drainaseId} className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            value={drainaseId}
                            checked={selectedDrainaseIds.includes(drainaseId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDrainaseIds([...selectedDrainaseIds, drainaseId]);
                              } else {
                                setSelectedDrainaseIds(selectedDrainaseIds.filter(id => id !== drainaseId));
                              }
                            }}
                          />
                          <label>{drainase && drainase.name !== '' ? drainase.name : 'Tidak ada Nama'}</label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className='flex justify-center items-center w-full mx-auto'>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 w-full rounded hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
