import AppLayout from '@/layouts/app-layout';
import { SharedData, type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import * as turf from '@turf/turf';

import customIconUser from '/public/assets/icons/marker_user.png';
import customIconReport from '/public/assets/icons/marker_event.png';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  Circle
} from 'react-leaflet';
import CreateDrainasePane from '@/components/preview/CreateDrainasePane';
import CreateMarkerPane from '@/components/preview/CreateMarkerPane';
import CreateCirclePane from '@/components/preview/CreateCirclePane';

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import KecamatanFilter from '@/components/preview/KecamatanFilter';
import { Eye, SquarePen, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import axios from 'axios';
import LegendControl from '@/components/preview/LegendControl';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Report',
    href: '/report'
  },
];

type Line = {
  id: number;
  name: string;
  coordinates: [number, number][];
  fungsi?: string;
  status?: string;
  kecamatan?: string | null;
};



type Props = {
  lines: Line[];
  batasKecamatan: {
    id: number;
    nama: string;
    coordinates: [number, number][][];
  }[];
  selectedKecamatan?: string | null;

  reports: Reports[];
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
  coordinates: [number, number]; // [lng, lat]
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

type ReportsPagination = {
  data: Reports[];
  current_page: number;
  last_page: number;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
};


export default function ReportDashboard({ lines, selectedKecamatan, batasKecamatan }: Props) {
  const { auth } = usePage<SharedData>().props;

  // Fetching reports data from the page props
  const { reports } = usePage<{ reports: ReportsPagination }>().props;


  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const isMobile = window.innerWidth < 768;
  const iconSize: [number, number] = isMobile ? [36, 36] : [48, 48];

  const userIcon = L.icon({
    iconUrl: customIconUser,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });

  const reportIcon = L.icon({
    iconUrl: customIconReport,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });

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

  // State filter kecamatan, default dari prop backend
  const [kecamatan, setKecamatan] = useState<string>('all');

  // Inertia form helper untuk submit filter
  const { get } = useForm();

  const filteredLines = kecamatan === 'all'
    ? lines
    : lines.filter((line) => line.kecamatan === kecamatan);


  // Data kecamatan unik untuk dropdown (ambil dari lines)
  const kecamatanOptions = Array.from(
    new Set(
      lines
        .map(line => line.kecamatan)
        .filter((kec): kec is string => typeof kec === 'string' && kec.length > 0)
    )
  );

  // Function to handle deletion of a drainase entry
  const handleDelete = (id: number) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
      router.delete(`/report/${id}`);
    }
  };
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Report" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min p-4">
          <div className="flex flex-col lg:flex-row items-center justify-between mx-4 relative z-[999]">
            {/* Dropdown Filter Kecamatan */}
            <div>
              <Button onClick={() => router.visit('/report/create')} className='bg-green-500 cursor-pointer hover:bg-green-800 mb-4'>Tambah Data Laporan</Button>
            </div>
          </div>

          {/* Map Leaflet*/}
          <section className="w-full h-[600px] mb-8 px-5 z-0">
            <MapContainer
              center={[-0.02, 109.34]} // Pusat Kota Pontianak
              zoom={14}
              scrollWheelZoom={true}
              className="w-full h-full"

            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LegendControl />
              <CreateMarkerPane />
              <CreateDrainasePane />
              <CreateCirclePane />

              {userLocation && (
                <Marker position={userLocation} pane="markerPane" icon={userIcon}>
                  <Popup>
                    <div className="max-w-xs p-3 rounded shadow text-sm bg-white text-gray-800">
                      <h3 className="font-semibold text-blue-600 mb-1">📍 Lokasi Anda Saat Ini</h3>
                      <p className="text-gray-700">
                        Koordinat:
                        <br />
                        <span className="font-mono text-gray-900">
                          {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                        </span>
                      </p>
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Data lokasi diperoleh secara otomatis
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}


              {reports.data.map((report) => (
                <Marker
                  key={report.id}
                  position={[report.coordinates[0], report.coordinates[1]]}
                  icon={reportIcon}
                >
                  <Popup>
                    <div className="max-w-xs p-3 rounded shadow-md text-sm bg-white text-gray-800 space-y-1">
                      <h3 className="font-semibold text-base text-blue-600">{report.title}</h3>
                      <p className="text-gray-700">{report.description}</p>

                      <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                        <p><span className="font-medium text-gray-700">📍 Lokasi:</span> {report.location_name}</p>
                        <p><span className="font-medium text-gray-700">📌 Kecamatan:</span> {report.kecamatan?.nama || '-'}</p>
                        <p>
                          <span className="font-medium text-gray-700">📊 Status:</span>{' '}
                          <span className={
                            report.status === 'Pending' ? 'text-gray-600 font-semibold' :
                              report.status === 'Fixed' ? 'text-green-600 font-semibold' :
                                report.status === 'In Progress' ? 'text-yellow-600 font-semibold' :
                                  report.status === 'Aborted' ? 'text-red-600 font-semibold' :
                                    'text-gray-600 font-semibold'

                          }>
                            {report.status}
                          </span>
                        </p>
                      </div>
                      <div className='flex gap-2 items-center justify-start'>
                        {report.status !== 'Fixed' && (
                          <>
                            <Button
                              onClick={() => router.visit(`/report/${report.id}/edit`)}
                              className="text-white hover:text-white/80 transition-colors cursor-pointer bg-blue-500 hover:bg-blue-800"
                              title="Edit"
                              variant="outline"
                            >
                              <SquarePen className="w-4 h-4" />
                            </Button>

                            <Button
                              onClick={() => handleDelete(report.id)}
                              className="text-white hover:text-white/80 transition-colors cursor-pointer bg-red-500 hover:bg-red-800"
                              title="Hapus"
                              variant="outline"
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() => router.visit(`/report/${report.id}/detail`)}
                          className="text-white hover:text-white/80 transition-colors cursor-pointer bg-green-500 hover:bg-green-800"
                          title="Show Detail"
                          variant={"outline"}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {lines.map((item, idx) => {
                const latLngCoordinates: [number, number][] = (Array.isArray(item.coordinates)
                  ? (item.coordinates as [number, number][])
                  : []
                ).map(([lng, lat]) => [lat, lng]);
                return (
                  <Polyline
                    key={idx}
                    positions={latLngCoordinates}
                    pathOptions={{ color: item.status === 'Terdapat Masalah' ? 'red' : 'blue', weight: 2 }}
                  >
                    <Popup>
                      <div className="max-w-xs p-3 rounded-md shadow bg-white text-gray-800 text-sm">
                        <h3 className="text-blue-600 font-semibold text-base mb-1">🛠️ {item.name}</h3>
                        <div className="space-y-1">
                          <p><span className="font-medium">Fungsi:</span> {item.fungsi || '-'}</p>
                          <p><span className="font-medium">Kecamatan:</span> {item.kecamatan || '-'}</p>
                          <p><span className="font-medium">Status Drainase:</span> {item.status || '-'}</p>
                          <div className='flex gap-2 items-center justify-start'>
                            <Button
                              onClick={() => router.visit(`/admin/drainase/${item.id}/edit`)}
                              className="text-white hover:text-white/80 transition-colors cursor-pointer bg-blue-500 hover:bg-blue-800"
                              title="Edit"
                              variant={"outline"}
                            >
                              <SquarePen className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(item.id)}
                              className="text-white hover:text-white/80 transition-colors cursor-pointer bg-red-500 hover:bg-red-800"
                              title="Hapus"
                              variant={"outline"}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 italic">
                          Jalur drainase yang terdeteksi
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

            </MapContainer>
          </section>
        </div>
        <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
          <div className="p-2 flex flex-col gap-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className='text-semibold'>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama Laporan</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead>Drainase Dilaporkan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Option</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.data.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-muted transition-colors cursor-pointer">
                      <TableCell>{(reports.current_page - 1) * 10 + index + 1}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.kecamatan?.nama || '-'}</TableCell>
                      <TableCell>
                        <ul className="space-y-1">
                          {(item.drainase ?? []).length > 0 ? (
                            (item.drainase ?? []).map(detail => (
                              <li key={detail.id} className="flex items-center gap-2">
                                <span className="font-medium">{detail.name || '-'}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-gray-400 italic">-</li>
                          )}
                        </ul>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={cn({
                            "bg-gray-200 text-gray-800": item.status === "Pending",
                            "bg-yellow-200 text-yellow-800": item.status === "In Progress",
                            "bg-green-200 text-green-800": item.status === "Fixed",
                            "bg-red-200 text-red-800": item.status === "Aborted",
                          })}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className='flex gap-2 items-center justify-start'>

                          {/** Tombol Show Detail - hanya Admin */}
                          <Button
                            onClick={() => router.visit(`/report/${item.id}/detail`)}
                            className="text-white hover:text-white/80 transition-colors cursor-pointer bg-green-500 hover:bg-green-800"
                            title="Show Detail"
                            variant="outline"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/** Tombol Edit & Hapus - hanya kalau BELUM Fixed & Admin atau Pemilik */}
                          {(item.status !== 'Fixed' && item.status !== 'In Progress') && (
                            <>
                              <Button
                                onClick={() => router.visit(`/report/${item.id}/edit`)}
                                className="text-white hover:text-white/80 transition-colors cursor-pointer bg-blue-500 hover:bg-blue-800"
                                title="Edit"
                                variant="outline"
                              >
                                <SquarePen className="w-4 h-4" />
                              </Button>

                              <Button
                                onClick={() => handleDelete(item.id)}
                                className="text-white hover:text-white/80 transition-colors cursor-pointer bg-red-500 hover:bg-red-800"
                                title="Hapus"
                                variant="outline"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                        </div>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 items-center justify-end">
              {reports.links.map((link, idx) => (
                <button
                  key={idx}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                  disabled={!link.url}
                  onClick={() => link.url && router.visit(link.url)}
                  className={`px-3 py-1 rounded border text-sm cursor-pointer ${link.active
                    ? 'bg-primary text-white'
                    : 'hover:bg-muted text-muted-foreground'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
