<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use App\Models\Kecamatan;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminDrainaseController extends Controller
{
  public function index(Request $request)
  {
    $query = Drainase::with('kecamatan')->orderByDesc('created_at');

    // Pencarian berdasarkan keyword
    if ($request->has('search') && $request->search !== null) {
      $keyword = $request->search;

      $query->where(function ($q) use ($keyword) {
        $q->where('name', 'like', "%$keyword%")
          ->orWhere('fungsi', 'like', "%$keyword%");
      });
    }

    // Filter berdasarkan kecamatan
    if ($request->has('kecamatan_id') && $request->kecamatan_id !== null) {
      $query->where('kecamatan_id', $request->kecamatan_id);
    }

    $drainase = $query->paginate(10)->withQueryString();

    // Statistik total fungsi
    $totalFungsi = Drainase::selectRaw('fungsi, COUNT(*) as total')
      ->whereIn('fungsi', ['Primer', 'Sekunder', 'Tersier'])
      ->groupBy('fungsi')
      ->pluck('total', 'fungsi');

    // Total keseluruhan drainase
    $totalDrainase = Drainase::count();

    // Kecamatan dengan jumlah drainase terbanyak
    $drainasePerKecamatan = Drainase::selectRaw('kecamatan_id, COUNT(*) as total')
      ->groupBy('kecamatan_id')
      ->orderByDesc('total')
      ->with('kecamatan:id,nama') // Eager load nama kecamatan
      ->get()
      ->map(function ($item) {
        return [
          'id' => $item->kecamatan_id,
          'nama' => $item->kecamatan->nama ?? 'Tidak diketahui',
          'total' => $item->total,
        ];
      });

    // Map
    $queryLines = Drainase::with('kecamatan');

    $lines = $queryLines->get()->map(function ($item) {
      return [
        'id' => $item->id,
        'name' => $item->name,
        'type' => $item->type,
        'coordinates' => $item->coordinates,
        'fungsi' => $item->fungsi,
        'kecamatan' => $item->kecamatan->nama ?? null,
      ];
    });

    return Inertia::render('admin/drainase/index', [
      'lines' => $lines,
      'drainase' => $drainase,
      'filters' => $request->only(['search', 'kecamatan_id']),
      'kecamatanOptions' => Kecamatan::select('id', 'nama')->get(),
      'statistik' => [
        'total' => $totalDrainase,
        'fungsi' => [
          'primer' => $totalFungsi->get('Primer', 0),
          'sekunder' => $totalFungsi->get('Sekunder', 0),
          'tersier' => $totalFungsi->get('Tersier', 0),
        ],
        'drainasePerKecamatan' => $drainasePerKecamatan,
      ],
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

    return Inertia::render('admin/drainase/create', [
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
      'fungsi' => 'nullable|string',
      'kecamatan' => 'nullable|string',
      'type' => 'required|string|in:LineString,Polygon',
      'coordinates' => 'required|array',
      'coordinates.type' => 'required|string|in:LineString,Polygon',
      'coordinates.coordinates' => 'required|array',
    ]);


    $kecamatan = Kecamatan::where('nama', $validated['kecamatan'])->first();

    $drainase = Drainase::create([
      'name' => $validated['name'],
      'fungsi' => $validated['fungsi'],
      'kecamatan_id' => $kecamatan?->id,
      'type' => $validated['type'],
      'coordinates' => $validated['coordinates']['coordinates'], // ini akan tersimpan dalam kolom JSON
      'properties' => [
        $validated['name'] => [
          'fungsi' => $validated['fungsi'],
          'type' => $validated['type'],
          'kecamatan' => $kecamatan?->nama,
          'coordinates' => $validated['coordinates'],
        ],
      ],
    ]);

    return redirect('/admin/drainase')->with('success', 'Drainase berhasil ditambahkan.');
  }

  public function show($id)
  {
    $drainase = Drainase::findOrFail($id);

    $lines = [
      [
        'id' => $drainase->id,
        'name' => $drainase->name,
        'type' => $drainase->type,
        'fungsi' => $drainase->fungsi,
        'kecamatan' => $drainase->kecamatan?->nama,
        'coordinates' => $drainase->coordinates,
      ]
    ];

    $kecamatanList = Kecamatan::select('id', 'nama')->get();

    return inertia('admin/drainase/edit', [
      'lines' => $lines,
      'selectedKecamatan' => $drainase->kecamatan?->nama ?? 'all',
      'kecamatanList' => $kecamatanList,
    ]);
  }

  public function update(Request $request, $id)
  {
    $request->validate([
      'name' => 'required|string|max:255',
      'fungsi' => 'nullable|string',
      'kecamatan' => 'required|string',
      'coordinates' => 'required|array',
    ]);

    $drainase = Drainase::findOrFail($id);
    $drainase->name = $request->name;
    $drainase->fungsi = $request->fungsi;

    // jika menggunakan relasi ke tabel kecamatan:
    $kecamatan = Kecamatan::where('nama', $request->kecamatan)->first();
    if ($kecamatan) {
      $drainase->kecamatan_id = $kecamatan->id;
    }

    $drainase->coordinates = $request->coordinates['coordinates']; // atau GeoJSON jika formatnya demikian

    $drainase->save();

    return redirect()->route('admin.drainase.index')->with('success', 'Data drainase berhasil diperbarui');
  }


  public function destroy(Drainase $drainase)
  {
    $drainase->delete();

    return redirect()->back()->with('success', 'Data drainase berhasil dihapus.');
  }
}
