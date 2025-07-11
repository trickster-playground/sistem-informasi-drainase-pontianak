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
    Schema::create('drainase', function (Blueprint $table) {
      $table->id();
      $table->string('name')->nullable();
      $table->string('fungsi')->nullable();
      $table->decimal('panjang', 10, 2)->nullable();
      $table->foreignId('kecamatan_id')->nullable()->constrained()->onDelete('set null');
      $table->string('type')->nullable();
      $table->enum('status', ['Baik', 'Terdapat Masalah'])->default('Baik');
      $table->json('coordinates')->nullable();
      $table->json('properties')->nullable();
      $table->timestamps();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('drainases');
  }
};
