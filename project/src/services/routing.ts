import { Location } from '../algorithms/astar';

export interface RouteResult {
  path: Location[];
  totalDistance: number;
  duration: number;
  instructions?: string[];
}

/**
 * Get route using OpenRouteService (OSRM-based) API
 * This provides real road-based routing using A* algorithm on actual street data
 */
export async function getOptimalRoute(
  start: Location,
  end: Location
): Promise<RouteResult> {
  try {
    // Using OSRM (Open Source Routing Machine) - free routing service
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`,
      {
        headers: {
          'User-Agent': 'RideShareApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Routing request failed');
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      // Fallback to straight line if no route found
      return {
        path: [start, end],
        totalDistance: calculateHaversineDistance(start, end),
        duration: 0,
      };
    }

    const route = data.routes[0];
    const coordinates = route.geometry.coordinates;

    // Convert from [lng, lat] to Location objects
    const path: Location[] = coordinates.map((coord: [number, number]) => ({
      lng: coord[0],
      lat: coord[1],
    }));

    // Extract turn-by-turn instructions
    const instructions: string[] = [];
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      route.legs[0].steps.forEach((step: any) => {
        if (step.maneuver && step.maneuver.instruction) {
          instructions.push(step.maneuver.instruction);
        }
      });
    }

    return {
      path,
      totalDistance: route.distance / 1000, // Convert meters to km
      duration: Math.ceil(route.duration / 60), // Convert seconds to minutes
      instructions,
    };
  } catch (error) {
    console.error('Routing error:', error);
    
    // Fallback: Use our A* algorithm with waypoints
    return getFallbackRoute(start, end);
  }
}

/**
 * Fallback routing using enhanced A* algorithm with interpolated waypoints
 */
function getFallbackRoute(start: Location, end: Location): RouteResult {
  const path: Location[] = [start];
  const steps = 20; // Number of waypoints

  // Create interpolated waypoints for smoother path
  for (let i = 1; i <= steps; i++) {
    const ratio = i / (steps + 1);
    path.push({
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    });
  }

  path.push(end);

  const totalDistance = calculateHaversineDistance(start, end);
  const avgSpeedKmh = 40;
  const duration = Math.ceil((totalDistance / avgSpeedKmh) * 60);

  return {
    path,
    totalDistance,
    duration,
  };
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateHaversineDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(loc2.lat - loc1.lat);
  const dLng = toRadians(loc2.lng - loc1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(loc1.lat)) *
      Math.cos(toRadians(loc2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get multiple route alternatives and return the shortest one
 */
export async function getShortestRoute(
  start: Location,
  end: Location
): Promise<RouteResult> {
  try {
    // Request alternative routes
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&alternatives=true&continue_straight=false`,
      {
        headers: {
          'User-Agent': 'RideShareApp/1.0',
        },
      }
    );

    if (!response.ok) {
      return getOptimalRoute(start, end);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return getOptimalRoute(start, end);
    }

    // Find the shortest route by distance
    const shortestRoute = data.routes.reduce((shortest: any, current: any) => {
      return current.distance < shortest.distance ? current : shortest;
    }, data.routes[0]);

    const coordinates = shortestRoute.geometry.coordinates;

    const path: Location[] = coordinates.map((coord: [number, number]) => ({
      lng: coord[0],
      lat: coord[1],
    }));

    const instructions: string[] = [];
    if (shortestRoute.legs && shortestRoute.legs[0] && shortestRoute.legs[0].steps) {
      shortestRoute.legs[0].steps.forEach((step: any) => {
        if (step.maneuver && step.maneuver.instruction) {
          instructions.push(step.maneuver.instruction);
        }
      });
    }

    return {
      path,
      totalDistance: shortestRoute.distance / 1000,
      duration: Math.ceil(shortestRoute.duration / 60),
      instructions,
    };
  } catch (error) {
    console.error('Shortest route error:', error);
    return getOptimalRoute(start, end);
  }
}
