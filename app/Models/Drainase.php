<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Drainase extends Model
{
  use HasFactory;

  protected $table = 'drainase';

  protected $fillable = [
    "name",
    "fungsi",
    "status",
    "panjang",
    "type",
    "kecamatan_id",
    "coordinates",
    "properties"
  ];

  protected $casts = [
    'coordinates' => 'array',
    'panjang' => 'float',
    'properties' => 'array',
  ];

  public function kecamatan()
  {
    return $this->belongsTo(Kecamatan::class);
  }

  public function reports()
  {
    return $this->belongsToMany(Report::class, 'report_details');
  }
}
