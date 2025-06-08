<?php

namespace App\Console\Commands;

use App\Models\Kecamatan;
use Illuminate\Console\Command;

class ImportKecamatanJson extends Command
{
  /**
   * The name and signature of the console command.
   *
   * @var string
   */
  protected $signature = 'app:import-kecamatan-json {path}';

  /**
   * The console command description.
   *
   * @var string
   */
  protected $description = 'Import batas kecamatan data from a JSON file';

  /**
   * Execute the console command.
   */
  public function handle()
  {
    $path = $this->argument('path');

    if (!file_exists($path)) {
      $this->error("File tidak ditemukan: $path");
      return;
    }

    $json = file_get_contents($path);
    $data = json_decode($json, true);

    if (!isset($data['features'])) {
      $this->error("Format file tidak valid. Harus berupa GeoJSON dengan key 'features'.");
      return;
    }

    $bar = $this->output->createProgressBar(count($data['features']));
    $bar->start();

    foreach ($data['features'] as $feature) {
      $props = $feature['properties'] ?? [];
      $geometry = $feature['geometry'] ?? [];

      // Ambil nama kecamatan dari field 'wadmkc'
      $wadmkc = $props['wadmkc'] ?? null;

      if (!$wadmkc) {
        $bar->advance();
        continue; // Skip jika tidak ada nama kecamatan
      }

      $kecamatan = Kecamatan::where('nama', $wadmkc)->first();

      if ($kecamatan) {
        $kecamatan->type = $geometry['type'] ?? null;
        $kecamatan->coordinates = $geometry['coordinates'] ?? null;
        $kecamatan->save();
      } else {
        // Kalau tidak ditemukan, bisa dilewati atau log
        $this->warn("Kecamatan '$wadmkc' tidak ditemukan.");
      }

      $bar->advance();
    }

    $bar->finish();
    $this->newLine();
    $this->info("Update kecamatan selesai.");
  }
}
