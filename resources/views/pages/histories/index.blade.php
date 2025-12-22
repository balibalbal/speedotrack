@push('style')
  {{-- <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" /> --}}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
  <link rel="stylesheet" href="{{ asset('backend/assets/css/histories.css') }}">
@endpush

@extends('layouts.admin')
@section('title', 'History Perjalanan')
@section('content')
    <div class="container-fluid">
        <div class="col-md-12">
            <div class="history-layout">

                {{-- MAP --}}
                <div class="history-map">
                    <div id="map"></div>
                </div>

                {{-- RIGHT PANEL --}}
                <div class="history-side">
                    {{-- TOOLBAR --}}
                    <div class="side-box">
                        <input type="date" id="startDate" class="form-control form-control-sm mb-1">
                        <input type="date" id="endDate" class="form-control form-control-sm mb-2">

                        <button id="showBtn" class="btn btn-sm btn-primary w-100 mb-1" onclick="reloadRoute()"><span class="mdi mdi-map-marker-path"></span>  Tracking Now</button>

                        <div class="d-flex gap-1 mb-2">
                            <button id="playBtn" class="btn btn-sm btn-success flex-fill" onclick="playRoute()"><span class="mdi mdi-play-circle"></span></button>
                            <button id="pauseBtn" class="btn btn-sm btn-warning flex-fill" onclick="pauseRoute()"><span class="mdi mdi-pause-circle"></span></button>
                            <button id="goStartBtn" class="btn btn-sm btn-secondary" onclick="goStart()"><span class="mdi mdi-skip-backward"></span></button>
                            <button id="goEndBtn" class="btn btn-sm btn-secondary" onclick="goEnd()"><span class="mdi mdi-skip-forward"></span></button>
                        </div>

                        <input
                                type="range"
                                id="progressBar"
                                min="0"
                                value="0"
                                step="1"
                                class="form-range"
                                style="width:100%"
                            >

                        <button id="followBtn" class="btn btn-sm btn-secondary w-100 mb-2"
                            onclick="toggleFollow()"><span class="mdi mdi-transit-connection-variant"></span>  Follow ON</button>

                        <div class="d-flex align-items-center gap-2">
                            <span class="small">Speed</span>
                            <input type="range"
                                id="speedRange"
                                class="form-range"
                                min="1"
                                max="5"
                                step="1"
                                value="3"
                                oninput="setSpeedLevel(this.value)">

                            <span id="speedLabel" class="badge bg-primary">1x</span>
                        </div>
                    </div>

                    
                    {{-- INFO --}}
                    <div id="infoPanel" class="side-box small"></div>
                </div>

            </div>
        </div>
        <div class="col-md-12">
        {{-- SPEED CHART --}}
            <div class="speed-chart-wrapper">
                <canvas id="speedChart" height="40"></canvas>
            </div>
        </div>
    </div>

    @if($imei)
    <script>
        const IMEI = "{{ $imei }}";
    </script>
    @endif
@endsection

@push('scripts')

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://maps.googleapis.com/maps/api/js?key={{ config('services.google_map.api_key') }}"></script>
<script src="https://unpkg.com/leaflet.gridlayer.googlemutant/dist/Leaflet.GoogleMutant.js"></script>

<script src="https://rawcdn.githack.com/bbecquet/Leaflet.RotatedMarker/master/leaflet.rotatedMarker.js"></script>

<!-- 5️⃣ App JS kamu -->
<script src="{{ asset('backend/assets/js/speedotrack/histories.js') }}"></script>

<!-- 6️⃣ Chart -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

@endpush

