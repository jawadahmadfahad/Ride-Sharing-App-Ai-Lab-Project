import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Navigation } from 'lucide-react';
import { Location } from '../algorithms/astar';
import { geocodeAddress, debounce, searchLocationSuggestions, getCurrentLocation, LocationSuggestion } from '../services/geocoding';

interface SearchRideFormProps {
  onSearch: (data: {
    pickup: Location & { address: string };
    dropoff: Location & { address: string };
  }) => void;
  loading?: boolean;
}

export default function SearchRideForm({ onSearch, loading }: SearchRideFormProps) {
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLng, setDropoffLng] = useState('');
  const [geocodingPickup, setGeocodingPickup] = useState(false);
  const [geocodingDropoff, setGeocodingDropoff] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationSuggestion[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<LocationSuggestion[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const pickupRef = useRef<HTMLDivElement>(null);
  const dropoffRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target as Node)) {
        setShowPickupSuggestions(false);
      }
      if (dropoffRef.current && !dropoffRef.current.contains(event.target as Node)) {
        setShowDropoffSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detect current location on component mount
  useEffect(() => {
    handleDetectLocation();
  }, []);

  // Search for location suggestions
  const searchPickupSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setPickupSuggestions([]);
        return;
      }

      const results = await searchLocationSuggestions(query);
      setPickupSuggestions(results);
      setShowPickupSuggestions(true);
    }, 500),
    []
  );

  const searchDropoffSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setDropoffSuggestions([]);
        return;
      }

      const results = await searchLocationSuggestions(query);
      setDropoffSuggestions(results);
      setShowDropoffSuggestions(true);
    }, 500),
    []
  );

  // Handle current location detection
  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    const location = await getCurrentLocation();
    setDetectingLocation(false);

    if (location) {
      setPickupAddress(location.display_name);
      setPickupLat(location.lat.toString());
      setPickupLng(location.lng.toString());
    } else {
      alert('Unable to detect your location. Please enter it manually or enable location services.');
    }
  };

  // Handle selecting a suggestion
  const handlePickupSuggestionSelect = (suggestion: LocationSuggestion) => {
    setPickupAddress(suggestion.display_name);
    setPickupLat(suggestion.lat);
    setPickupLng(suggestion.lon);
    setShowPickupSuggestions(false);
    setPickupSuggestions([]);
  };

  const handleDropoffSuggestionSelect = (suggestion: LocationSuggestion) => {
    setDropoffAddress(suggestion.display_name);
    setDropoffLat(suggestion.lat);
    setDropoffLng(suggestion.lon);
    setShowDropoffSuggestions(false);
    setDropoffSuggestions([]);
  };

  // Debounced geocoding for pickup
  const geocodePickup = useCallback(
    debounce(async (address: string) => {
      if (!address.trim()) {
        setPickupLat('');
        setPickupLng('');
        return;
      }

      setGeocodingPickup(true);
      const result = await geocodeAddress(address);
      setGeocodingPickup(false);

      if (result) {
        setPickupLat(result.lat.toString());
        setPickupLng(result.lng.toString());
      } else {
        setPickupLat('');
        setPickupLng('');
      }
    }, 800),
    []
  );

  // Debounced geocoding for dropoff
  const geocodeDropoff = useCallback(
    debounce(async (address: string) => {
      if (!address.trim()) {
        setDropoffLat('');
        setDropoffLng('');
        return;
      }

      setGeocodingDropoff(true);
      const result = await geocodeAddress(address);
      setGeocodingDropoff(false);

      if (result) {
        setDropoffLat(result.lat.toString());
        setDropoffLng(result.lng.toString());
      } else {
        setDropoffLat('');
        setDropoffLng('');
      }
    }, 800),
    []
  );

  // Handle pickup address change
  const handlePickupChange = (address: string) => {
    setPickupAddress(address);
    searchPickupSuggestions(address);
    if (address.length >= 3) {
      geocodePickup(address);
    }
  };

  // Handle dropoff address change
  const handleDropoffChange = (address: string) => {
    setDropoffAddress(address);
    searchDropoffSuggestions(address);
    if (address.length >= 3) {
      geocodeDropoff(address);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pickupAddress || !pickupLat || !pickupLng || !dropoffAddress || !dropoffLat || !dropoffLng) {
      alert('Please fill in all fields');
      return;
    }

    onSearch({
      pickup: {
        lat: parseFloat(pickupLat),
        lng: parseFloat(pickupLng),
        address: pickupAddress,
      },
      dropoff: {
        lat: parseFloat(dropoffLat),
        lng: parseFloat(dropoffLng),
        address: dropoffAddress,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Search className="w-6 h-6 text-blue-600" />
        Find a Ride
      </h2>

      <div className="space-y-4">
        <div ref={pickupRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1 text-green-600" />
            Your Location (Pickup)
            {geocodingPickup && (
              <Loader2 className="w-4 h-4 inline ml-2 animate-spin text-blue-500" />
            )}
            {detectingLocation && (
              <Loader2 className="w-4 h-4 inline ml-2 animate-spin text-green-500" />
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => handlePickupChange(e.target.value)}
              onFocus={() => pickupSuggestions.length > 0 && setShowPickupSuggestions(true)}
              placeholder="Type to search location..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              title="Detect my current location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
          
          {/* Pickup Suggestions Dropdown */}
          {showPickupSuggestions && pickupSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {pickupSuggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => handlePickupSuggestionSelect(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.display_name.split(',')[0]}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {suggestion.display_name}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {pickupLat && pickupLng && (
            <div className="mt-2 text-sm text-gray-500">
              📍 {parseFloat(pickupLat).toFixed(4)}, {parseFloat(pickupLng).toFixed(4)}
            </div>
          )}
        </div>

        <div ref={dropoffRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1 text-red-600" />
            Destination (Dropoff)
            {geocodingDropoff && (
              <Loader2 className="w-4 h-4 inline ml-2 animate-spin text-blue-500" />
            )}
          </label>
          <input
            type="text"
            value={dropoffAddress}
            onChange={(e) => handleDropoffChange(e.target.value)}
            onFocus={() => dropoffSuggestions.length > 0 && setShowDropoffSuggestions(true)}
            placeholder="Type to search destination..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />

          {/* Dropoff Suggestions Dropdown */}
          {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {dropoffSuggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => handleDropoffSuggestionSelect(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.display_name.split(',')[0]}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {suggestion.display_name}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {dropoffLat && dropoffLng && (
            <div className="mt-2 text-sm text-gray-500">
              📍 {parseFloat(dropoffLat).toFixed(4)}, {parseFloat(dropoffLng).toFixed(4)}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          'Searching...'
        ) : (
          <>
            <Search className="w-5 h-5" />
            Search Rides
          </>
        )}
      </button>
    </form>
  );
}
