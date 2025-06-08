<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use App\Models\Kecamatan;
use App\Models\RawanBanjir;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HomeController extends Controller
{
  public function index(Request $request)
  {
    $kecamatanFilter = $request->query('kecamatan');

    $query = Drainase::with('kecamatan');

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
        'kecamatan' => $item->kecamatan->nama ?? null,
      ];
    });

    // Ambil semua batas wilayah dari DB
    $batasKecamatan = Kecamatan::all()->map(function ($item) {
      return [
        'nama' => $item->nama,
        'type' => $item->type,
        'coordinates' => $item->coordinates,
      ];
    });


    $queryBanjir = RawanBanjir::with('kecamatan');

    if ($kecamatanFilter) {
      $queryBanjir->whereHas('kecamatan', function ($q) use ($kecamatanFilter) {
        $q->where('nama', $kecamatanFilter);
      });
    }

    $rawanBanjir = $queryBanjir->get()->map(function ($item) {
      return [
        'id' => $item->id,
        'name' => $item->name,
        'coordinates' => $item->coordinates,
        'radius' => $item->radius,
        'kecamatan' => $item->kecamatan->nama ?? null, // jika relasi
      ];
    });

    return Inertia::render('welcome', [
      'lines' => $lines,
      'rawanBanjir' => $rawanBanjir,
      'selectedKecamatan' => $kecamatanFilter,
      'batasKecamatan' => $batasKecamatan,
    ]);
  }
}
