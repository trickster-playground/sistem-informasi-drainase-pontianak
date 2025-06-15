<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  /**
   * Run the migrations.
   */
  public function up(): void
  {
    Schema::table('reports', function (Blueprint $table) {
      // Jadikan user_id nullable
      $table->foreignId('user_id')->nullable()->change();

      // Tambah kolom nama & kontak pelapor
      $table->string('reporter_name')->nullable();
      $table->string('reporter_contact')->nullable();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('reports', function (Blueprint $table) {
      $table->dropColumn('reporter_name');
      $table->dropColumn('reporter_contact');

      // Jadikan user_id wajib lagi (hati-hati, ini bisa gagal jika ada null)
      $table->foreignId('user_id')->nullable(false)->change();
    });
  }
};
