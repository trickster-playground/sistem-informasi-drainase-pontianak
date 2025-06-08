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
    Schema::create('reports', function (Blueprint $table) {
      $table->id();
      $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

      // Informasi laporan
      $table->string('title');
      $table->text('description')->nullable();

      // Lokasi bisa berupa titik koordinat atau alamat
      $table->json('coordinates'); // misal: { "lat": ..., "lng": ... }
      $table->string('type')->nullable();
      $table->string('location_name')->nullable(); // Opsional, bisa isi nama jalan atau tempat

      $table->foreignId('kecamatan_id')->nullable()->constrained()->onDelete('set null');

      // Status laporan
      $table->enum('status', ['Pending', 'In Progress', 'Fixed', 'Aborted'])->default('Pending');

      // Opsional: lampiran gambar
      $table->json('attachments')->nullable(); // Bisa simpan array path file gambar

      // Kategori laporan
      $table->string('category')->nullable(); // contoh: "Drainase", "Penerangan", dsb

      $table->timestamps();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('reports');
  }
};
