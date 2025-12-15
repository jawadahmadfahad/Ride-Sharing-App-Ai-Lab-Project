export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export interface LocationSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

/**
 * Get user's current location using browser geolocation API
 */
export async function getCurrentLocation(): Promise<GeocodeResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'RideShareApp/1.0',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            resolve({
              lat: latitude,
              lng: longitude,
              display_name: data.display_name || `${latitude}, ${longitude}`,
            });
          } else {
            resolve({
              lat: latitude,
              lng: longitude,
              display_name: `${latitude}, ${longitude}`,
            });
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          resolve({
            lat: latitude,
            lng: longitude,
            display_name: `${latitude}, ${longitude}`,
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Search for location suggestions (autocomplete)
 */
export async function searchLocationSuggestions(
  query: string
): Promise<LocationSuggestion[]> {
  if (!query.trim() || query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'RideShareApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Location search failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Location search error:', error);
    return [];
  }
}

/**
 * Geocode an address to coordinates using Nominatim (OpenStreetMap)
 * Free to use, no API key required
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address.trim()) {
    return null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'RideShareApp/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Debounce function to limit API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
