import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { SharedData, type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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
import KecamatanFilter from '@/components/preview/KecamatanFilter';
import { SquarePen, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Report',
    href: '/report',
  },
];

type Line = {
  id: number;
  name: string;
  coordinates: [number, number][];
  fungsi?: string;
  kecamatan?: string | null;
};

type rawanBanjir = {
  id: number;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  radius: number;
  fungsi?: string;
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
  rawanBanjir: rawanBanjir[];
  reports: Reports[];
};

type Reports = {
  id: number;
  title: string;
  category: string;
  description: string;
  location_name: string;
  status: string;
  kecamatan?: {
    nama: string;
  };
  kondisi: string;
  updated_at: string;
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

export default function ReportDashboard({ lines, selectedKecamatan, batasKecamatan, rawanBanjir }: Props) {
  const { auth } = usePage<SharedData>().props;

  // Fetching reports data from the page props
  const { reports } = usePage<{ reports: ReportsPagination }>().props;
  console.log('Reports Data:', reports);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

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

  // Data kecamatan unik untuk dropdown (ambil dari lines)
  const kecamatanOptions = Array.from(
    new Set(
      lines
        .map(line => line.kecamatan)
        .filter((kec): kec is string => typeof kec === 'string' && kec.length > 0)
    )
  );

  const filteredLines = kecamatan === 'all'
    ? lines
    : lines.filter((line) => line.kecamatan === kecamatan);

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
        <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">

          <div className="flex  items-start justify-start p-4">
            <h1 className="text-xl font-bold">Selamat Datang, {auth.user.name} !</h1>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between mx-4 relative z-[999]">
            {/* Dropdown Filter Kecamatan */}
            <KecamatanFilter
              value={kecamatan}
              options={kecamatanOptions}
              onChange={(val) => setKecamatan(val)}
            />
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

              <CreateMarkerPane />
              <CreateDrainasePane />
              <CreateCirclePane />

              {userLocation && (
                <Marker position={userLocation} pane="markerPane">
                  <Popup>Lokasi Anda Saat Ini</Popup>
                </Marker>
              )}

              {filteredLines.map((line) => {
                // Pastikan tipe tuple [number, number]
                const latLngCoordinates: [number, number][] = line.coordinates.map(
                  ([lng, lat]) => [lat, lng]
                );

                return (
                  <Polyline
                    key={line.id}
                    positions={latLngCoordinates}
                    pathOptions={{ color: 'blue', weight: 1.5 }}
                    pane="drainasePane"
                  >
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

              {rawanBanjir.map((item) => (
                <Circle
                  key={item.id}
                  center={[item.coordinates[1], item.coordinates[0]]} // LatLng = [lat, lng]
                  radius={item.radius}
                  color="red"
                  pane="circlePane"
                >
                  <Popup>
                    <strong>{item.name}</strong><br />
                    Radius: {item.radius} meter
                  </Popup>
                </Circle>
              ))}


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
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Option</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.data.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-muted transition-colors cursor-pointer">
                      <TableCell>{(reports.current_page - 1) * 10 + index + 1}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.location_name}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.kecamatan?.nama || '-'}</TableCell>
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
                          <Button
                            onClick={() => router.visit(`/report/${item.id}/edit`)}
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
