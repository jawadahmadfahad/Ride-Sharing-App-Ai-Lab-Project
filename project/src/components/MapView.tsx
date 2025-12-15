import { useEffect, useRef } from 'react';
import { MapPin, Navigation, TrendingUp } from 'lucide-react';
import { Location } from '../algorithms/astar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  pickup?: Location & { address?: string };
  dropoff?: Location & { address?: string };
  currentLocation?: Location;
  path?: Location[];
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView({
  pickup,
  dropoff,
  currentLocation,
  path,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      const center = pickup || currentLocation || { lat: 37.7749, lng: -122.4194 };
      
      mapRef.current = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Add OpenStreetMap tile layer with detailed streets
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing layers except the tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    const bounds: L.LatLngBoundsExpression = [];

    // Add pickup marker
    if (pickup) {
      const pickupIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 32px;
              height: 32px;
              background: #10b981;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="
              position: absolute;
              top: -25px;
              left: 50%;
              transform: translateX(-50%);
              background: #10b981;
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">Pickup</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>Pickup Location</b><br>${pickup.address || `${pickup.lat}, ${pickup.lng}`}`);
      
      bounds.push([pickup.lat, pickup.lng]);
    }

    // Add dropoff marker
    if (dropoff) {
      const dropoffIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 32px;
              height: 32px;
              background: #ef4444;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="
              position: absolute;
              top: -25px;
              left: 50%;
              transform: translateX(-50%);
              background: #ef4444;
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">Dropoff</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon })
        .addTo(map)
        .bindPopup(`<b>Dropoff Location</b><br>${dropoff.address || `${dropoff.lat}, ${dropoff.lng}`}`);
      
      bounds.push([dropoff.lat, dropoff.lng]);
    }

    // Add current location marker
    if (currentLocation) {
      L.circle([currentLocation.lat, currentLocation.lng], {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.3,
        radius: 100,
      }).addTo(map);

      const currentIcon = L.divIcon({
        className: 'current-location-marker',
        html: `
          <div style="
            width: 16px;
            height: 16px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([currentLocation.lat, currentLocation.lng], { icon: currentIcon })
        .addTo(map)
        .bindPopup('<b>Your Location</b>');
      
      bounds.push([currentLocation.lat, currentLocation.lng]);
    }

    // Draw path/route
    if (path && path.length > 1) {
      const latLngs: L.LatLngExpression[] = path.map((p) => [p.lat, p.lng]);
      
      // Main route line
      L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(map);

      // Route border/outline
      L.polyline(latLngs, {
        color: '#1e40af',
        weight: 7,
        opacity: 0.4,
        smoothFactor: 1,
      }).addTo(map);

      bounds.push(...latLngs);
    } else if (pickup && dropoff) {
      // Draw straight line if no path
      L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.5,
        dashArray: '10, 10',
      }).addTo(map);
    }

    // Fit map to show all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    return () => {
      // Cleanup is handled by not destroying the map
    };
  }, [pickup, dropoff, currentLocation, path]);

  // Calculate distance
  const calculateDistance = () => {
    if (!pickup || !dropoff) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
    const dLng = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickup.lat * Math.PI) / 180) *
        Math.cos((dropoff.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const distance = calculateDistance();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" />
          Route Preview
          {distance && (
            <span className="ml-2 flex items-center gap-1 text-sm font-normal text-gray-600">
              <TrendingUp className="w-4 h-4" />
              {distance} km
            </span>
          )}
        </h3>
        {path && path.length > 2 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            A* Shortest Route
          </div>
        )}
      </div>

      <div 
        ref={mapContainerRef} 
        className="w-full h-96 rounded-lg overflow-hidden shadow-lg border-2 border-white"
        style={{ minHeight: '400px' }}
      />

      <div className="mt-4 space-y-2">
        {pickup?.address && (
          <div className="flex items-start gap-2 text-sm bg-white p-3 rounded-lg shadow-sm">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-gray-900">Pickup</div>
              <span className="text-gray-600">{pickup.address}</span>
            </div>
          </div>
        )}
        {dropoff?.address && (
          <div className="flex items-start gap-2 text-sm bg-white p-3 rounded-lg shadow-sm">
            <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-gray-900">Dropoff</div>
              <span className="text-gray-600">{dropoff.address}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
