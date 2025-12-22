@push('style')
  {{-- <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" /> --}}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
  <link rel="stylesheet" href="{{ asset('backend/assets/css/histories.css') }}">
@endpush

@extends('layouts.admin')
@section('title', 'History Perjalanan')
@section('content')
    <div class="container-fluid">
        <div class="card shadow mb-3">
            <div class="card-body">

                {{-- Toolbar --}}
                <div class="d-flex gap-2 mb-2 align-items-center flex-wrap">
                    <input type="date" id="startDate" class="form-control form-control-sm" style="max-width:160px">
                    <input type="date" id="endDate" class="form-control form-control-sm" style="max-width:160px">

                    <button class="btn btn-sm btn-primary" onclick="reloadRoute()">Tampilkan</button>

                    <button class="btn btn-sm btn-success" onclick="playRoute()">▶ Play</button>
                    <button class="btn btn-sm btn-warning" onclick="pauseRoute()">⏸ Pause</button>

                    <button id="followBtn" class="btn btn-sm btn-secondary" onclick="toggleFollow()">📍 Follow ON</button>

                    <input type="range" min="100" max="1500" step="100" value="500"
                        oninput="setSpeed(this.value)">
                </div>

                <div id="infoPanel" class="p-2 mb-2 bg-light rounded small shadow-sm"></div>
                <div class="card shadow-sm mb-2">
                    <div class="card-body p-2">
                        <canvas id="speedChart" height="60"></canvas>
                    </div>
                </div>

                <div id="map" style="height: 500px;"></div>
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
