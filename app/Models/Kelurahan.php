<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kelurahan extends Model
{
  protected $fillable = [
    'nama',
    'kecamatan_id',
    'type',
    'coordinates',
    'properties',
  ];

  protected $casts = [
    'coordinates' => 'array',
    'properties' => 'array',
  ];

  public function kecamatan()
  {
    return $this->belongsTo(Kecamatan::class);
  }
}
