<?php

namespace Database\Seeders;

use App\Models\Drainase;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
    // User::factory(10)->create();

    User::factory()->create([
        'name' => 'Andi Muhammad',
        'email' => 'andi@example.com',
        'role' => 'Admin',
    ]);

    // Drainase::factory()->count(10)->create();

    
  }
}
