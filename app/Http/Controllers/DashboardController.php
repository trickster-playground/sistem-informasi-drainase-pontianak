<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use App\Models\RawanBanjir;
use App\Models\Report;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
  public function index()
  {
    return Inertia::render('dashboard', [
      // Statistik
      'totalDrainase' => Drainase::count(),
      'totalRawanBanjir' => RawanBanjir::count(),
      'totalReports' => Report::count(),
      'handledReports' => Report::where('status', 'Fixed')->count(),

      // Grafik kategori & status laporan
      'reportByCategory' => Report::selectRaw('category, COUNT(*) as total')
        ->groupBy('category')
        ->get(),

      'reportByStatus' => Report::selectRaw('status, COUNT(*) as total')
        ->groupBy('status')
        ->get(),

      // Laporan terbaru
      'latestReports' => Report::with(['kecamatan', 'user'])
        ->latest()
        ->take(5)
        ->get(),

      // Data spasial (untuk peta)
      'drainase' => Drainase::all(['id', 'name', 'coordinates', 'fungsi']),
      'rawanBanjir' => RawanBanjir::all(['id', 'name', 'coordinates', 'radius']),
      'reportMarkers' => Report::all(['id', 'title', 'coordinates', 'status', 'category']),
    ]);
  }
}
