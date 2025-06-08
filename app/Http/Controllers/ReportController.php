<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use App\Models\Kecamatan;
use App\Models\RawanBanjir;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ReportController extends Controller
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

    $rawanBanjir = RawanBanjir::all()->map(function ($item) {
      return [
        'id' => $item->id,
        'name' => $item->name,
        'coordinates' => $item->coordinates,
        'radius' => $item->radius,
        'kecamatan' => $item->kecamatan->name ?? null,
      ];
    });

    $user = Auth::user();

    $reports = Report::with(['kecamatan']) // jika ingin memuat relasi
      ->where('user_id', $user->id)
      ->latest()
      ->paginate(10); // atau jumlah lain sesuai kebutuhan


    return Inertia::render('report/index', [
      'lines' => $lines,
      'rawanBanjir' => $rawanBanjir,
      'selectedKecamatan' => $kecamatanFilter,
      'batasKecamatan' => $batasKecamatan,
      'reports' => $reports,
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

    return Inertia::render('report/create', [
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
      'description' => 'required|string|max:255',
      'location' => 'required|string|max:255',
      'category' => 'required|string|max:255',
      'kecamatan' => 'nullable|string',
      'type' => 'required|string|in:LineString,Polygon,Circle,Point',
      'coordinates' => 'required|array',
      'file' => 'required|file|mimes:jpg,jpeg,png|max:2048', // jika ada file
    ]);

    $kecamatan = Kecamatan::where('nama', $validated['kecamatan'])->first();

    // Simpan file ke storage dan dapatkan path-nya
    $path = $request->file('file')->store('reports', 'public'); // simpan di storage/app/public/reports

    $report = Report::create([
      'user_id' => $request->user()->id, // Asumsikan user sudah login
      'title' => $validated['name'],
      'description' => $validated['description'],
      'location_name' => $validated['location'],
      'category' => $validated['category'],
      'kecamatan_id' => $kecamatan?->id,
      'type' => $validated['type'],
      'coordinates' => $validated['coordinates'],
      'attachments' => $path,
    ]);

    return redirect()->route('report')->with('success', 'Data Report berhasil ditambahkan.');
  }

  public function show(Request $request, $id)
  {

    $report = Report::findOrFail($id);

    $point = [
      [
        'id' => $report->id,
        'name' => $report->title,
        'type' => $report->type,
        'description' => $report->description,
        'category' => $report->category,
        'location' => $report->location_name,
        'attachments' => $report->attachments ? Storage::url($report->attachments) : null,
        'kecamatan' => $report->kecamatan?->nama,
        'coordinates' => $report->coordinates,
      ]
    ];

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

    return Inertia::render('report/edit', [
      'lines' => $lines,
      'selectedKecamatan' => $kecamatanFilter,
      'kecamatanList' => $allKecamatan,
      'batasKecamatan' => $batasKecamatan,
      'point' => $point,
    ]);
  }

  public function destroy(Report $report)
  {
    // Pastikan user yang menghapus adalah pemilik laporan
    if (Auth::user()->id !== $report->user_id) {
      return redirect()->back()->with('error', 'Anda tidak memiliki izin untuk menghapus laporan ini.');
    }

    // Hapus file lampiran jika ada
    if ($report->attachments) {
      Storage::disk('public')->delete($report->attachments);
    }

    // Hapus laporan
    $report->delete();

    return redirect()->route('report')->with('success', 'Laporan berhasil dihapus.');
  }
}
