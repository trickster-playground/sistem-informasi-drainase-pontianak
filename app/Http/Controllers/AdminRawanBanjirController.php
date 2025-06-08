<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use App\Models\Kecamatan;
use App\Models\RawanBanjir;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminRawanBanjirController extends Controller
{
  public function index(Request $request)
  {
    $rawanBanjir = RawanBanjir::with('kecamatan')
      ->orderByDesc('created_at') // opsional, agar data terbaru muncul dulu
      ->paginate(10); // bisa sesuaikan jumlah per halaman

    return Inertia::render('admin/rawan_banjir/index', [
      'rawanBanjir' => $rawanBanjir,
    ]);
  }

  public function create(Request $request)
  {
    $kecamatanFilter = $request->query('kecamatan');

    $query = Drainase::with('kecamatan');

    if ($kecamatanFilter && $kecamatanFilter !== 'all') {
      $query->whereHas('kecamatan', function ($q) use ($kecamatanFilter) {
        $q->where('nama', $kecamatanFilter);
      });
    }

    $lines = $query->get()->map(function ($item) {
      return [
        'id' => $item->id,
        'name' => $item->name,
        'type' => $item->type,
        'coordinates' => $item->coordinates,
        'fungsi' => $item->fungsi,
        'kecamatan' => $item->kecamatan->nama ?? null,
      ];
    });

    // Ambil semua kecamatan dari database
    $allKecamatan = Kecamatan::orderBy('nama')->get();

    // Ambil semua batas wilayah dari DB
    $batasKecamatan = Kecamatan::all()->map(function ($item) {
      return [
        'nama' => $item->nama,
        'type' => $item->type,
        'coordinates' => $item->coordinates,
      ];
    });

    return Inertia::render('admin/rawan_banjir/create', [
      'lines' => $lines,
      'selectedKecamatan' => $kecamatanFilter,
      'kecamatanList' => $allKecamatan,
      'batasKecamatan' => $batasKecamatan,
    ]);
  }

  public function store(Request $request)
  {

    $validated = $request->validate([
      'name' => 'required|string|max:255',
      'kecamatan' => 'nullable|string',
      'type' => 'required|string|in:LineString,Polygon,Circle',
      'coordinates' => 'required|array',
      'coordinates.type' => 'required|string|in:LineString,Polygon,Circle',
      'coordinates.center' => 'required|array',
      'coordinates.radius' => 'required',
    ]);


    $kecamatan = Kecamatan::where('nama', $validated['kecamatan'])->first();

    $rawan_banjir = RawanBanjir::create([
      'name' => $validated['name'],
      'kecamatan_id' => $kecamatan?->id,
      'type' => $validated['type'],
      'coordinates' => $validated['coordinates']['center'], // ini akan tersimpan dalam kolom JSON
      'radius' => $validated['coordinates']['radius'], // ini akan tersimpan dalam kolom JSON
    ]);

    return redirect()->route('admin.rawan-banjir.index')->with('success', 'Data rawan banjir berhasil ditambahkan.');
  }

  public function show($id)
  {
    $rawanBanjir = RawanBanjir::findOrFail($id);

    $lines = [
      [
        'id' => $rawanBanjir->id,
        'name' => $rawanBanjir->name,
        'type' => $rawanBanjir->type,
        'kecamatan' => $rawanBanjir->kecamatan?->nama,
        'coordinates' => $rawanBanjir->coordinates,
        'radius' => $rawanBanjir->radius,
      ]
    ];

    $kecamatanList = Kecamatan::select('id', 'nama')->get();

    return inertia('admin/rawan_banjir/edit', [
      'lines' => $lines,
      'selectedKecamatan' => $rawanBanjir->kecamatan?->nama ?? 'all',
      'kecamatanList' => $kecamatanList,
    ]);
  }

  public function update(Request $request, $id)
  {

    $request->validate([
      'name' => 'required|string|max:255',
      'kecamatan' => 'required|string',
      'coordinates' => 'required|array',
    ]);

    $rawanBanjir = RawanBanjir::findOrFail($id);
    $rawanBanjir->name = $request->name;

    // jika menggunakan relasi ke tabel kecamatan:
    $kecamatan = Kecamatan::where('nama', $request->kecamatan)->first();
    if ($kecamatan) {
      $rawanBanjir->kecamatan_id = $kecamatan->id;
    }

    $rawanBanjir->coordinates = $request->coordinates['coordinates']; // ini akan tersimpan dalam kolom JSON
    $rawanBanjir->radius = $request->radius; // ini akan tersimpan dalam kolom JSON

    $rawanBanjir->save();

    return redirect()->route('admin.rawan-banjir.index')->with('success', 'Data Rawan Banjir berhasil diperbarui');
  }

  public function destroy(RawanBanjir $rawanbanjir)
  {
    $rawanbanjir->delete();

    return redirect()->back()->with('success', 'Data Rawan Banjir berhasil dihapus.');
  }
}
