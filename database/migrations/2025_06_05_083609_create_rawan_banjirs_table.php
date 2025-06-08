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
    Schema::create('rawan_banjirs', function (Blueprint $table) {
      $table->id();
      $table->string('name')->nullable();
      $table->foreignId('kecamatan_id')->nullable()->constrained()->onDelete('set null');
      $table->string('type')->nullable();
      $table->json('coordinates')->nullable();
      $table->double('radius')->nullable();
      $table->timestamps();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('rawan_banjirs');
  }
};
