@push('style')
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">
    <link rel="stylesheet" href="{{ asset('backend/assets/css/dashboard.css') }}">
@endpush

@extends('layouts.admin')
@section('title', 'Monitoring Kendaraan')
@section('content')

<div class="container-fluid p-0">
    <div class="wrapper">
        <!-- Sidebar Kiri - Daftar Kendaraan -->
        <div id="sidebar" class="panel-card">
            <div class="card">
                {{-- <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Daftar Kendaraan</span>
                    <span class="badge bg-light text-dark" id="vehicleCount">0</span>
                </div> --}}
                <div class="card-body">
                    <span class="badge bg-light text-dark" id="vehicleCount">0</span>
                    <input type="text" 
                           id="searchInput" 
                           class="form-control" 
                           placeholder="🔍 Cari kendaraan..." 
                           onkeyup="filterList()">
                    <div class="status-tabs">
                        <div class="status-tab active" data-filter="all" onclick="setFilter('all')">
                            All <span id="count-all">0</span>
                        </div>
                        <div class="status-tab" data-filter="moving" onclick="setFilter('moving')">
                            Moving <span id="count-moving">0</span>
                        </div>
                        <div class="status-tab" data-filter="idle" onclick="setFilter('idle')">
                            Idle <span id="count-idle">0</span>
                        </div>
                        <div class="status-tab" data-filter="stop" onclick="setFilter('stop')">
                            Stop <span id="count-stop">0</span>
                        </div>
                    </div>


                    <div id="list" class="mt-3">
                        <div class="loading">
                            <div class="loading-spinner"></div>
                            <p>Memuat data kendaraan...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tombol toggle sidebar kiri -->
        <button class="toggle-btn left" id="toggleSidebarLeft" onclick="toggleSidebarLeft()">
            <span id="leftArrow">◀</span>
        </button>

        <!-- Peta -->
        <div id="map-container" class="panel-card">
            <div class="card">
                {{-- <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Peta Monitoring</span>
                    <div>
                        <small class="me-3">
                            Total: <span id="mapCount" class="badge bg-info">0</span>
                        </small>
                        <small>
                            Aktif: <span id="activeCount" class="badge bg-success">0</span>
                        </small>
                    </div>
                </div> --}}
                <div class="card-body">
                    <div id="map"></div>
                </div>
            </div>
        </div>

        <!-- Panel Detail Kanan -->
        <div id="detailPanel" class="panel-card">
            <div class="card">
                {{-- <div class="card-header d-flex justify-content-between align-items-center">
                    <span>Detail Kendaraan</span>
                    <button class="btn btn-sm btn-light" onclick="clearDetail()">
                        <small>Clear</small>
                    </button>
                </div> --}}
                <div class="card-body">
                    <div id="detailContent">
                        <div class="text-center py-5">
                            <div class="mb-3">
                                <i class="fas fa-car fa-3x text-muted"></i>
                                <button class="btn btn-sm btn-light" onclick="clearDetail()">
                                  <small>Clear</small>
                              </button>
                            </div>
                            <h6 class="text-muted">Pilih kendaraan</h6>
                            <p class="text-muted small">Klik pada daftar kendaraan atau marker di peta</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tombol toggle sidebar kanan -->
        <button class="toggle-btn right" id="toggleSidebarRight" onclick="toggleSidebarRight()">
            <span id="rightArrow">▶</span>
        </button>
    </div>
</div>

@endsection

@push('scripts')
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://maps.googleapis.com/maps/api/js?key={{ config('services.google_map.api_key') }}"></script>
<script src="https://unpkg.com/leaflet.gridlayer.googlemutant/dist/Leaflet.GoogleMutant.js"></script>

<script src="https://rawcdn.githack.com/bbecquet/Leaflet.RotatedMarker/master/leaflet.rotatedMarker.js"></script>
<script src="{{ asset('backend/assets/js/speedotrack/dashboard.js') }}"></script>

@endpush