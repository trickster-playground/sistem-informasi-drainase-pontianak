import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
import AppLogo from '@/components/app-logo';
import CreateCirclePane from '@/components/preview/CreateCirclePane';
import KecamatanFilter from '@/components/preview/KecamatanFilter';

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
};


export default function Welcome({ lines, selectedKecamatan, batasKecamatan, rawanBanjir }: Props) {
  const { auth } = usePage<SharedData>().props;

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
    'Pontianak Kota': '#FF5733',
    'Pontianak Utara': '#33C1FF',
    'Pontianak Selatan': '#8D33FF',
    'Pontianak Timur': '#33FF57',
    'Pontianak Barat': '#FFD700',
    'Pontianak Tenggara': '#FF33A6'
  };



  function getColorForKecamatan(nama: string): string {
    return kecamatanColors[nama] || '#3cb44b'; // fallback hitam kalau nama gak ada
  }

  // State filter kecamatan, default dari prop backend
  const [kecamatan, setKecamatan] = useState<string>('all');

  // Inertia form helper untuk submit filter
  const { get } = useForm();

  // Filter berdasarkan kecamatan
  const filteredLines = kecamatan === 'all'
    ? lines
    : lines.filter(line => line.kecamatan === kecamatan);

  const filteredRawanBanjir = kecamatan === 'all'
    ? rawanBanjir
    : rawanBanjir.filter(item => item.kecamatan === kecamatan);

  // Data kecamatan unik untuk dropdown (ambil dari lines)
  const kecamatanOptions = Array.from(
    new Set(
      lines
        .map(line => line.kecamatan)
        .filter((kec): kec is string => typeof kec === 'string' && kec.length > 0)
    )
  );

  return (
    <>
      <Head title="Welcome">
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
      </Head>

      <div className="flex min-h-screen flex-col bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
        {/* Navbar */}
        <nav className="w-full px-6 py-2 shadow-sm dark:shadow-none border-b border-[#eaeaea] dark:border-[#2a2a2a]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="text-xl font-semibold">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <AppLogo />
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/" className="hover:underline">Home</Link>
              <Link href="/about" className="hover:underline">About</Link>
              <Link href="/contact" className="hover:underline">Contact</Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4 text-sm">
              {auth.user ? (
                <Link
                  href={route('dashboard')}
                  className="rounded-sm border border-[#19140035] px-4 py-1.5 hover:border-[#1915014a] dark:border-[#3E3E3A] dark:hover:border-[#62605b] cursor-pointer"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href={route('login')} className="px-4 py-1.5 hover:underline">
                    Log in
                  </Link>
                  <Link
                    href={route('register')}
                    className="rounded-sm border border-[#19140035] px-4 py-1.5 hover:border-[#1915014a] dark:border-[#3E3E3A] dark:hover:border-[#62605b]"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 lg:px-8 ">
          {/* Teks */}
          <div className="w-full max-w-4xl text-center">
            <h1 className="text-3xl font-bold mb-4">Peta Sebaran Drainase di Kota Pontianak</h1>
          </div>

          {/* Dropdown Filter Kecamatan */}
          <KecamatanFilter
            value={kecamatan}
            options={kecamatanOptions}
            onChange={(val) => setKecamatan(val)}
          />

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


              {filteredRawanBanjir.map((item) => (
                <Circle
                  key={item.id}
                  center={[item.coordinates[1], item.coordinates[0]]}
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

        </main>


        <div className="hidden h-14.5 lg:block" />
      </div>
    </>
  );
}
