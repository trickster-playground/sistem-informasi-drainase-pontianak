<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use App\Models\Kecamatan;
use App\Models\RawanBanjir;
use App\Models\Report;
use App\Models\User;
use App\Notifications\NewReportNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
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

    $user = Auth::user();

    if ($user->role !== 'Admin') {
      // Jika bukan admin, filter laporan berdasarkan user
      $reports = Report::with(['kecamatan', 'user'])
        ->where('user_id', $user->id)
        ->latest()
        ->paginate(10);
    } else {
      // Jika admin, ambil semua laporan
      $reports = Report::with(['kecamatan', 'user'])
        ->latest()
        ->paginate(10);
    }

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

    $isGuest = $request->user() === null;
    $user = $request->user();

    $validated = $request->validate([
      'name' => 'required|string|max:255',
      'description' => 'required|string|max:255',
      'location' => 'required|string|max:255',
      'category' => 'required|string|max:255',
      'kecamatan' => 'required|string|not_in:all,All,ALL',
      'type' => 'required|string|in:LineString,Polygon,Circle,Point',
      'coordinates' => 'required|array',
      'file' => 'required|file|mimes:jpg,jpeg,png|max:2048',

      // Validasi tambahan untuk guest
      'reporterName' => $isGuest ? 'required|string|max:255' : 'nullable',
      'reporterContact' => $isGuest ? 'required|string|max:255' : 'nullable',
    ]);

    $kecamatan = Kecamatan::where('nama', $validated['kecamatan'])->first();
    $path = $request->file('file')->store('reports', 'public');

    $report = Report::create([
      'user_id' => $user?->id,
      'title' => $validated['name'],
      'description' => $validated['description'],
      'location_name' => $validated['location'],
      'category' => $validated['category'],
      'kecamatan_id' => $kecamatan?->id,
      'type' => $validated['type'],
      'coordinates' => $validated['coordinates'],
      'attachments' => $path,
      'reporter_name' => $isGuest ? $validated['reporterName'] : null,
      'reporter_contact' => $isGuest ? $validated['reporterContact'] : null,
    ]);

    $user = $request->user();

    if (!$user || $user->role !== 'admin') {
      // Ambil semua admin
      $admins = User::where('role', 'admin')
        ->when($user, fn($query) => $query->where('id', '!=', $user->id))
        ->get();

      Notification::send($admins, new NewReportNotification($report));
    }

    if ($request->user()) {
      return redirect()->route('report')->with('success', 'Data Report berhasil ditambahkan.');
    } else {
      return redirect()->route('home')->with('success', 'Data Report berhasil dikirim.');
    }
  }



  public function show(Request $request, $id)
  {

    $report = Report::findOrFail($id);

    // Pastikan user yang menghapus adalah pemilik laporan
    if (Auth::user()->id !== $report->user_id) {
      return redirect()->back()->with('error', 'Anda tidak memiliki izin untuk melihat laporan ini.');
    }

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

  public function update(Request $request, $id)
  {

    $report = Report::findOrFail($id);

    // Pastikan user yang menghapus adalah pemilik laporan
    if (Auth::user()->id !== $report->user_id) {
      return redirect()->back()->with('error', 'Anda tidak memiliki izin untuk update laporan ini.');
    }

    $validated = $request->validate([
      'name' => 'required|string|max:255',
      'description' => 'required|string|max:255',
      'location' => 'required|string|max:255',
      'category' => 'required|string|max:255',
      'kecamatan' => 'nullable|string',
      'type' => 'required|string|in:LineString,Polygon,Circle,Point',
      'coordinates' => 'required|array',
      'file' => 'nullable|file|mimes:jpg,jpeg,png|max:2048', // opsional saat update
    ]);

    $kecamatan = Kecamatan::where('nama', $validated['kecamatan'])->first();

    // Jika ada file baru di-upload
    if ($request->hasFile('file')) {
      // Hapus file lama jika ada
      if ($report->attachments) {
        Storage::disk('public')->delete($report->attachments);
      }

      // Simpan file baru
      $path = $request->file('file')->store('reports', 'public');
      $report->attachments = $path;
    }

    // Update data lainnya
    $report->update([
      'title' => $validated['name'],
      'description' => $validated['description'],
      'location_name' => $validated['location'],
      'category' => $validated['category'],
      'kecamatan_id' => $kecamatan?->id,
      'type' => $validated['type'],
      'coordinates' => $validated['coordinates'],
      // 'attachments' sudah ditangani di atas jika ada file baru
    ]);

    return redirect()->route('report')->with('success', 'Data Report berhasil diperbarui.');
  }

  public function destroy(Report $report)
  {
    $user = Auth::user();

    // Jika user bukan admin dan bukan pemilik laporan
    if ($user->role !== 'Admin') {
      if ($report->user_id === null || $user->id !== $report->user_id) {
        return redirect()->back()->with('error', 'Anda tidak memiliki izin untuk menghapus laporan ini.');
      }
    }

    // Hapus file lampiran jika ada
    if ($report->attachments) {
      Storage::disk('public')->delete($report->attachments);
    }

    // Hapus laporan
    $report->delete();

    return redirect()->route('report')->with('success', 'Laporan berhasil dihapus.');
  }

  public function detail(Request $request, $id)
  {

    $report = Report::findOrFail($id);

    // Pastikan user yang menghapus adalah pemilik laporan
    if (Auth::user()->role !== 'Admin') {
      return redirect()->back()->with('error', 'Anda tidak memiliki izin untuk melihat laporan ini.');
    }

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
        'status' => $report->status,
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

    return Inertia::render('report/detail', [
      'lines' => $lines,
      'selectedKecamatan' => $kecamatanFilter,
      'kecamatanList' => $allKecamatan,
      'batasKecamatan' => $batasKecamatan,
      'point' => $point,
    ]);
  }

  public function updateStatus(Request $request, $id)
  {

    $report = Report::findOrFail($id);

    // Pastikan user yang menghapus adalah pemilik laporan
    if (Auth::user()->role !== 'Admin') {
      return redirect()->back()->with('error', 'Anda tidak memiliki izin untuk melihat laporan ini.');
    }

    $validated = $request->validate([
      'status' => 'required|string|in:Pending,In Progress,Fixed,Aborted',
    ]);

    // Update data lainnya
    $report->update([
      'status' => $validated['status'],
    ]);

    return redirect()->route('report')->with('success', 'Data Report berhasil diperbarui.');
  }
}
