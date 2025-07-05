import { type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
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

import placeholderImage from '/public/assets/icons/placeholder.jpg';

import CreateDrainasePane from '@/components/preview/CreateDrainasePane';
import CreateMarkerPane from '@/components/preview/CreateMarkerPane';
import AppLogo from '@/components/app-logo';
import CreateCirclePane from '@/components/preview/CreateCirclePane';
import KecamatanFilter from '@/components/preview/KecamatanFilter';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import SetMapCenter from '@/components/preview/SetMapCenter';
import * as turf from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';

import axios from 'axios';
import LegendControl from '@/components/preview/LegendControl';

type Line = {
  id: number;
  name: string;
  coordinates: [number, number][];
  type: 'LineString';
  fungsi?: string;
  status?: string;
  kecamatan?: string | null;
} | {
  id: number;
  name: string;
  type: 'Point';
  coordinates: [number, number];
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

};

interface BatasKecamatan {
  id: number;
  nama: string;
  coordinates: [number, number][][];
}

type FormErrors = {
  reporterName?: string;
  reporterContact?: string;
  name?: string;
  location?: string;
  description?: string;
  category?: string;
  file?: string;
  [key: string]: string | undefined;
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

export default function Welcome({ lines, selectedKecamatan, batasKecamatan }: Props) {
  const { auth } = usePage<SharedData>().props;

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const [showLines, setShowLines] = useState(false);
  const [showKecamatan, setShowKecamatan] = useState(false);

  const [radiusValue, setRadiusValue] = useState(0);


  const [position, setPosition] = useState<[number, number] | null>(null);
  const [drainase, setDrainase] = useState<Array<{ coordinates: string; name?: string }>>([]);

  // Form Laporan
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null); // Simpan file yang diupload
  const [preview, setPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});

  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);

  const [drawType, setDrawType] = useState<'LineString' | 'Polygon' | 'Circle' | 'Point' | null>(null);

  const [nearbyDrainase, setNearbyDrainase] = useState<Line[]>([]);
  const [selectedDrainaseIds, setSelectedDrainaseIds] = useState<number[]>([]);

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

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMarkerPosition([latitude, longitude]);
          setPosition([latitude, longitude]);
        },
        (error) => {
          console.error("Gagal mendapatkan lokasi pengguna:", error);
        }
      );
    } else {
      console.warn("Geolocation tidak tersedia di browser ini.");
    }
  }, []);

  useEffect(() => {
    if (!position) return;

    const [lat, lng] = position;

    axios.get(`/drainase/nearby`, {
      params: { lat, lng, radius: radiusValue }
    }).then(({ data }) => {
      setDrainase(data);
    });
  }, [radiusValue, position]);

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
  const [kecamatanForm, setKecamatanForm] = useState<string>('');


  // Filter berdasarkan kecamatan
  const filteredLines = kecamatan === 'all'
    ? lines
    : lines.filter(line => line.kecamatan === kecamatan);

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

  function getKecamatanNameByCoordinates(
    coords: [number, number],
    batasKecamatan: BatasKecamatan[]
  ): string {
    const userPoint = point([coords[1], coords[0]]); // lng, lat

    for (const kec of batasKecamatan) {
      const polygonCoords: [number, number][][] = kec.coordinates.map(ring =>
        ring.map(([lng, lat]: [number, number]) => [lng, lat])
      );

      const poly = polygon([polygonCoords[0]]);
      if (booleanPointInPolygon(userPoint, poly)) {
        return kec.nama;
      }
    }

    return "Tidak diketahui";
  }

  useEffect(() => {
    if (markerPosition && batasKecamatan.length > 0) {
      const kecamatanNama = getKecamatanNameByCoordinates(
        [markerPosition[0], markerPosition[1]], // [lat, lng]
        batasKecamatan
      );
      setKecamatanForm(kecamatanNama);
      setKecamatan(kecamatanNama);
    }
  }, [markerPosition, batasKecamatan]);


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      name,
      reporterName,
      reporterContact,
      kecamatan: kecamatanForm,
      location,
      description,
      category,
      file,
      type: 'Point',
      coordinates: markerPosition,
      drainase_id: selectedDrainaseIds,
    };

    router.post('/report/create', payload, {
      onSuccess: () => {
        setDrawType(null);
        setCoordinates(null);
        setName('');
        setReporterName('');
        setReporterContact('');
        setLocation('');
        setDescription('');
        setCategory('');
        setFile(null);
        setPreview(null);
        setKecamatanForm('all');
      },
      onError: (error) => {
        setErrors(error);
      }
    });
  };

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
              <Link href="#about" className="hover:underline">About</Link>
              <Link href="#report" className="hover:underline">Contact</Link>
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
                </>
              )}
            </div>
          </div>
        </nav>
        {/* Hero */}
        <header className="container mx-auto px-6 mt-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Sistem Informasi Geografis Jaringan Drainase di Kota Pontianak</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Jelajahi sebaran drainase di kota. Gunakan data ini untuk perencanaan, pelaporan, dan edukasi.
          </p>
        </header>
        {/* Main Content */}
        <main className="flex flex-1 flex-col px-6 lg:px-28 mt-5 ">
          {/* Dropdown Filter Kecamatan */}
          <div className='flex flex-col justify-center items-start lg:flex-row lg:items-center gap-2 '>
            <KecamatanFilter
              value={kecamatan}
              options={kecamatanOptions}
              onChange={(val) => setKecamatan(val)}
            />
            <div className='flex justify-center items-center gap-2 mb-5'>
              <label htmlFor="radiusInput" className="text-sm font-medium">Radius pencarian (km)</label>
              <input
                type="number"
                id="radiusInput"
                className="border rounded px-3 py-1 w-40"
                value={radiusValue}
                min={0}
                onChange={(e) => setRadiusValue(Number(e.target.value))}
              />
            </div>

            <div className='flex justify-center items-center gap-2 mb-5'>
              <Checkbox id="showDrainase" checked={showLines} onCheckedChange={() => setShowLines(!showLines)} />
              <Label htmlFor="showDrainase">Tampilkan jalur Drainase.</Label>
            </div>
            <div className='flex justify-center items-center gap-2 mb-5'>
              <Checkbox id="showKecamatan" checked={showKecamatan} onCheckedChange={() => setShowKecamatan(!showKecamatan)} />
              <Label htmlFor="showKecamatan">Tampilkan Batas Kecamatan.</Label>
            </div>
          </div>

          {/* Map Leaflet*/}
          <section className="w-full h-[600px] mb-8 px-5 z-0">
            <MapContainer
              center={markerPosition ?? [-0.02, 109.34]} // Pusat Kota Pontianak
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
              <LegendControl showEvent={false} />

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
                      <p className="text-gray-700">
                        Kecamatan:
                        <br />
                        <span className="font-mono text-gray-900">
                          {kecamatanForm}
                        </span>
                      </p>
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Data lokasi diperoleh secara otomatis
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {position && radiusValue > 0 && (
                <Circle
                  center={position}
                  radius={radiusValue * 1000}
                  color="blue"
                  fillOpacity={0}
                ><Popup>
                    <div className="max-w-xs p-3 rounded-md shadow bg-green-50 text-green-800 text-sm">
                      <h3 className="text-green-600 font-semibold text-base mb-1">🚨 Radius Drainase </h3>
                      <div className="space-y-1">
                        <p><span className="font-medium">Radius:</span> {radiusValue * 1000}  meter</p>
                      </div>
                      <div className="mt-2 text-xs text-green-500 italic">
                        Drainase disekitar anda.
                      </div>
                    </div>
                  </Popup>
                </Circle>
              )}


              {drainase.map((item, idx) => {
                const latLngCoordinates: [number, number][] = (Array.isArray(item.coordinates)
                  ? (item.coordinates as [number, number][])
                  : []
                ).map(([lng, lat]) => [lat, lng]);
                return (
                  <Polyline
                    key={idx}
                    positions={latLngCoordinates}
                    pathOptions={{ color: 'blue', weight: 2 }}
                    pane="drainasePane"
                  >
                    <Popup>
                      <div className="max-w-xs p-3 rounded-md shadow bg-white text-gray-800 text-sm">
                        <h3 className="text-blue-600 font-semibold text-base mb-1">🛠️ {item.name}</h3>
                        <div className="space-y-1">
                          {/* <p><span className="font-medium">Fungsi:</span> {item.fungsi || '-'}</p>
                          <p><span className="font-medium">Kecamatan:</span> {item.kecamatan || '-'}</p> */}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 italic">
                          Jalur drainase yang terdeteksi
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {showLines && filteredLines.map((line) => {
                const latLngCoordinates: [number, number][] = (Array.isArray(line.coordinates)
                  ? (line.coordinates as [number, number][])
                  : []
                ).map(([lng, lat]) => [lat, lng]);

                return (
                  <Polyline
                    key={line.id}
                    positions={latLngCoordinates}
                    pathOptions={{ color: line.status === 'Terdapat Masalah' ? 'red' : 'blue', weight: 2 }}
                    pane="drainasePane"
                  >
                    <Popup>
                      <div className="max-w-xs p-3 rounded-md shadow bg-white text-gray-800 text-sm">
                        <h3 className="text-blue-600 font-semibold text-base mb-1">🛠️ {line.name}</h3>
                        <div className="space-y-1">
                          <p><span className="font-medium">Fungsi:</span> {line.fungsi || '-'}</p>
                          <p><span className="font-medium">Kecamatan:</span> {line.kecamatan || '-'}</p>
                          <p><span className="font-medium">Status Drainase:</span> {line.status || '-'}</p>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 italic">
                          Jalur drainase yang terdeteksi
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}


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
        <section id="about" className="bg-white dark:bg-gray-900 py-20 px-6 md:px-12">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-white mb-6">
              Tentang Aplikasi
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Platform ini dirancang untuk <span className="font-semibold text-blue-600 dark:text-blue-400">memetakan sistem drainase Kota Pontianak</span> secara interaktif dan informatif. Dengan menggabungkan teknologi geospasial dan data publik, kami memberikan akses mudah untuk memahami kondisi saluran air kota.
            </p>

            <div className="grid md:grid-cols-2 gap-10 text-left">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">🔍 Transparansi Data</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Semua data drainase ditampilkan secara terbuka untuk meningkatkan partisipasi masyarakat dalam pelaporan dan pemantauan. Baik warga, akademisi, maupun pemangku kebijakan dapat mengakses informasi ini secara real-time.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">🗺️ Peta Interaktif</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Menggunakan <strong>LeafletJS</strong> dan teknologi frontend modern seperti <strong>React</strong> & <strong>InertiaJS</strong>, aplikasi ini menyediakan visualisasi yang dinamis dan intuitif untuk melihat kondisi drainase hingga ke tingkat koordinat.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">📈 Dukungan Keputusan</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Data yang disajikan dapat digunakan sebagai dasar pengambilan keputusan dalam pembangunan infrastruktur, mitigasi banjir, dan perencanaan tata ruang berbasis bukti.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">🤝 Kolaborasi Terbuka</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Aplikasi ini terbuka untuk pengembangan dan integrasi lebih lanjut. Kami mendorong kontribusi dari komunitas pengembang, peneliti, dan pemerintah daerah untuk menciptakan solusi yang lebih cerdas.
                </p>
              </div>
            </div>

            <div className="mt-12">
              <p className="text-base text-gray-700 dark:text-gray-300">
                Kami percaya bahwa teknologi dapat menjadi jembatan antara <span className="font-medium text-blue-600 dark:text-blue-400">informasi dan aksi nyata</span>. Dengan memanfaatkan aplikasi ini, Anda ikut berperan dalam membangun Kota Pontianak yang lebih tangguh terhadap perubahan iklim dan tantangan urbanisasi.
              </p>
            </div>
          </div>
        </section>

        {/* Report Section */}
        <section id='report' className="container mx-auto px-6 py-6 bg-gray-50 dark:bg-gray-800">
          <h2 className="text-3xl font-bold mb-2 text-blue-700">📝 Laporan Drainase & Banjir</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Silakan isi formulir berikut untuk membantu kami mendeteksi kondisi drainase di Pontianak.
          </p>

          <form onSubmit={handleSubmit} >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border border-gray-300 rounded-md p-4 bg-white">
              <div className='flex flex-col gap-4'>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Nama Anda</label>
                    <input
                      type="text"
                      name="reporterName"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder='Nama anda'
                      className="border rounded px-3 py-2 w-full"
                      required
                    />
                    {errors?.reporterName && (
                      <p className="text-red-500 text-sm mt-1">{errors.reporterName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Email Anda</label>
                    <input
                      type="email"
                      name="reporterContact"
                      value={reporterContact}
                      onChange={(e) => setReporterContact(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                      placeholder='Alamat email anda'
                      required
                    />
                    {errors?.reporterContact && (
                      <p className="text-red-500 text-sm mt-1">{errors.reporterContact}</p>
                    )}
                  </div>
                </div>
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
                  {errors?.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block font-medium mb-1">Lokasi</label>
                  <input
                    type="text"
                    name="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder='Tuliskan alamat laporan'
                    className="border rounded px-3 py-2 w-full"
                    required
                  />
                  {errors?.location && (
                    <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                  )}
                </div>
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1">Kategori</label>
                    <input
                      type="text"
                      name="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="border rounded px-3 py-2 w-full"
                      placeholder='Drainase / Banjir / Lainnya'
                      required
                    />
                    {errors?.category && (
                      <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                    )}
                  </div>
                </div> */}
                <div>
                  <label className="block font-medium mb-1">Deskripsi</label>
                  <textarea
                    name="description"
                    value={description}
                    rows={2}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                    placeholder='Deskripsikan laporan'
                    required
                  />
                  {errors?.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                  )}
                </div>

                {/* Preview Foto dengan placeholder */}
                <div>
                  <label className="block font-medium mb-1">Tambah Foto Pendukung</label>
                  <div className="flex flex-col items-start border border-gray-300 rounded-md p-3 flex items-center gap-4 bg-white shadow-sm">
                    <img
                      src={preview || placeholderImage}
                      alt="Preview"
                      className=" max-h-55 object-cover rounded border"
                    />
                    <input
                      type="file"
                      name="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="text-sm file:bg-blue-600 file:text-white file:py-2 file:px-4 file:rounded file:cursor-pointer"
                      required
                    />
                    {errors?.file && (
                      <p className="text-red-500 text-sm mt-1">{errors.file}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className='mt-4'>
                {/* Dropdown Filter Kecamatan */}
                <div className='flex'>
                  <KecamatanFilter
                    value={kecamatanForm}
                    options={kecamatanOptions}
                    onChange={(val) => setKecamatanForm(val)}
                  />
                  {errors?.kecamatan && (
                    <p className="text-red-500 text-sm mt-1">{errors.kecamatan}</p>
                  )}
                </div>

                <div className="h-[450px] relative z-0 rounded overflow-hidden shadow">
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

                    {userLocation && (
                      <>
                        <Marker
                          position={userLocation}
                          icon={userIcon}
                          draggable={true}
                          eventHandlers={{
                            dragend: (e) => {
                              const marker = e.target;
                              const position = marker.getLatLng();
                              const coords: [number, number] = [position.lng, position.lat];
                              const kecamatanNama = getKecamatanNameByCoordinates(
                                [position.lat, position.lng],
                                batasKecamatan
                              );
                              setKecamatanForm(kecamatanNama);
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
                              <p className="text-gray-700">
                                Kecamatan:
                                <br />
                                <span className="font-mono text-gray-900">
                                  {kecamatanForm}
                                </span>
                              </p>
                              <div className="mt-2 text-xs text-gray-500 italic">
                                Data lokasi diperoleh secara otomatis, anda dapat memindahkan marker dengan menggesernya.
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                        <SetMapCenter position={userLocation} />
                      </>
                    )}

                    <CreateMarkerPane />
                    <CreateDrainasePane />

                    {filteredLines.map((line) => {
                      switch (line.type) {
                        case 'LineString': {
                          const latLngCoordinates: [number, number][] = (Array.isArray(line.coordinates)
                            ? (line.coordinates as [number, number][])
                            : []
                          ).map(([lng, lat]) => [lat, lng]);

                          return (
                            <Polyline
                              key={`${line.id}-${selectedDrainaseIds.includes(line.id) ? 'red' : 'blue'}`}
                              positions={latLngCoordinates}
                              color={selectedDrainaseIds.includes(line.id) ? 'red' : 'blue'}
                              pane='drainasePane'
                            >
                              <Popup>
                                <div className="max-w-xs p-3 rounded-md shadow bg-white text-gray-800 text-sm">
                                  <h3 className="text-blue-600 font-semibold text-base mb-1">🛠️ {line.name}</h3>
                                  <div className="space-y-1">
                                    <p><span className="font-medium">Fungsi:</span> {line.fungsi || '-'}</p>
                                    <p><span className="font-medium">Kecamatan:</span> {line.kecamatan || '-'}</p>
                                    <p><span className="font-medium">Kecamatan:</span> {line.status || '-'}</p>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500 italic">
                                    Jalur drainase yang terdeteksi
                                  </div>
                                </div>
                              </Popup>
                            </Polyline>
                          );
                        }
                      }
                    })}


                  </MapContainer>
                </div>

                <div className="mt-6">
                  <label className="block font-medium mb-1">Koordinat Lokasi Anda</label>
                  <textarea
                    value={markerPosition ? `${markerPosition[0]}, ${markerPosition[1]}` : ''}
                    readOnly
                    rows={1}
                    className="w-full border rounded px-3 py-2 text-sm text-gray-800"
                  />
                </div>
                {nearbyDrainase.length > 0 && (
                  <div className="mt-4 gap-3">
                    <h3 className="font-medium mb-2">Drainase Terdekat (dalam 20m):</h3>
                    {nearbyDrainase.map((line) => (
                      <div key={line.id} className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          value={line.id}
                          checked={selectedDrainaseIds.includes(line.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDrainaseIds([...selectedDrainaseIds, line.id]);
                            } else {
                              setSelectedDrainaseIds(selectedDrainaseIds.filter(id => id !== line.id));
                            }
                          }}
                        />
                        <label>{line.name !== '' ? line.name : 'Tidak ada Nama'}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className='flex justify-center items-center'>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 mt-4 rounded hover:bg-blue-700 w-full cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </form>
        </section>

        <div className="hidden h-14.5 lg:block" />
      </div>
    </>
  );
}
