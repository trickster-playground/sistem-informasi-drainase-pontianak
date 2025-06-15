import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router, useForm } from '@inertiajs/react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import 'leaflet/dist/leaflet.css';
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
import { Circle, MapContainer, Popup, TileLayer } from 'react-leaflet';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Rawan Banjir',
    href: '/admin/rawan-banjir',
  },
];

type RawanBanjir = {
  id: number;
  name: string;
  kecamatan?: {
    nama: string;
  };
  radius: string;
  updated_at: string;
};

type RawanBanjirPagination = {
  data: RawanBanjir[];
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
  filters?: Filters;
  kecamatanOptions: KecamatanOption[];
  statistik: {
    total: number;
    rawanBanjirPerKecamatan: {
      id: number;
      nama: string;
      total: number;
    }[]; // Array of objects, not a single object or null
  };
};

type IndexProps = {
  circle: any[];
};


export default function RawanBanjir({ circle }: IndexProps) {

  // Fetching drainase data from the page props
  const { rawanBanjir } = usePage<{ rawanBanjir: RawanBanjirPagination }>().props;

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
    get('/admin/rawan-banjir'); // Akan mengirimkan query string
  };

  // Function to handle deletion of a drainase entry
  const handleDelete = (id: number) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
      router.delete(`/admin/rawan-banjir/${id}`);
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Rawan Banjir" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        <div className="grid auto-rows-3 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Daerah Rawan Banjir</CardTitle>
              <CardDescription>Jumlah seluruh data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{statistik.total}</p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Kecamatan Terbanyak</CardTitle>
              <CardDescription>Daerah Rawan Banjir</CardDescription>
            </CardHeader>
            <CardContent>
              {statistik.rawanBanjirPerKecamatan && statistik.rawanBanjirPerKecamatan.length > 0 ? (
                <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {statistik.rawanBanjirPerKecamatan.map((kecamatan) => (
                    <li
                      key={kecamatan.id}
                      className="flex justify-between border-b pb-1 last:border-none"
                    >
                      <span>{kecamatan.nama}</span>
                      <span className="font-semibold">{kecamatan.total}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Tidak ada data kecamatan.</p>
              )}
            </CardContent>

          </Card>
        </div>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Peta Sebaran</h3>
            <div className="h-[500px] w-full rounded overflow-hidden">
              <MapContainer center={[-0.0263, 109.3425]} zoom={12} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {/* Circle rawan banjir */}
                {rawanBanjir.data.map((item) =>
                  // Only render Circle if coordinates property exists
                  'coordinates' in item && Array.isArray((item as any).coordinates) ? (
                    <Circle
                      key={`banjir-${item.id}`}
                      center={[(item as any).coordinates[1], (item as any).coordinates[0]]}
                      radius={Number(item.radius)}
                      pathOptions={{ color: 'red', fillOpacity: 0.4 }}
                    >
                      <Popup>
                        <div className="max-w-xs p-3 rounded-md shadow bg-red-50 text-red-800 text-sm">
                          <h3 className="text-red-600 font-semibold text-base mb-1">🚨 {item.name}</h3>
                          <div className="space-y-1">
                            <p><span className="font-medium">Radius:</span> {item.radius} meter</p>
                            <div className='flex gap-2 items-center justify-start'>
                              <Button
                                onClick={() => router.visit(`/admin/rawan-banjir/${item.id}/edit`)}
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
                          <div className="mt-2 text-xs text-red-500 italic">
                            Area dengan potensi rawan banjir
                          </div>
                        </div>
                      </Popup>
                    </Circle>
                  ) : null
                )}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
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
            <Button onClick={() => router.visit('/admin/rawan-banjir/create')} className='bg-green-500 cursor-pointer hover:bg-green-800'>Tambah Data</Button>
          </div>
          <div className="p-2 flex flex-col gap-4">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className='text-semibold'>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama Lokasi</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Option</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawanBanjir && rawanBanjir.data?.length > 0 ? (
                    rawanBanjir.data.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-muted transition-colors cursor-pointer">
                        <TableCell>{(rawanBanjir.current_page - 1) * 10 + index + 1}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.kecamatan?.nama || '-'}</TableCell>
                        <TableCell>{item.radius || '-'}</TableCell>
                        <TableCell>
                          <div className='flex gap-2 items-center justify-start'>
                            <Button
                              onClick={() => router.visit(`/admin/rawan-banjir/${item.id}/edit`)}
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Tidak ada data yang ditemukan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 items-center justify-end">
              {rawanBanjir && rawanBanjir.data.length > 0 && (
                <div className="flex gap-2 items-center justify-end">
                  {rawanBanjir.links.map((link, idx) => (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
