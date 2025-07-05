import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { SharedData, type BreadcrumbItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import customIconReport from '/public/assets/icons/marker_event.png';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import LegendControl from '@/components/preview/LegendControl';


const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];


type DashboardProps = {
  totalDrainase: number;
  totalReports: number;
  totalDrainaseBermasalah: number;
  handledReports: number;
  reportByCategory: { category: string; total: number }[];
  reportByStatus: { status: string; total: number }[];
  latestReports: any[];
  drainase: any[];
  reportMarkers: any[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Dashboard({
  totalDrainase,
  totalReports,
  totalDrainaseBermasalah,
  handledReports,
  reportByStatus,
  latestReports,
  reportMarkers,
}: DashboardProps) {
  const customIcon = new Icon({
    iconUrl: customIconReport,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
  const { auth } = usePage<SharedData>().props;
  dayjs.extend(relativeTime);
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Dashboard" />
      <div className="p-4 space-y-6">
        {/* Statistik */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Drainase</p>
              <h2 className="text-2xl font-bold">{totalDrainase}</h2>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Drainase Bermasalah</p>
              <h2 className="text-2xl font-bold">{totalDrainaseBermasalah}</h2>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Laporan</p>
              <h2 className="text-2xl font-bold">{totalReports}</h2>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Laporan Ditangani</p>
              <h2 className="text-2xl font-bold">{handledReports}</h2>
            </CardContent>
          </Card>
        </div>

        {/* Grafik */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Status Laporan</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={reportByStatus}>
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {/* Laporan terbaru */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Laporan Terbaru</h3>
              <div className="space-y-3">
                {latestReports.map((report) => (
                  <div key={report.id} className="border-b pb-2">
                    <p className="font-medium">{report.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.kecamatan?.nama} – {report.status} – {dayjs(report.updated_at).fromNow()}
                    </p>
                  </div>
                ))}
                {latestReports.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada laporan.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        {auth.user.role === 'Admin' && (
          <>
            {/* Peta */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Peta Laporan Masalah Drainase</h3>
                <div className="h-[500px] w-full rounded overflow-hidden">
                  <MapContainer center={[-0.0263, 109.3425]} zoom={12} className="h-full w-full" scrollWheelZoom>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                    <LegendControl
                      showUser={false}
                      showDrainase={false}
                    />
                    {/* Marker laporan */}
                    {reportMarkers.map((report) => (
                      <Marker
                        key={report.id}
                        position={[report.coordinates[0], report.coordinates[1]]}
                        icon={customIcon}
                      >
                        <Popup>
                          <div className="max-w-xs p-3 rounded shadow-md text-sm bg-white text-gray-800 space-y-1">
                            <h3 className="font-semibold text-base text-blue-600">{report.title}</h3>
                            <p className="text-gray-700">{report.description}</p>

                            <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                              <p><span className="font-medium text-gray-700">📍 Lokasi:</span> {report.location_name}</p>
                              <p><span className="font-medium text-gray-700">📌 Kecamatan:</span> {report.kecamatan}</p>
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
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
