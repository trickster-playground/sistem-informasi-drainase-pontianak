<?php

namespace App\Console\Commands;

use App\Models\Kecamatan;
use App\Models\Kelurahan;
use Illuminate\Console\Command;

class ImportKelurahanJson extends Command
{
  /**
   * The name and signature of the console command.
   *
   * @var string
   */
  protected $signature = 'app:import-kelurahan-json {path}';

  /**
   * The console command description.
   *
   * @var string
   */
  protected $description = 'Import GeoJSON file (FeatureCollection with geometry)';

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
      $kecamatan = Kecamatan::firstOrCreate(['nama' => $props['wadmkc']]);

      Kelurahan::create([
        'nama' => $props['namobj'] ?? null,
        'kecamatan_id' => $kecamatan->id,
        'type' => $geometry['type'] ?? null,
        'coordinates' => $geometry['coordinates'] ?? null,
        'properties' => $props, // jika kamu ingin menyimpan seluruh properti
      ]);

      $bar->advance();
    }

    $bar->finish();

    $this->newLine();
    $this->info("Import kelurahan selesai.");
  }
}
