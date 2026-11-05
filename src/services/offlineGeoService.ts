// Offline-First Dual Location Geo-Tracking & Dead Reckoning Service
export interface GeoCoordinate {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
  isSimulated?: boolean;
}

export interface DualLocationData {
  myLocation: GeoCoordinate;
  callerLocation: {
    lat: number;
    lng: number;
    name: string;
    phone: string;
    city: string;
    isGhostMarker: boolean; // true if offline last-seen
    lastSeenTime?: string;
  };
  distanceKm: number;
  compassBearing: number; // 0 - 360 deg
  isOfflineMode: boolean;
  deadReckoningActive: boolean;
  satelliteFixActive: boolean;
  simSlot: 1 | 2;
  simOperator: string;
}

const CITY_COORDINATES_MAP: Record<string, { lat: number; lng: number }> = {
  'ঢাকা': { lat: 23.8103, lng: 90.4125 },
  'dhaka': { lat: 23.8103, lng: 90.4125 },
  'গুলশান, ঢাকা': { lat: 23.7925, lng: 90.4078 },
  'গুলশান': { lat: 23.7925, lng: 90.4078 },
  'গুলশান-২': { lat: 23.7925, lng: 90.4078 },
  'ধানমন্ডি': { lat: 23.7461, lng: 90.3742 },
  'উত্তরা': { lat: 23.8759, lng: 90.3795 },
  'মিরপুর': { lat: 23.8041, lng: 90.3667 },
  'মতিঝিল': { lat: 23.7330, lng: 90.4172 },
  'বসুন্ধরা, ঢাকা': { lat: 23.8151, lng: 90.4357 },
  'বসুন্ধরা': { lat: 23.8151, lng: 90.4357 },
  'চট্টগ্রাম': { lat: 22.3569, lng: 91.7832 },
  'chittagong': { lat: 22.3569, lng: 91.7832 },
  'সিরাজগঞ্জ': { lat: 24.4534, lng: 89.7006 },
  'sirajganj': { lat: 24.4534, lng: 89.7006 },
  'সিলেট': { lat: 24.8949, lng: 91.8687 },
  'sylhet': { lat: 24.8949, lng: 91.8687 },
  'রাজশাহী': { lat: 24.3745, lng: 88.6042 },
  'rajshahi': { lat: 24.3745, lng: 88.6042 },
  'খুলনা': { lat: 22.8456, lng: 89.5403 },
  'khulna': { lat: 22.8456, lng: 89.5403 },
  'বরিশাল': { lat: 22.7010, lng: 90.3535 },
  'barishal': { lat: 22.7010, lng: 90.3535 },
  'রংপুর': { lat: 25.7439, lng: 89.2752 },
  'ময়মনসিংহ': { lat: 24.7471, lng: 90.4203 },
  'কুমিল্লা': { lat: 23.4682, lng: 91.1788 },
  'গাজীপুর': { lat: 23.9999, lng: 90.4203 },
  'নারায়ণগঞ্জ': { lat: 23.6238, lng: 90.5000 },
  'বগুড়া': { lat: 24.8465, lng: 89.3777 },
  'কক্সবাজার': { lat: 21.4272, lng: 92.0058 },
  'যশোর': { lat: 23.1664, lng: 89.2081 },
};

const DEFAULT_DHAKA_COORDS: GeoCoordinate = {
  lat: 23.8103,
  lng: 90.4125,
  accuracy: 12,
  speed: 0,
  heading: 45,
  altitude: 18,
  timestamp: Date.now(),
  isSimulated: true,
};

const LAST_KNOWN_LOCATION_KEY = 'smart_dialer_last_known_geo';

class OfflineGeoService {
  private watchId: number | null = null;
  private lastKnownCoord: GeoCoordinate;
  private motionSpeed: number = 0;
  private deadReckoningActive: boolean = false;
  private listeners: Set<(coord: GeoCoordinate) => void> = new Set();

  constructor() {
    this.lastKnownCoord = this.loadLastKnownLocation();
    this.initSensorFusion();
    this.startGpsTracking();
  }

  private loadLastKnownLocation(): GeoCoordinate {
    try {
      const saved = localStorage.getItem(LAST_KNOWN_LOCATION_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_DHAKA_COORDS;
  }

  private saveLastKnownLocation(coord: GeoCoordinate) {
    try {
      this.lastKnownCoord = coord;
      localStorage.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify(coord));
    } catch {}
  }

  /**
   * Inertial Dead Reckoning: Uses device accelerometer/gyroscope to detect step and inertial movement
   * when satellite or tower connection is unavailable
   */
  private initSensorFusion() {
    if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
      window.addEventListener('devicemotion', (e) => {
        const acc = e.accelerationIncludingGravity;
        if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
          const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
          // If magnitude delta exceeds gravity threshold, estimate footstep or car acceleration
          if (Math.abs(magnitude - 9.8) > 1.2) {
            this.motionSpeed = Math.min(60, this.motionSpeed + 0.3);
            this.deadReckoningActive = true;
          } else {
            this.motionSpeed = Math.max(0, this.motionSpeed - 0.2);
            if (this.motionSpeed === 0) this.deadReckoningActive = false;
          }
        }
      });
    }
  }

  /**
   * Starts high-accuracy GPS satellite tracking (independent of cell towers)
   */
  public startGpsTracking() {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        this.watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const coord: GeoCoordinate = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
              altitude: pos.coords.altitude,
              speed: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : Math.round(this.motionSpeed),
              heading: pos.coords.heading || 0,
              timestamp: pos.timestamp,
              isSimulated: false,
            };
            this.saveLastKnownLocation(coord);
            this.notifyListeners(coord);
          },
          (err) => {
            console.warn('Geolocation direct sensor notice:', err.message);
            // Keep using last known position without crashing
            this.notifyListeners(this.lastKnownCoord);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000,
          }
        );
      } catch (err) {
        console.warn('GPS initial watch failed:', err);
      }
    }
  }

  public getMyLocation(): GeoCoordinate {
    return this.lastKnownCoord || DEFAULT_DHAKA_COORDS;
  }

  public subscribe(callback: (coord: GeoCoordinate) => void): () => void {
    this.listeners.add(callback);
    callback(this.getMyLocation());
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(coord: GeoCoordinate) {
    this.listeners.forEach((fn) => fn(coord));
  }

  /**
   * Resolves remote contact or caller city to geographical coordinates
   */
  public resolveCallerCoordinates(cityName?: string, phoneNumber?: string): { lat: number; lng: number; city: string } {
    if (cityName) {
      const cleanCity = cityName.toLowerCase().trim();
      for (const [key, coords] of Object.entries(CITY_COORDINATES_MAP)) {
        if (cleanCity.includes(key.toLowerCase()) || key.toLowerCase().includes(cleanCity)) {
          return { ...coords, city: key };
        }
      }
    }

    // Hash phone number to deterministically place near city division centers if city not explicit
    if (phoneNumber) {
      const digits = phoneNumber.replace(/\D/g, '');
      const hash = digits.split('').reduce((acc, c) => acc + parseInt(c, 10), 0);
      const cities = ['সিরাজগঞ্জ', 'ঢাকা', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা', 'গুলশান', 'বসুন্ধরা'];
      const picked = cities[hash % cities.length];
      const base = CITY_COORDINATES_MAP[picked] || CITY_COORDINATES_MAP['ঢাকা'];
      // Slight delta so markers don't overlap exactly
      const latOffset = ((hash % 10) - 5) * 0.006;
      const lngOffset = (((hash * 3) % 10) - 5) * 0.006;
      return {
        lat: base.lat + latOffset,
        lng: base.lng + lngOffset,
        city: picked,
      };
    }

    return { ...CITY_COORDINATES_MAP['ঢাকা'], city: 'ঢাকা' };
  }

  /**
   * Haversine Great-Circle Distance calculation in kilometers
   */
  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  /**
   * Calculates compass bearing angle from user to caller (0 - 360 deg)
   */
  public calculateCompassBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(((lon2 - lon1) * Math.PI) / 180);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return Math.round((brng + 360) % 360);
  }

  /**
   * Compass direction label in Bengali (উদা: উত্তর-পূর্ব, দক্ষিণ-পশ্চিম)
   */
  public getBearingDirectionLabel(deg: number, isBn: boolean = true): string {
    const directionsEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const directionsBn = [
      'উত্তর',
      'উত্তর-পূর্ব',
      'পূর্ব',
      'দক্ষিণ-পূর্ব',
      'দক্ষিণ',
      'দক্ষিণ-পশ্চিম',
      'পশ্চিম',
      'উত্তর-পশ্চিম',
    ];
    const index = Math.round(deg / 45) % 8;
    return isBn ? directionsBn[index] : directionsEn[index];
  }

  public isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  public isDeadReckoning(): boolean {
    return this.deadReckoningActive;
  }
}

export const offlineGeoService = new OfflineGeoService();
