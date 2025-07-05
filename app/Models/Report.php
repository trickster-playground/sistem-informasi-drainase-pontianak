<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
  protected $fillable = [
    "title",
    "description",
    "user_id",
    "kecamatan_id",
    "coordinates",
    "location_name",
    "category",
    "status",
    "type",
    "drainase_id",
    "reporter_name",
    "reporter_contact",
    "attachments",
  ];

  // Di model Report.php
  protected $casts = [
    'attachments' => 'array',
    'coordinates' => 'array',
  ];


  public function user()
  {
    return $this->belongsTo(User::class);
  }

  public function kecamatan()
  {
    return $this->belongsTo(Kecamatan::class, 'kecamatan_id');
  }

  public function drainase()
  {
    return $this->belongsToMany(Drainase::class, 'report_details')
      ->withPivot([
        'id',           // << ini penting!
        'status',
        'coordinates',
        'attachments'
      ]);
  }
}
