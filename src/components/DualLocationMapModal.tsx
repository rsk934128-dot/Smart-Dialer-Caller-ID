import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Radio,
  WifiOff,
  Crosshair,
  ShieldCheck,
  Maximize2,
  X,
  Phone,
  Signal,
  Layers,
  Sparkles,
  RefreshCw,
  LocateFixed,
  AlertTriangle,
  CardSim as SimCard,
  Gauge,
  Smartphone,
} from 'lucide-react';
import L from 'leaflet';
import { offlineGeoService, GeoCoordinate } from '../services/offlineGeoService';
import { callPermissionService } from '../services/callPermissionService';
import { Language } from '../utils/i18n';

interface DualLocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  callerPhone?: string;
  callerName?: string;
  callerCity?: string;
  isCallActive?: boolean;
}

export const DualLocationMapModal: React.FC<DualLocationMapModalProps> = ({
  isOpen,
  onClose,
  lang,
  callerPhone = '+880 1711-234567',
  callerName = 'তানভীর আহমেদ',
  callerCity = 'সিরাজগঞ্জ',
  isCallActive = false,
}) => {
  const isBn = lang === 'bn';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const myMarkerRef = useRef<L.Marker | null>(null);
  const callerMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [myCoords, setMyCoords] = useState<GeoCoordinate>(() => offlineGeoService.getMyLocation());
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [mapMode, setMapMode] = useState<'standard' | 'vector_radar'>('standard');
  const [selectedSim, setSelectedSim] = useState<1 | 2>(() => {
    const pref = callPermissionService.getDefaultSimSlot();
    return pref === 2 ? 2 : 1;
  });
  const [simLabels] = useState(() => callPermissionService.getSimOperatorLabels());

  // Resolve caller coordinates (defaulting to Sirajganj / City DB)
  const callerCoords = offlineGeoService.resolveCallerCoordinates(callerCity, callerPhone);

  // Distance and Compass Bearing
  const distanceKm = offlineGeoService.calculateDistanceKm(
    myCoords.lat,
    myCoords.lng,
    callerCoords.lat,
    callerCoords.lng
  );
  const bearingDeg = offlineGeoService.calculateCompassBearing(
    myCoords.lat,
    myCoords.lng,
    callerCoords.lat,
    callerCoords.lng
  );
  const bearingLabel = offlineGeoService.getBearingDirectionLabel(bearingDeg, isBn);

  // Online / Offline network listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to live GPS coordinates
  useEffect(() => {
    if (!isOpen) return;
    const unsub = offlineGeoService.subscribe((coords) => {
      setMyCoords(coords);
    });
    return () => unsub();
  }, [isOpen]);

  // Initialize and Update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Custom pulse icon for My Location
    const myLocationIcon = L.divIcon({
      className: 'custom-my-location-marker',
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 16px; height: 16px; border-radius: 50%; background: #10b981; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(16,185,129,0.8);"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    // Custom beacon icon for Caller Location (Ghost Marker capable)
    const callerIcon = L.divIcon({
      className: 'custom-caller-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(56, 189, 248, 0.35); animation: pulse 2s infinite;"></div>
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #0284c7; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; box-shadow: 0 0 12px rgba(2,132,199,0.8);">
            📞
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const midLat = (myCoords.lat + callerCoords.lat) / 2;
    const midLng = (myCoords.lng + callerCoords.lng) / 2;

    if (!mapInstanceRef.current) {
      // Create Map
      const map = L.map(mapContainerRef.current, {
        center: [midLat, midLng],
        zoom: distanceKm > 50 ? 8 : distanceKm > 10 ? 11 : 13,
        zoomControl: false,
      });

      // OpenStreetMap Tiles (cached by Service Worker)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Accuracy circle around my location
      circleRef.current = L.circle([myCoords.lat, myCoords.lng], {
        radius: myCoords.accuracy || 30,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map);

      // Markers
      myMarkerRef.current = L.marker([myCoords.lat, myCoords.lng], { icon: myLocationIcon })
        .addTo(map)
        .bindPopup(`<b>${isBn ? 'আমার অবস্থান' : 'My Location'}</b><br/>GPS Accuracy: ±${myCoords.accuracy}m`);

      callerMarkerRef.current = L.marker([callerCoords.lat, callerCoords.lng], { icon: callerIcon })
        .addTo(map)
        .bindPopup(`<b>${callerName}</b><br/>${callerCoords.city} • ${callerPhone}`);

      // Geodesic Polyline connecting both parties
      polylineRef.current = L.polyline(
        [
          [myCoords.lat, myCoords.lng],
          [callerCoords.lat, callerCoords.lng],
        ],
        {
          color: '#38bdf8',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.85,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    } else {
      const map = mapInstanceRef.current;
      if (myMarkerRef.current) myMarkerRef.current.setLatLng([myCoords.lat, myCoords.lng]);
      if (circleRef.current) {
        circleRef.current.setLatLng([myCoords.lat, myCoords.lng]);
        circleRef.current.setRadius(myCoords.accuracy || 30);
      }
      if (callerMarkerRef.current) callerMarkerRef.current.setLatLng([callerCoords.lat, callerCoords.lng]);
      if (polylineRef.current) {
        polylineRef.current.setLatLngs([
          [myCoords.lat, myCoords.lng],
          [callerCoords.lat, callerCoords.lng],
        ]);
      }
    }

    return () => {
      // Cleanup on unmount
    };
  }, [isOpen, myCoords.lat, myCoords.lng, callerCoords.lat, callerCoords.lng, isBn]);

  // Clean destruction when closing
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, [isOpen]);

  // Canvas Vector Radar Rendering (100% Offline fallback and high-tech display)
  useEffect(() => {
    if (!isOpen || mapMode !== 'vector_radar' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) - 25;

      ctx.clearRect(0, 0, width, height);

      // Dark tactical radar background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Concentric Radar Distance Rings
      ctx.lineWidth = 1;
      for (let r = 1; r <= 4; r++) {
        const ringRad = (radius / 4) * r;
        ctx.strokeStyle = r === 4 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, ringRad, 0, Math.PI * 2);
        ctx.stroke();

        // Distance text on rings
        ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.font = '9px monospace';
        const ringKm = ((distanceKm * 1.3) / 4) * r;
        ctx.fillText(`${ringKm.toFixed(0)} km`, cx + 4, cy - ringRad + 11);
      }

      // Crosshairs & Cardinal Directions
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('N (উত্তর)', cx - 22, cy - radius - 6);
      ctx.fillText('S (দক্ষিণ)', cx - 22, cy + radius + 15);
      ctx.fillText('E', cx + radius + 6, cy + 4);
      ctx.fillText('W', cx - radius - 18, cy + 4);

      // Sweeping Radar Line
      angle += 0.025;
      const sweepX = cx + Math.cos(angle) * radius;
      const sweepY = cy + Math.sin(angle) * radius;
      const sweepGrad = ctx.createLinearGradient(cx, cy, sweepX, sweepY);
      sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
      sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.6)');
      ctx.strokeStyle = sweepGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // Center: User Position (Green Pulse)
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('আমার অবস্থান (GPS)', cx - 45, cy + 20);

      // Caller Position (Bearing Arc)
      const callerRadAngle = ((bearingDeg - 90) * Math.PI) / 180;
      const callerDistOnMap = Math.min(radius - 15, Math.max(40, radius * 0.75));
      const callerX = cx + Math.cos(callerRadAngle) * callerDistOnMap;
      const callerY = cy + Math.sin(callerRadAngle) * callerDistOnMap;

      // Connecting Dotted Line
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(callerX, callerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Caller Target Node
      ctx.beginPath();
      ctx.arc(callerX, callerY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${callerName} (${callerCoords.city})`, callerX - 35, callerY - 14);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, mapMode, bearingDeg, distanceKm, callerName, callerCoords.city]);

  if (!isOpen) return null;

  const handleFitBounds = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds([
      [myCoords.lat, myCoords.lng],
      [callerCoords.lat, callerCoords.lng],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const handleCenterMe = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([myCoords.lat, myCoords.lng], 14, { duration: 0.8 });
  };

  const handleCenterCaller = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([callerCoords.lat, callerCoords.lng], 14, { duration: 0.8 });
  };

  return (
    <div
      id="dual-location-map-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="dual-location-card"
        className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[720px] text-white"
      >
        {/* Top Header Bar */}
        <div className="p-3 sm:p-4 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold truncate">
                  {isBn ? 'ডুয়াল লোকেশন স্যাটেলাইট রেডার' : 'Dual Location Satellite Radar'}
                </h3>
                {/* Emergency Offline Badge */}
                {isOffline ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    <span>{isBn ? 'অফলাইন A-GPS মোড' : 'Offline A-GPS'}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-ping" />
                    <span>{isBn ? 'লাইভ স্যাটেলাইট ট্র্যাকিং' : 'Live Satellite GPS'}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                {isBn ? 'টাওয়ার ডাটা ছাড়াই স্যাটেলাইট ও ইনার্শিয়াল সেন্সর ফিউশন' : 'Direct Satellite positioning & Inertial sensor fusion'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Map Mode Toggle (Standard Tiles vs Vector Radar) */}
            <button
              onClick={() => setMapMode((prev) => (prev === 'standard' ? 'vector_radar' : 'standard'))}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                mapMode === 'vector_radar'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
              }`}
              title="ম্যাপ ভিউ সুইচ করুন"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{mapMode === 'vector_radar' ? 'ভেক্টর রেডার' : 'রাস্টার ম্যাপ'}</span>
            </button>

            <button
              id="close-dual-map-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tactical Metric Status Bar (Dual Locations Overview) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-neutral-900/60 border-b border-neutral-800/80 text-xs shrink-0">
          {/* Box 1: Distance */}
          <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-neutral-400 block">{isBn ? 'দূরত্ব' : 'Distance'}</span>
              <strong className="text-xs text-sky-300 font-mono font-bold truncate">
                {distanceKm} km
              </strong>
            </div>
          </div>

          {/* Box 2: Compass Direction */}
          <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-neutral-400 block">{isBn ? 'দিকদর্শন' : 'Bearing'}</span>
              <strong className="text-xs text-amber-300 font-bold truncate">
                {bearingDeg}° ({bearingLabel})
              </strong>
            </div>
          </div>

          {/* Box 3: GPS Accuracy & Speed */}
          <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-neutral-400 block">{isBn ? 'স্যাটেলাইট ফিক্স' : 'GPS Accuracy'}</span>
              <strong className="text-xs text-emerald-300 font-mono font-bold truncate">
                ±{myCoords.accuracy || 12}m • {myCoords.speed || 0} km/h
              </strong>
            </div>
          </div>

          {/* Box 4: SIM Slot Cellular Status */}
          <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
            <Signal className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-neutral-400 block">{isBn ? 'সিম কার্ড নেট' : 'Cellular Slot'}</span>
              <strong className="text-xs text-indigo-300 font-bold truncate">
                SIM {selectedSim} ({selectedSim === 1 ? simLabels.sim1 : simLabels.sim2})
              </strong>
            </div>
          </div>
        </div>

        {/* Map Body Area */}
        <div className="relative flex-1 w-full bg-neutral-950 overflow-hidden">
          {/* Leaflet Map Layer */}
          <div
            ref={mapContainerRef}
            className={`w-full h-full transition-opacity duration-300 ${
              mapMode === 'standard' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Offline Vector Canvas Radar Layer */}
          {mapMode === 'vector_radar' && (
            <canvas
              ref={canvasRef}
              width={640}
              height={440}
              className="w-full h-full object-cover block"
            />
          )}

          {/* Floating Map Quick Actions */}
          <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
            <button
              onClick={handleFitBounds}
              title="উভয় অবস্থান স্ক্রিনে দেখুন (Fit Both)"
              className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-white shadow-lg active:scale-95 transition"
            >
              <Maximize2 className="w-4 h-4 text-sky-400" />
            </button>
            <button
              onClick={handleCenterMe}
              title="আমার অবস্থান সেন্টারিং করুন (Center Me)"
              className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-white shadow-lg active:scale-95 transition"
            >
              <LocateFixed className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={handleCenterCaller}
              title="কলার অবস্থান সেন্টারিং করুন (Center Caller)"
              className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-white shadow-lg active:scale-95 transition"
            >
              <Crosshair className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* Floating Bottom Card: Caller Profile Summary */}
          <div className="absolute bottom-3 inset-x-3 z-20 p-3 rounded-2xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800/90 shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sky-600/30 border border-sky-500/50 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                <Phone className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white truncate">{callerName}</h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/80 font-mono">
                    {callerCoords.city}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono truncate">
                  {callerPhone} • Lat: {callerCoords.lat.toFixed(4)}, Lng: {callerCoords.lng.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-neutral-400 block">{isBn ? 'সরাসরি দূরত্ব' : 'Linear Range'}</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{distanceKm} KM</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2 bg-neutral-900/90 border-t border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              {isBn
                ? 'Dead Reckoning সেন্সর ফিউশন ও অফলাইন কেয়ার সক্রিয় (ইন্টারনেট বা টাওয়ার ছাড়াই কার্যকর)'
                : 'Inertial Dead Reckoning active (Functional without cellular towers)'}
            </span>
          </div>
          <span className="font-mono text-neutral-500 hidden sm:inline">MapLibre / Leaflet OSM Engine</span>
        </div>
      </div>
    </div>
  );
};
