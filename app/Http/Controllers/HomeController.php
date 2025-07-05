<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use App\Models\Kecamatan;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Cache;

class HomeController extends Controller
{
  public function index(Request $request)
  {
    $kecamatanFilter = $request->query('kecamatan');

    // Optimasi query Drainase
    $query = Drainase::with(['kecamatan:id,nama'])
      ->select('id', 'name', 'coordinates', 'fungsi', 'kecamatan_id', 'status', 'type');

    if ($kecamatanFilter) {
      $query->whereHas('kecamatan', function ($q) use ($kecamatanFilter) {
        $q->where('nama', $kecamatanFilter);
      });
    }

    $lines = $query->get()->map(function ($item) {
      return [
        'id' => $item->id,
        'name' => $item->name,
        'coordinates' => $item->coordinates,
        'fungsi' => $item->fungsi,
        'type' => $item->type,
        'status' => $item->status,
        'kecamatan' => $item->kecamatan->nama ?? null,
      ];
    });

    // Optimasi: Cache untuk batas wilayah jika data jarang berubah
    $batasKecamatan = Cache::remember('batas-kecamatan', 60 * 60, function () {
      return Kecamatan::select('nama', 'type', 'coordinates')->get()->map(function ($item) {
        return [
          'nama' => $item->nama,
          'type' => $item->type,
          'coordinates' => $item->coordinates,
        ];
      });
    });

    return Inertia::render('welcome', [
      'lines' => $lines,
      'selectedKecamatan' => $kecamatanFilter,
      'batasKecamatan' => $batasKecamatan,
    ]);
  }
}
