import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, router } from '@inertiajs/react';

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


export default function RawanBanjir() {

  // Fetching drainase data from the page props

  const page = usePage<{ rawanBanjir?: RawanBanjirPagination }>();

  const rawanBanjir = page.props?.rawanBanjir;

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
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card Description</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
            <CardFooter>
              <p>Card Footer</p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card Description</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
            <CardFooter>
              <p>Card Footer</p>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card Description</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
            <CardFooter>
              <p>Card Footer</p>
            </CardFooter>
          </Card>
        </div>
        <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
          {/* Table Section */}
          <div className='flex justify-end p-2'>
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
