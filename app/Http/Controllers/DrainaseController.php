<?php

namespace App\Http\Controllers;

use App\Models\Drainase;
use Illuminate\Http\Request;

class DrainaseController extends Controller
{
  public function nearby(Request $request)
  {

    $request->validate([
      'lat' => 'required|numeric',
      'lng' => 'required|numeric',
      'radius' => 'nullable|numeric|min:0',
    ]);

    $userLat = $request->lat;
    $userLng = $request->lng;
    $radiusKm = $request->radius ?? 0;

    $drainase = Drainase::all()->filter(function ($item) use ($userLat, $userLng, $radiusKm) {
      $coords = $item->coordinates;

      if (!$coords || !is_array($coords) || count($coords) == 0) return false;

      $lat = $coords[0][1];
      $lng = $coords[0][0];

      // Haversine formula
      $distance = 6371 * acos(
        cos(deg2rad($userLat)) *
          cos(deg2rad($lat)) *
          cos(deg2rad($lng) - deg2rad($userLng)) +
          sin(deg2rad($userLat)) *
          sin(deg2rad($lat))
      );

      return $distance <= $radiusKm;
    });

    return response()->json($drainase->values());
  }
}
