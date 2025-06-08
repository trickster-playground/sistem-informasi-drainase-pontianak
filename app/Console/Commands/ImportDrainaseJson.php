<?php

namespace App\Console\Commands;

use App\Models\Drainase;
use App\Models\Kecamatan;
use Illuminate\Console\Command;

class ImportDrainaseJson extends Command
{
  /**
   * The name and signature of the console command.
   *
   * @var string
   */
  protected $signature = 'app:import-drainase-json {path}';

  /**
   * The console command description.
   *
   * @var string
   */
  protected $description = 'Import JSON drainase';

  /**
   * Execute the console command.
   */
  public function handle()
  {
    $path = $this->argument('path');
    if (!file_exists($path)) {
      $this->error("File not found: $path");
      return;
    }

    $json = file_get_contents($path);
    $data = json_decode($json, true);

    foreach ($data['features'] as $feature) {
      $props = $feature['properties'];
      $coords = $feature['geometry']['coordinates'];
      $type = $feature['geometry']['type'];

      $kecamatan = Kecamatan::firstOrCreate(['nama' => $props['KECAMATAN']]);

      Drainase::create([
        'name' => $props['NAME'] ?? null,
        'fungsi' => $props['FUNGSI'] ?? null,
        'panjang' => $props['pnjg'] ?? null,
        'type' => $type ?? null,
        'kecamatan_id' => $kecamatan->id,
        'coordinates' => $coords,
        'properties' => $props,
      ]);
    }

    $this->info('Import selesai.');
  }
}
