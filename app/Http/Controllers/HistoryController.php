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

        // ⏱ WIB
        $startWib = $request->start
            ? Carbon::parse($request->start, 'Asia/Jakarta')->startOfDay()
            : Carbon::now('Asia/Jakarta')->startOfDay();

        $endWib = $request->end
            ? Carbon::parse($request->end, 'Asia/Jakarta')->endOfDay()
            : Carbon::now('Asia/Jakarta')->endOfDay();

        // 🔄 KONVERSI KE UTC (INI KUNCI)
        $startUtc = $startWib->clone()->setTimezone('UTC')->format('Y-m-d H:i:s');
        $endUtc   = $endWib->clone()->setTimezone('UTC')->format('Y-m-d H:i:s');

        $response = Http::timeout(20)->get(
            env('SPEEDOTRACK_API_URL'),
            [
                'api' => 'user',
                'ver' => '1.0',
                'key' => env('SPEEDOTRACK_API_KEY'),
                'cmd' => "OBJECT_GET_ROUTE,$imei,$startUtc,$endUtc,1"
            ]
        );

        return response()->json($response->json());
    }



}

