<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
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
      'totalReports' => Report::count(),
      'handledReports' => Report::where('status', 'Fixed')->count(),
      'totalDrainaseBermasalah' => Drainase::where('status', 'Terdapat Masalah')->count(),

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
      'reportMarkers' => Report::with('kecamatan:id,nama')
        ->where('status', '!=', 'Fixed')
        ->get()
        ->map(function ($report) {
          return [
            'id' => $report->id,
            'title' => $report->title,
            'coordinates' => $report->coordinates,
            'status' => $report->status,
            'category' => $report->category,
            'location_name' => $report->location_name,
            'kecamatan' => $report->kecamatan?->nama ?? null,
          ];
        }),

    ]);
  }
}
