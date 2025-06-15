<?php

namespace App\Providers;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
  /**
   * Register any application services.
   */
  public function register(): void
  {
    //
  }

  /**
   * Bootstrap any application services.
   */
  public function boot(): void
  {
    Inertia::share([
      'auth.user' => fn() => Auth::user()?->only('id', 'name', 'email', 'role'),
      'notifications' => function () {
        $user = Auth::user();
        if (!$user) return [];

        return $user->notifications()  // atau relasi notifikasi lainnya
          ->latest()
          ->take(5)
          ->get()
          ->map(fn($n) => [
            'id' => $n->id,
            'title' => $n->data['title'] ?? 'Notification',
            'body' => $n->data['created_by'] ?? '',
            'report_id' => $n->data['report_id'] ?? '',
            'read_at' => $n->read_at,
            'created_at' => $n->created_at->diffForHumans(),
          ]);
      },
      'hasUnreadNotifications' => fn() => Auth::check() && Auth::user()->unreadNotifications()->exists(),
    ]);
  }
}
