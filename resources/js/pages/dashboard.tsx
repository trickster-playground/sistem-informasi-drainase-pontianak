import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

import customIconReport from '/public/assets/icons/marker_event.png';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

type DashboardProps = {
  totalDrainase: number;
  totalRawanBanjir: number;
  totalReports: number;
  handledReports: number;
  reportByCategory: { category: string; total: number }[];
  reportByStatus: { status: string; total: number }[];
  latestReports: any[];
  drainase: any[];
  rawanBanjir: any[];
  reportMarkers: any[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Dashboard({
  totalDrainase,
  totalRawanBanjir,
  totalReports,
  handledReports,
  reportByCategory,
  reportByStatus,
  latestReports,
  drainase,
  rawanBanjir,
  reportMarkers,
}: DashboardProps) {
  const customIcon = new Icon({
    iconUrl: customIconReport,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

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
              <p className="text-sm text-muted-foreground">Titik Rawan Banjir</p>
              <h2 className="text-2xl font-bold">{totalRawanBanjir}</h2>
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
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Kategori Laporan</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={reportByCategory}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {reportByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Laporan terbaru */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Laporan Terbaru</h3>
            <div className="space-y-3">
              {latestReports.map((report) => (
                <div key={report.id} className="border-b pb-2">
                  <p className="font-medium">{report.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {report.kecamatan?.nama} – {report.status} – {report.updated_at}
                  </p>
                </div>
              ))}
              {latestReports.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada laporan.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Peta */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Peta Sebaran</h3>
            <div className="h-[500px] w-full rounded overflow-hidden">
              <MapContainer center={[-0.0263, 109.3425]} zoom={12} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {/* Marker laporan */}
                {reportMarkers.map((marker) => (
                  <Marker
                    key={`report-${marker.id}`}
                    position={[marker.coordinates[0], marker.coordinates[1]]}
                    icon={customIcon}
                  >
                    <Popup>
                      <strong>{marker.title}</strong><br />
                      Kategori: {marker.category}<br />
                      Status: {marker.status}
                    </Popup>
                  </Marker>
                ))}
                {/* Circle rawan banjir */}
                {rawanBanjir.map((item) => (
                  <Circle
                    key={`banjir-${item.id}`}
                    center={[item.coordinates[0], item.coordinates[1]]}
                    radius={item.radius}
                    pathOptions={{ color: 'red', fillOpacity: 0.4 }}
                  />
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
