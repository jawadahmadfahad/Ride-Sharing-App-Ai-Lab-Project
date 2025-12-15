export interface Location {
  lat: number;
  lng: number;
}

export interface PathNode {
  location: Location;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(loc1: Location, loc2: Location): number {
  const dLat = toRadians(loc2.lat - loc1.lat);
  const dLng = toRadians(loc2.lng - loc1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(loc1.lat)) *
    Math.cos(toRadians(loc2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateEstimatedDuration(distanceKm: number): number {
  const avgSpeedKmh = 40;
  const durationHours = distanceKm / avgSpeedKmh;
  return Math.ceil(durationHours * 60);
}

export function astarPathfinding(
  start: Location,
  goal: Location,
  waypoints: Location[] = []
): { path: Location[]; totalDistance: number } {
  const allPoints = [start, ...waypoints, goal];
  const path: Location[] = [];
  let totalDistance = 0;

  for (let i = 0; i < allPoints.length - 1; i++) {
    const segmentStart = allPoints[i];
    const segmentEnd = allPoints[i + 1];

    const openSet: PathNode[] = [];
    const closedSet: PathNode[] = [];

    const startNode: PathNode = {
      location: segmentStart,
      g: 0,
      h: haversineDistance(segmentStart, segmentEnd),
      f: 0,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (haversineDistance(current.location, segmentEnd) < 0.1) {
        let node: PathNode | undefined = current;
        while (node) {
          path.push(node.location);
          node = node.parent;
        }
        totalDistance += current.g;
        break;
      }

      closedSet.push(current);

      const neighbors = generateNeighbors(current.location, segmentEnd);

      for (const neighborLoc of neighbors) {
        if (closedSet.some(n =>
          Math.abs(n.location.lat - neighborLoc.lat) < 0.0001 &&
          Math.abs(n.location.lng - neighborLoc.lng) < 0.0001
        )) {
          continue;
        }

        const gScore = current.g + haversineDistance(current.location, neighborLoc);
        const hScore = haversineDistance(neighborLoc, segmentEnd);

        const existingNode = openSet.find(n =>
          Math.abs(n.location.lat - neighborLoc.lat) < 0.0001 &&
          Math.abs(n.location.lng - neighborLoc.lng) < 0.0001
        );

        if (existingNode && gScore >= existingNode.g) {
          continue;
        }

        const neighborNode: PathNode = {
          location: neighborLoc,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current,
        };

        if (existingNode) {
          const index = openSet.indexOf(existingNode);
          openSet[index] = neighborNode;
        } else {
          openSet.push(neighborNode);
        }
      }

      if (openSet.length === 0) {
        path.push(segmentStart);
        path.push(segmentEnd);
        totalDistance += haversineDistance(segmentStart, segmentEnd);
        break;
      }
    }
  }

  return { path: path.reverse(), totalDistance };
}

function generateNeighbors(current: Location, goal: Location): Location[] {
  const step = 0.01;
  const neighbors: Location[] = [];

  const directionLat = goal.lat > current.lat ? 1 : -1;
  const directionLng = goal.lng > current.lng ? 1 : -1;

  neighbors.push({ lat: current.lat + step * directionLat, lng: current.lng });
  neighbors.push({ lat: current.lat, lng: current.lng + step * directionLng });
  neighbors.push({
    lat: current.lat + step * directionLat,
    lng: current.lng + step * directionLng
  });

  return neighbors;
}

export function findNearbyRides(
  userLocation: Location,
  rides: Array<{ pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number; id: string }>,
  maxDistanceKm: number = 5
): Array<{ ride: typeof rides[0]; distance: number }> {
  const nearbyRides = rides
    .map(ride => ({
      ride,
      distance: haversineDistance(userLocation, {
        lat: ride.pickup_lat,
        lng: ride.pickup_lng
      }),
    }))
    .filter(item => item.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance);

  return nearbyRides;
}

export function calculatePrice(distanceKm: number, vehicleType: string): number {
  const baseFare = 2.5;
  let pricePerKm = 1.2;

  switch (vehicleType) {
    case 'economy':
      pricePerKm = 1.0;
      break;
    case 'comfort':
      pricePerKm = 1.5;
      break;
    case 'premium':
      pricePerKm = 2.5;
      break;
    default:
      pricePerKm = 1.2;
  }

  return parseFloat((baseFare + distanceKm * pricePerKm).toFixed(2));
}
