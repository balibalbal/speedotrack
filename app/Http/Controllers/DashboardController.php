<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Geofence;
use App\Models\Vehicle;
use App\Models\Traccar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Yajra\DataTables\Facades\DataTables;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {        
        // $customer_id = auth()->user()->customer_id;

        // if ($customer_id == 1) {
            // $geofences = Geofence::where('customer_id', 3)->get();
        // } else {
            // $geofences = Geofence::where('customer_id', $customer_id)->get();
        // }
        // return view('pages.traccars.index')->with([
        //    'geofences' => $geofences
        // ]);

        return view('pages.dashboard.index');
    }

    public function getObjects()
    {
        $url = "https://www.speedotrack.pro/api/api.php?ver=1.0&api=mobile&key=767C31DD0734097600A75E0712FF7C5F&cmd=USER_GET_OBJECTS&page=1&rows=500";
        // $url = "https://www.speedotrack.in/api/api.php?ver=1.0&api=mobile&key=C78395C59621DD6A3CADA87A497A6014&cmd=USER_GET_OBJECTS&page=1&rows=500";

        $response = file_get_contents($url);

        return response($response)
            ->header('Content-Type', 'application/json')
            ->header('Access-Control-Allow-Origin', '*');
    }

   
    public function getNearestVehicles(Request $request)
    {
        // Ambil customer_id dari session user yang sedang login
        $customer_id = auth()->user()->customer_id;

        // Validasi jika vehicle_id dan geo_point ada dalam request
        $request->validate([
            'vehicle_id' => 'required|integer',
            'geo_point' => 'required|string',  // Contoh: WKB string
        ]);

        // Ambil data dari request
        $vehicle_id = $request->vehicle_id;
        $geo_point = $request->geo_point;

        // Tambahkan \x jika geo_point tidak dimulai dengan \x
        if (substr($geo_point, 0, 2) !== '\x') {
            $geo_point = '\x' . $geo_point;
        }
        
        // Query untuk mengambil 5 kendaraan terdekat dengan jarak maksimal 1 km (1000 meter)
        // if ($customer_id == 1) {
            $vehicles = DB::table('traccars')
            ->selectRaw('vehicle_id, no_pol, speed, status, 
                ST_Distance(geo_point, ST_SetSRID(ST_GeomFromWKB(?), 4326)) AS distance', 
                [$geo_point])
            ->where('customer_id', $customer_id)
            ->where('vehicle_id', '!=', $vehicle_id)  // Menghindari kendaraan yang sama
            ->whereRaw('ST_Distance(geo_point, ST_SetSRID(ST_GeomFromWKB(?), 4326)) <= 1000', 
                [$geo_point])
            ->orderBy('distance')
            ->limit(5)
            ->get();
        

        // Kembalikan response JSON dengan data kendaraan terdekat
        return response()->json([
            'status' => 'success',
            'vehicles' => $vehicles
        ]);
    }


    
  
    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $item = Traccar::findOrFail($id);

        return view('pages.traccars.view')->with([
            'item' => $item
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        $item = Traccar::findOrFail($id);

        return view('pages.traccars.edit')->with([
            'item' => $item
        ]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    
     public function update(Request $request, $id)
    {
       
    }


    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
    
}
