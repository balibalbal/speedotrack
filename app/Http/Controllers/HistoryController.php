<?php

namespace App\Http\Controllers;

use App\Models\History;
use Illuminate\Http\Request;
use Yajra\DataTables\Facades\DataTables;
use App\Http\Requests\HistoryRequest;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class HistoryController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $imei = $request->query('imei');

        return view('pages.histories.index', compact('imei'));


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
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
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
        //
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

    public function history()
    {
        return view('pages.histories.history');
    }

    public function getDataHistory()
    {
        $data = History::query()->orderBy('id', 'desc');

        return DataTables::of($data)->make(true);
    }

    

    

    public function getMapData(HistoryRequest $request) {
        //$customer_id = auth()->user()->customer_id;

        $data = $request->all();
    
        $start_date = $data['start_date'];
        $end_date = $data['end_date'];
        $no_pol = $data['no_pol'];
    
        // Membuat query dengan filter
        // $query = History::whereBetween('time', [$start_date, $end_date]);
    
        // if ($no_pol) {
        //     $query->where('no_pol', $no_pol);
        // }
    
        // $histories = $query->get(); var_dump($histories); exit;

        // $histories = History::join('vehicles', 'histories.vehicle_id', '=', 'vehicles.id')
        //     ->whereBetween('histories.time', [$start_date, $end_date])
        //     ->when($no_pol, function ($query) use ($no_pol) {
        //         $query->where('histories.no_pol', $no_pol);
        //     })
        //     ->select('histories.*', 'vehicles.vehicle_type') // Memilih field dari tabel histories dan vehicles
        //     ->get(); 

        $histories = History::join('vehicles', 'histories.vehicle_id', '=', 'vehicles.id')
                ->whereBetween('histories.time', [$start_date, $end_date])
                ->when($no_pol, function ($query) use ($no_pol) {
                    $query->where('histories.no_pol', $no_pol);
                })
                ->select('histories.time', 'histories.latitude', 'histories.longitude', 'histories.course', 'histories.status', 'vehicles.vehicle_type') // Memilih field dari tabel histories dan vehicles
                ->orderBy('histories.time', 'asc') // Mengurutkan berdasarkan time (ASC)
                ->get();
    
        // $geoItems = Geofence::where('customer_id', $customer_id)->get();
        $geofenceMapData = [];
    
        
    
        // Mengemas semua data ke dalam satu array asosiatif
        $data = [
            'data' => $histories,
            //'geofenceMapData' => $geofenceMapData,
            //'customerMapData' => $customerMapData
        ];
                
        return response()->json($data);
    }
    
    public function getRoute(Request $request)
    {
        $imei = $request->query('imei');

        if (!$imei) {
            return response()->json([
                'status' => false,
                'message' => 'IMEI tidak ditemukan'
            ], 400);
        }

        $startDate = Carbon::now()->startOfMonth()->format('Y-m-d 00:00:01');
        $endDate   = Carbon::now()->endOfMonth()->format('Y-m-d 23:59:59');
        dd($startDate); 
        $response = Http::timeout(20)->get(
            'https://www.speedotrack.pro/api/api.php',
            [
                'api' => 'user',
                'ver' => '1.0',
                // 'key' => env('SPEEDOTRACK_API_KEY'),
                'key' => '767C31DD0734097600A75E0712FF7C5F',
                'cmd' => "OBJECT_GET_ROUTE,$imei,$startDate,$endDate,1"
            ]
        );

        dd([
            'status' => $response->status(),
            'headers' => $response->headers(),
            'body' => $response->body(),
        ]);


        // 🔥 CEK APAKAH RESPONSE VALID
        if (!$response->ok()) {
            return response()->json([
                'status' => false,
                'message' => 'API Speedotrack error',
                'http_code' => $response->status(),
                'body' => $response->body()
            ], 500);
        }

        $json = $response->json();

        if (!$json) {
            return response()->json([
                'status' => false,
                'message' => 'Response API kosong / bukan JSON',
                'raw' => $response->body()
            ], 500);
        }

        return response()->json($json);
    }

}

