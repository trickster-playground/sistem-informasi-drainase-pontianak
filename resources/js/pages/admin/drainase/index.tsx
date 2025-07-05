import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router, useForm } from '@inertiajs/react';
import "leaflet/dist/leaflet.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from '@/components/ui/button';
import { Trash, SquarePen } from 'lucide-react';
import { useState } from 'react';
import { MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';
import LegendControl from '@/components/preview/LegendControl';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Drainase',
    href: '/admin/drainase',
  },
];

type Drainase = {
  id: number;
  name: string;
  fungsi: string;
  panjang: number;
  kecamatan?: {
    nama: string;
  };
  kondisi: string;
  updated_at: string;
};

type Line =
  | {
    id: number;
    name: string;
    type: 'LineString';
    coordinates: [number, number][];
    fungsi?: string;
    status?: string;
    kecamatan?: string | null;
  }
  | {
    id: number;
    name: string;
    type: 'Point';
    coordinates: [number, number];
    fungsi?: string;
    status?: string;
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
    status?: string;
    kecamatan?: string | null;
  };

type DrainasePagination = {
  data: Drainase[];
  current_page: number;
  last_page: number;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
};

type KecamatanOption = {
  id: number;
  nama: string;
};

type Filters = {
  search?: string;
  kecamatan_id?: number | string;
};

type PageProps = {
  lines: Line[];
  filters?: Filters;
  kecamatanOptions: KecamatanOption[];
  statistik: {
    total: number;
    fungsi: {
      primer: number;
      sekunder: number;
      tersier: number;
    };
    drainasePerKecamatan: {
      id: number;
      nama: string;
      total: number;
    }[]; // Array of objects, not a single object or null
  };
};

export default function Drainase() {

  // Fetching drainase data from the page props
  const { drainase } = usePage<{ drainase: DrainasePagination }>().props;

  const { lines } = usePage<PageProps>().props;

  // Fetching statistik from the page props
  const { statistik } = usePage<PageProps>().props;

  // Fetching filters and kecamatan options from the page props
  const { filters, kecamatanOptions } = usePage<PageProps>().props;

  // Setting up form handling for filters
  const { data, setData, get } = useForm({
    search: filters?.search || '',
    kecamatan_id: filters?.kecamatan_id || '',
  });

  // Function to handle filtering of drainase entries
  const handleFilter = () => {
    get('/admin/drainase'); // Akan mengirimkan query string
  };

  // Function to handle deletion of a drainase entry
  const handleDelete = (id: number) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
      router.delete(`/admin/drainase/${id}`);
    }
  };


  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Drainase" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        <div className="grid auto-rows-3 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Drainase</CardTitle>
              <CardDescription>Jumlah seluruh data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{statistik.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fungsi Drainase</CardTitle>
              <CardDescription>Jumlah drainase berdasarkan fungsi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-lg font-medium">Primer</p>
                  <p className="text-2xl font-semibold">{statistik.fungsi.primer}</p>
                  <p className="text-sm text-muted-foreground">Drainase fungsi primer</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium">Sekunder</p>
                  <p className="text-2xl font-semibold">{statistik.fungsi.sekunder}</p>
                  <p className="text-sm text-muted-foreground">Drainase fungsi sekunder</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium">Tersier</p>
                  <p className="text-2xl font-semibold">{statistik.fungsi.tersier}</p>
                  <p className="text-sm text-muted-foreground">Drainase fungsi tersier</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Kecamatan Terbanyak</CardTitle>
              <CardDescription>Drainase paling banyak</CardDescription>
            </CardHeader>
            <CardContent>
              {statistik.drainasePerKecamatan && statistik.drainasePerKecamatan.length > 0 ? (
                <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {statistik.drainasePerKecamatan.map((kecamatan) => (
                    <li
                      key={kecamatan.id}
                      className="flex justify-between border-b pb-1 last:border-none"
                    >
                      <span>{kecamatan.nama}</span>
                      <span className="font-semibold">{kecamatan.total} drainase</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Tidak ada data kecamatan.</p>
              )}
            </CardContent>

          </Card>
        </div>

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

            <LegendControl
              showEvent={false}
              showUser={false}
            />

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

        <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
          {/* Table Section */}
          <div className='flex justify-between p-2'>
            <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={data.search}
                  onChange={(e) => setData('search', e.target.value)}
                  placeholder="Cari Nama atau Fungsi"
                  className="border px-3 py-2 rounded-md w-full md:w-64"
                />
                <select
                  value={data.kecamatan_id}
                  onChange={(e) => setData('kecamatan_id', e.target.value)}
                  className="border px-3 py-2 rounded-md"
                >
                  <option value="">Semua Kecamatan</option>
                  {kecamatanOptions.map((kec: any) => (
                    <option key={kec.id} value={kec.id}>
                      {kec.nama}
                    </option>
                  ))}
                </select>
                <Button onClick={handleFilter} className="bg-blue-500 hover:bg-blue-700 text-white">
                  Filter
                </Button>
              </div>
              <Button
                onClick={() => {
                  setData({ search: '', kecamatan_id: '' });
                  get('/admin/drainase');
                }}
                className="bg-gray-500 hover:bg-gray-700 text-white"
              >
                Reset
              </Button>
            </div>
            <Button onClick={() => router.visit('/admin/drainase/create')} className='bg-green-500 cursor-pointer hover:bg-green-800'>Tambah Data</Button>
          </div>
          <div className="p-2 flex flex-col gap-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className='text-semibold'>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama Lokasi</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead>Fungsi</TableHead>
                    <TableHead>Panjang</TableHead>
                    <TableHead>Option</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drainase.data.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-muted transition-colors cursor-pointer">
                      <TableCell>{(drainase.current_page - 1) * 10 + index + 1}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.kecamatan?.nama || '-'}</TableCell>
                      <TableCell>{item.fungsi}</TableCell>
                      <TableCell>{item.panjang || '-'} meter</TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 items-center justify-end">
              {drainase.links.map((link, idx) => (
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
