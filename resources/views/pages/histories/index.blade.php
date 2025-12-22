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

                        <button class="btn btn-sm btn-primary w-100 mb-1" onclick="reloadRoute()">Tampilkan</button>

                        <div class="d-flex gap-1 mb-2">
                            <button class="btn btn-sm btn-success flex-fill" onclick="playRoute()">▶</button>
                            <button class="btn btn-sm btn-warning flex-fill" onclick="pauseRoute()">⏸</button>
                        </div>

                        <button id="followBtn" class="btn btn-sm btn-secondary w-100 mb-2"
                            onclick="toggleFollow()">📍 Follow ON</button>

                        <label class="small">Speed</label>
                        <input type="range" min="100" max="1500" step="100" value="500"
                            oninput="setSpeed(this.value)">
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
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/leaflet-rotatedmarker/leaflet.rotatedMarker.js"></script>
<script src="{{ asset('backend/assets/js/speedotrack/histories.js') }}"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

@endpush
