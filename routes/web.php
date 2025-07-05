<?php

use App\Http\Controllers\AdminDrainaseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DrainaseController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\NotificationController;
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
Route::middleware(['auth'])->group(function () {

  // Drainase Routes
  Route::get('/admin/drainase', [AdminDrainaseController::class, 'index'])->name('admin.drainase.index');
  Route::get('/admin/drainase/create', [AdminDrainaseController::class, 'create'])->name('admin.drainase.create');
  Route::post('/admin/drainase/create', [AdminDrainaseController::class, 'store'])->name('admin.drainase.store');
  Route::get('/admin/drainase/{drainase}/edit', [AdminDrainaseController::class, 'show'])->name('admin.drainase.show');
  Route::put('/admin/drainase/{drainase}/edit', [AdminDrainaseController::class, 'update'])->name('admin.drainase.update');
  Route::delete('/admin/drainase/{drainase}', [AdminDrainaseController::class, 'destroy'])->name('admin.drainase.destroy');

  Route::get('/report/{report}/detail', [ReportController::class, 'detail'])->name('report.detail');
  Route::put('/report/{report}/detail', [ReportController::class, 'updateStatus'])->name('report.detail.update');
  Route::put('/report-details/{id}/update', [ReportController::class, 'updateReportDetails'])->name('report.details.update');
});

Route::get('/drainase/nearby', [DrainaseController::class, 'nearby']);
Route::post('/drainase/{id}/update-status', [DrainaseController::class, 'updateStatus']);


// User Auth Routes
Route::middleware(['auth'])->group(function () {
  Route::get('/report', [ReportController::class, 'index'])->name('report');
  Route::get('/report/create', [ReportController::class, 'create'])->name('report.create');
  Route::get('/report/{report}/edit', [ReportController::class, 'show'])->name('report.show');
  Route::put('/report/{report}/edit', [ReportController::class, 'update'])->name('report.update');
  Route::delete('/report/{report}', [ReportController::class, 'destroy'])->name('report.destroy');
});

Route::post('/report/create', [ReportController::class, 'store'])->name('report.store');

Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read.all');


require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
