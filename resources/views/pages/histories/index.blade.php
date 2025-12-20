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
            <div id="map" style="height: 500px;"></div>
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

@endpush
