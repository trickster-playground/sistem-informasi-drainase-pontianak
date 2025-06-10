import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from 'react';

import customIconUser from '/public/assets/icons/marker_user.png';
import L from 'leaflet';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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

  const [showLines, setShowLines] = useState(true);
  const [showRawanBanjir, setShowRawanBanjir] = useState(true);
  const [showKecamatan, setShowKecamatan] = useState(true);


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

  const isMobile = window.innerWidth < 768;
  const iconSize: [number, number] = isMobile ? [36, 36] : [48, 48];

  const userIcon = L.icon({
    iconUrl: customIconUser,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });

  return (
    <>
      <Head title="Peta Drainase & Banjir Kota Pontianak">
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
        {/* Hero */}
        <header className="container mx-auto px-6 mt-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Peta Drainase & Rawan Banjir Pontianak</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Jelajahi sebaran drainase dan area rawan banjir di kota. Gunakan data ini untuk perencanaan, pelaporan, dan edukasi.
          </p>
        </header>
        {/* Main Content */}
        <main className="flex flex-1 flex-col px-6 lg:px-28 mt-5 ">
          {/* Dropdown Filter Kecamatan */}
          <div className='flex justify-center items-center gap-4'>
            <KecamatanFilter
              value={kecamatan}
              options={kecamatanOptions}
              onChange={(val) => setKecamatan(val)}
            />
            <div className='flex justify-center items-center gap-2 mb-5'>
              <Checkbox id="showDrainase" checked={showLines} onCheckedChange={() => setShowLines(!showLines)} />
              <Label htmlFor="showDrainase">Tampilkan jalur Drainase.</Label>
            </div>
            <div className='flex justify-center items-center gap-2 mb-5'>
              <Checkbox id="showRawanBanjir" checked={showRawanBanjir} onCheckedChange={() => setShowRawanBanjir(!showRawanBanjir)} />
              <Label htmlFor="showRawanBanjir">Tampilkan Daerah Rawan Banjir.</Label>
            </div>
            <div className='flex justify-center items-center gap-2 mb-5'>
              <Checkbox id="showKecamatan" checked={showKecamatan} onCheckedChange={() => setShowKecamatan(!showKecamatan)} />
              <Label htmlFor="showKecamatan">Tampilkan Batas Kecamatan.</Label>
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

              {showLines && filteredLines.map((line) => {
                const latLngCoordinates: [number, number][] = line.coordinates.map(
                  ([lng, lat]) => [lat, lng]
                );

                return (
                  <Polyline
                    key={line.id}
                    positions={latLngCoordinates}
                    pathOptions={{ color: 'blue', weight: 2 }}
                    pane="drainasePane"
                  >
                    <Popup>
                      <div className="max-w-xs p-3 rounded-md shadow bg-white text-gray-800 text-sm">
                        <h3 className="text-blue-600 font-semibold text-base mb-1">🛠️ {line.name}</h3>
                        <div className="space-y-1">
                          <p><span className="font-medium">Fungsi:</span> {line.fungsi || '-'}</p>
                          <p><span className="font-medium">Kecamatan:</span> {line.kecamatan || '-'}</p>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 italic">
                          Jalur drainase yang terdeteksi
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}


              {showRawanBanjir && filteredRawanBanjir.map((item) => (
                <Circle
                  key={item.id}
                  center={[item.coordinates[1], item.coordinates[0]]}
                  radius={item.radius}
                  color="red"
                  fillOpacity={0.3}
                  pane="circlePane"
                >
                  <Popup>
                    <div className="max-w-xs p-3 rounded-md shadow bg-red-50 text-red-800 text-sm">
                      <h3 className="text-red-600 font-semibold text-base mb-1">🚨 {item.name}</h3>
                      <div className="space-y-1">
                        <p><span className="font-medium">Radius:</span> {item.radius} meter</p>
                      </div>
                      <div className="mt-2 text-xs text-red-500 italic">
                        Area dengan potensi rawan banjir
                      </div>
                    </div>
                  </Popup>
                </Circle>
              ))}


              {showKecamatan && batasKecamatan.map((kec) => {
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
                      <div className="max-w-xs p-3 rounded-md shadow bg-white text-slate-800 text-sm">
                        <h3 className="text-base font-semibold text-indigo-600 mb-1">📍 Wilayah Kecamatan</h3>
                        <div className="space-y-1">
                          <p><span className="font-medium">Nama:</span> {kec.nama}</p>
                          <p><span className="font-medium">Kode Warna:</span> <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: getColorForKecamatan(kec.nama) }}></span></p>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 italic">
                          Batas administratif wilayah kecamatan
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

            </MapContainer>
          </section>

        </main>

        {/* About Section */}
        <section className="container mx-auto px-6 py-16 bg-gray-50 dark:bg-gray-800">
          <h2 className="text-3xl font-bold mb-4">Tentang Aplikasi</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Aplikasi ini bertujuan untuk membantu masyarakat Pontianak memahami sebaran drainase serta mengidentifikasi area rawan banjir. Data dikumpulkan dari berbagai sumber dan ditampilkan di peta interaktif agar mudah diakses oleh publik, pemerintah, dan peneliti.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Dikembangkan dengan teknologi modern seperti LeafletJS, React, dan InertiaJS, aplikasi ini berfokus pada antarmuka ringan, responsif, dan mudah digunakan pada berbagai perangkat.
          </p>
        </section>

        <div className="hidden h-14.5 lg:block" />
      </div>
    </>
  );
}
