<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kecamatan extends Model
{
  protected $fillable = ['nama', 'type', 'coordinates'];

  protected $casts = [
    'coordinates' => 'array',
  ];


  public function drainases()
  {
    return $this->hasMany(Drainase::class);
  }

  public function kelurahans()
  {
    return $this->hasMany(Kelurahan::class);
  }

  public function reports()
  {
    return $this->hasMany(Report::class);
  }
}
