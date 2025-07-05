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
    Schema::create('report_details', function (Blueprint $table) {
      $table->id();
      $table->foreignId('report_id')->constrained('reports')->cascadeOnDelete();
      $table->foreignId('drainase_id')->constrained('drainase')->cascadeOnDelete();
      $table->enum('status', ['Pending', 'In Progress', 'Fixed', 'Aborted'])->default('Pending');
      $table->json('coordinates')->nullable();
      $table->json('attachments')->nullable();
      $table->timestamps();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('report_details');
  }
};
