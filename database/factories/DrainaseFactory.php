<?php

namespace Database\Factories;

use App\Models\Drainase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Drainase>
 */
class DrainaseFactory extends Factory
{
  protected $model = Drainase::class;
  /**
   * Define the model's default state.
   *
   * @return array<string, mixed>
   */
  public function definition(): array
  {
    // Buat garis dengan 3 titik di Pontianak
    $latStart = -0.025 + $this->faker->randomFloat(5, 0, 0.01);
    $lngStart = 109.34 + $this->faker->randomFloat(5, 0, 0.01);

    $coordinates = [
      [$latStart, $lngStart],
      [$latStart + 0.001, $lngStart + 0.001],
      [$latStart + 0.002, $lngStart + 0.002],
    ];


    return [
      'nama_lokasi' => $this->faker->streetName(),
      'deskripsi' => $this->faker->paragraph(),
      'coordinates' => json_encode($coordinates),
      'panjang' => $this->faker->randomFloat(2, 50, 1000), // panjang dalam meter
      'kondisi' => $this->faker->randomElement(['baik', 'sedang', 'rusak']),
      'foto' => null,
    ];
  }
}
