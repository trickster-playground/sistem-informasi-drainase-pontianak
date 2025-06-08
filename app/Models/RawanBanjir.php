<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RawanBanjir extends Model
{
  use HasFactory;

  protected $table = 'rawan_banjirs';

  protected $fillable = [
    "name",
    "fungsi",
    "panjang",
    "type",
    "kecamatan_id",
    "coordinates",
    "radius"
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
