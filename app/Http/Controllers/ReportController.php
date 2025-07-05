<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use App\Models\Kecamatan;
use App\Models\RawanBanjir;
use App\Models\Report;
use App\Models\ReportDetail;
use App\Models\User;
use App\Notifications\NewReportNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
        'status' => $item->status,
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

    $user = Auth::user();

    if ($user->role !== 'Admin') {
      // Jika bukan admin, filter laporan berdasarkan user
      $reports = Report::with(['kecamatan', 'user'])
        ->where('user_id', null)
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
      'location' => 'nullable|string|max:255',
      'category' => 'nullable|string|max:255',
      'kecamatan' => 'required|string|not_in:all,All,ALL',
      'type' => 'required|string|in:LineString,Polygon,Circle,Point',
      'coordinates' => 'required|array',
      'file' => 'required|file|mimes:jpg,jpeg,png|max:2048',

      // Validasi tambahan untuk guest
      'reporterName' => $isGuest ? 'required|string|max:255' : 'nullable',
      'reporterContact' => $isGuest ? 'required|string|max:255' : 'nullable',

      // Validasi ID Drainase
      'drainase_id' => 'array',
      'drainase_id.*' => 'integer|exists:drainase,id',
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

    if (!empty($validated['drainase_id'])) {
      $drainaseIds = is_array($validated['drainase_id'])
        ? $validated['drainase_id']
        : [$validated['drainase_id']];

      $report->drainase()->attach($drainaseIds);

      Drainase::whereIn('id', $drainaseIds)
        ->update(['status' => 'Terdapat Masalah']);
    }


    $user = $request->user();

    if (!$user || $user->role !== 'admin') {
      // Ambil semua admin
      $admins = User::where('role', 'admin')
        ->when($user, fn($query) => $query->where('id', '!=', $user->id))
        ->get();

      Notification::send($admins, new NewReportNotification($report));
    }

    if ($request->user()) {
      return Inertia::location(route('report'));
    } else {
      return Inertia::location(route('home'));
    }
  }



  public function show(Request $request, $id)
  {

    $report = Report::findOrFail($id);

    $report->load('drainase', 'kecamatan');

    $selectedDrainaseIds = $report->drainase->pluck('id')->toArray();

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
      'selectedDrainaseIds' => $selectedDrainaseIds,
    ]);
  }

  public function update(Request $request, $id)
  {
    $report = Report::findOrFail($id);

    $validated = $request->validate([
      'name' => 'required|string|max:255',
      'description' => 'required|string|max:255',
      'location' => 'string|max:255',
      'category' => 'string|max:255',
      'kecamatan' => 'nullable|string',
      'type' => 'required|string|in:LineString,Polygon,Circle,Point',
      'coordinates' => 'required|array',
      'file' => 'nullable|file|mimes:jpg,jpeg,png|max:2048',
      'selectedDrainaseIds' => 'nullable|array',
      'selectedDrainaseIds.*' => 'integer|exists:drainase,id',
    ]);

    $kecamatan = Kecamatan::where('nama', $validated['kecamatan'])->first();

    if ($request->hasFile('file')) {
      if ($report->attachments) {
        Storage::disk('public')->delete($report->attachments);
      }
      $path = $request->file('file')->store('reports', 'public');
      $report->attachments = $path;
    }

    $report->update([
      'title' => $validated['name'],
      'description' => $validated['description'],
      'location_name' => $validated['location'],
      'category' => $validated['category'],
      'kecamatan_id' => $kecamatan?->id,
      'type' => $validated['type'],
      'coordinates' => $validated['coordinates'],
    ]);

    if (array_key_exists('selectedDrainaseIds', $validated)) {
      $newIds = $validated['selectedDrainaseIds'] ?? [];
      $currentIds = $report->drainase()->pluck('drainase.id')->toArray();

      // Cari ID drainase yang dihapus
      $removedIds = array_diff($currentIds, $newIds);
      if (!empty($removedIds)) {
        Drainase::whereIn('id', $removedIds)->update(['status' => 'Baik']);
      }

      // Set status drainase yang baru dipilih
      $addedIds = array_diff($newIds, $currentIds);
      if (!empty($addedIds)) {
        Drainase::whereIn('id', $addedIds)->update(['status' => 'Terdapat Masalah']);
      }

      // Sync ke tabel pivot
      sort($newIds);
      sort($currentIds);
      if ($newIds !== $currentIds) {
        $report->drainase()->sync($newIds);
      }
    }


    return redirect()->route('report')->with('success', 'Data Report berhasil diperbarui.');
  }


  public function destroy(Report $report)
  {
    $user = Auth::user();

    if ($user->role !== 'Admin') {
      if ($report->user_id === null || $user->id !== $report->user_id) {
        return redirect()->back()->with('error', 'Anda tidak memiliki izin untuk menghapus laporan ini.');
      }
    }

    // Ambil ID drainase yang terkait
    $drainaseIds = $report->drainase()->pluck('drainase.id')->toArray();

    // Hapus file jika ada
    if ($report->attachments) {
      Storage::disk('public')->delete($report->attachments);
    }

    // Hapus relasi pivot (optional, tergantung migrasi onDelete cascade atau tidak)
    $report->drainase()->detach();

    // Update status drainase menjadi 'Baik'
    if (!empty($drainaseIds)) {
      Drainase::whereIn('id', $drainaseIds)
        ->whereDoesntHave('reports') // hanya jika tidak lagi terhubung ke laporan lain
        ->update(['status' => 'Baik']);
    }

    // Hapus laporan
    $report->delete();

    return redirect()->route('report')->with('success', 'Laporan berhasil dihapus.');
  }


  public function detail(Request $request, $id)
  {
    // Pastikan user yang menghapus adalah pemilik laporan

    $report = Report::findOrFail($id);

    $selectedDrainaseIds = $report->drainase->pluck('id')->toArray();

    $point = [
      [
        'id' => $report->id,
        'name' => $report->title,
        'reporter_name' => $report->reporter_name,
        'reporter_contact' => $report->reporter_contact,
        'type' => $report->type,
        'description' => $report->description,
        'category' => $report->category,
        'location' => $report->location_name,
        'attachments' => $report->attachments ? Storage::url($report->attachments) : null,
        'kecamatan' => $report->kecamatan?->nama,
        'status' => $report->status,
        'coordinates' => $report->coordinates,
        'report_details' => $report->drainase
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
      'selectedDrainaseIds' => $selectedDrainaseIds,
      'reports' => $report,
    ]);
  }

  public function updateStatus(Request $request, $id)
  {

    $report = Report::findOrFail($id);

    $validated = $request->validate([
      'status' => 'required|string|in:Pending,In Progress,Fixed,Aborted',
    ]);

    // Update data lainnya
    $report->update([
      'status' => $validated['status'],
    ]);

    return redirect()->route('report')->with('success', 'Data Report berhasil diperbarui.');
  }

  public function updateReportDetails(Request $request, $id)
  {
    $validated = $request->validate([
      'coordinates' => 'required|array',
      'coordinates.*' => 'numeric',
      'file' => 'required|image|max:2048',
    ]);

    DB::beginTransaction();

    try {
      // 1️⃣ Ambil detail yang dipilih
      $reportDetail = ReportDetail::findOrFail($id);
      $drainaseId = $reportDetail->drainase_id;

      // 2️⃣ Simpan file attachment kalau ada
      $attachmentPath = null;
      if ($request->hasFile('file')) {
        $attachmentPath = $request->file('file')->store('attachments/report_details', 'public');
      }

      // 3️⃣ Ambil SEMUA ReportDetail untuk drainase ini yg status = Pending
      $pendingDetails = ReportDetail::where('drainase_id', $drainaseId)
        ->where('status', 'Pending')
        ->get();

      foreach ($pendingDetails as $detail) {
        $detail->status = 'Fixed';

        if ($request->has('coordinates')) {
          $detail->coordinates = $validated['coordinates'];
        }

        if ($attachmentPath) {
          // Gantikan attachment
          $detail->attachments = $attachmentPath;
        }

        $detail->save();
      }

      // 4️⃣ Update Drainase → Baik
      Drainase::where('id', $drainaseId)
        ->update(['status' => 'Baik']);

      // 5️⃣ Ambil SEMUA report yang punya detail dengan drainase ini
      $reportIds = ReportDetail::where('drainase_id', $drainaseId)
        ->pluck('report_id')
        ->unique()
        ->toArray();

      // 6️⃣ Periksa setiap report
      foreach ($reportIds as $reportId) {
        $totalDetails = ReportDetail::where('report_id', $reportId)->count();
        $fixedDetails = ReportDetail::where('report_id', $reportId)
          ->where('status', 'Fixed')
          ->count();

        $newStatus = ($totalDetails === $fixedDetails) ? 'Fixed' : 'In Progress';

        Report::where('id', $reportId)
          ->update(['status' => $newStatus]);
      }

      DB::commit();

      return redirect()->route('report')->with('success', 'Data Report berhasil diperbarui.');
    } catch (\Exception $e) {
      DB::rollBack();
      return redirect()->back()->with('error', 'Terjadi kesalahan: ' . $e->getMessage());
    }
  }
}
