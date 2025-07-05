<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportDetail extends Model
{
  protected $fillable = [
    "report_id",
    "drainase_id",
    "coordinates",
    "attachments",
  ];

  // Di model Report.php
  protected $casts = [
    'attachments' => 'array',
    'coordinates' => 'array',
  ];
}
