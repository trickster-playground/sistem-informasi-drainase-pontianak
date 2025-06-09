<?php

use App\Http\Controllers\AdminDrainaseController;
use App\Http\Controllers\AdminRawanBanjirController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ReportController;
use App\Http\Middleware\AdminMiddleware;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Landing Page
Route::get('/', [HomeController::class, 'index'])->name('home');


Route::middleware(['auth', 'verified'])->group(function () {
  Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
});


// Admin Middleware
Route::middleware([AdminMiddleware::class])->group(function () {

  // Drainase Routes
  Route::get('/admin/drainase', [AdminDrainaseController::class, 'index'])->name('admin.drainase.index');
  Route::get('/admin/drainase/create', [AdminDrainaseController::class, 'create'])->name('admin.drainase.create');
  Route::post('/admin/drainase/create', [AdminDrainaseController::class, 'store'])->name('admin.drainase.store');
  Route::get('/admin/drainase/{drainase}/edit', [AdminDrainaseController::class, 'show'])->name('admin.drainase.show');
  Route::put('/admin/drainase/{drainase}/edit', [AdminDrainaseController::class, 'update'])->name('admin.drainase.update');
  Route::delete('/admin/drainase/{drainase}', [AdminDrainaseController::class, 'destroy'])->name('admin.drainase.destroy');

  // Rawan Banjir Routes
  Route::get('/admin/rawan-banjir', [AdminRawanBanjirController::class, 'index'])->name('admin.rawan-banjir.index');
  Route::get('/admin/rawan-banjir/create', [AdminRawanBanjirController::class, 'create'])->name('admin.rawan-banjir.create');
  Route::post('/admin/rawan-banjir/create', [AdminRawanBanjirController::class, 'store'])->name('admin.rawan-banjir.store');
  Route::get('/admin/rawan-banjir/{rawanbanjir}/edit', [AdminRawanBanjirController::class, 'show'])->name('admin.rawan-banjir.show');
  Route::put('/admin/rawan-banjir/{rawanbanjir}/edit', [AdminRawanBanjirController::class, 'update'])->name('admin.rawan-banjir.update');
  Route::delete('/admin/rawan-banjir/{rawanbanjir}', [AdminRawanBanjirController::class, 'destroy'])->name('admin.rawan-banjir.destroy');
});

// User Auth Routes
Route::middleware(['auth'])->group(function () {
  Route::get('/report', [ReportController::class, 'index'])->name('report');
  Route::get('/report/create', [ReportController::class, 'create'])->name('report.create');
  Route::post('/report/create', [ReportController::class, 'store'])->name('report.store');
  Route::get('/report/{report}/edit', [ReportController::class, 'show'])->name('report.show');
  Route::put('/report/{report}/edit', [ReportController::class, 'update'])->name('report.update');
  Route::delete('/report/{report}', [ReportController::class, 'destroy'])->name('report.destroy');
});


require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
