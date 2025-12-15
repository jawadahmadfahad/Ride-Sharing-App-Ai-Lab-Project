import { supabase, Ride, RideRequest } from '../lib/supabase';
import {
  Location,
  haversineDistance,
  astarPathfinding,
  calculateEstimatedDuration,
  findNearbyRides,
  calculatePrice,
} from '../algorithms/astar';
import { getShortestRoute } from './routing';
import {
  hybridRecommendation,
  UserProfile,
  deductiveFiltering,
  inductiveScoring,
  contentBasedFiltering,
  collaborativeFiltering,
} from '../algorithms/recommendations';

export interface CreateRideParams {
  driverId: string;
  pickup: Location & { address: string };
  dropoff: Location & { address: string };
  vehicleType: string;
  seatsAvailable: number;
}

export interface CreateRideRequestParams {
  passengerId: string;
  pickup: Location & { address: string };
  dropoff: Location & { address: string };
  maxPrice: number;
}

export async function createRide(params: CreateRideParams) {
  const { pickup, dropoff, driverId, vehicleType, seatsAvailable } = params;

  // Use the shortest route algorithm with real road data
  const routeResult = await getShortestRoute(
    { lat: pickup.lat, lng: pickup.lng },
    { lat: dropoff.lat, lng: dropoff.lng }
  );

  const totalDistance = routeResult.totalDistance;
  const estimatedDuration = routeResult.duration;
  const price = calculatePrice(totalDistance, vehicleType);

  const { data, error } = await supabase
    .from('rides')
    .insert({
      driver_id: driverId,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      pickup_address: pickup.address,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
      dropoff_address: dropoff.address,
      distance_km: totalDistance,
      estimated_duration_min: estimatedDuration,
      price,
      vehicle_type: vehicleType,
      seats_available: seatsAvailable,
      status: 'available',
    })
    .select()
    .single();

  if (error) throw error;
  return { ride: data, path: routeResult.path };
}

export async function getAvailableRides() {
  const { data, error } = await supabase
    .from('rides')
    .select(`
      *,
      driver:profiles!driver_id(*)
    `)
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Ride[];
}

export async function findMatchingRides(
  userLocation: Location,
  destination: Location,
  maxDistanceKm: number = 5
) {
  const availableRides = await getAvailableRides();

  const ridesWithinPickupRange = findNearbyRides(
    userLocation,
    availableRides,
    maxDistanceKm
  );

  const matchedRides = ridesWithinPickupRange.map(({ ride, distance }) => {
    const dropoffDistance = haversineDistance(destination, {
      lat: ride.dropoff_lat,
      lng: ride.dropoff_lng,
    });

    const { totalDistance } = astarPathfinding(
      userLocation,
      destination
    );

    const routeDeviation = Math.abs(totalDistance - ride.distance_km);
    const matchScore = 100 - (distance * 10 + dropoffDistance * 5 + routeDeviation * 3);

    return {
      ride,
      pickupDistance: distance,
      dropoffDistance,
      matchScore: Math.max(0, matchScore),
    };
  });

  return matchedRides
    .filter(m => m.matchScore > 30)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * INTELLIGENT RIDE RECOMMENDATIONS
 * Uses hybrid deductive + inductive reasoning
 */
export async function getRecommendedRides(
  userLocation: Location,
  destination: Location,
  userId: string
) {
  // Get available rides
  const availableRides = await getAvailableRides();

  if (availableRides.length === 0) {
    return [];
  }

  try {
    // Get user profile and history
    const userProfile = await getUserProfile(userId);

    // Get all users for collaborative filtering (limited for performance)
    const allUsers = await getAllUserProfiles(20);

    // Apply hybrid recommendation system
    const recommendations = hybridRecommendation(
      availableRides as any,
      userProfile,
      userLocation,
      destination,
      allUsers
    );

    return recommendations;
  } catch (error) {
    console.error('Recommendation error:', error);
    // Fallback to basic matching if recommendations fail
    const matches = await findMatchingRides(userLocation, destination);
    return matches.map(m => ({
      ...m.ride,
      recommendationScore: m.matchScore,
      reasoning: [
        `Distance Match: ${m.matchScore.toFixed(0)}/100`,
        `${m.pickupDistance.toFixed(1)} km from your location`,
        '⚠️ Using basic matching (recommendations unavailable)',
      ],
    }));
  }
}

/**
 * Get user profile with ride history for recommendations
 */
async function getUserProfile(userId: string): Promise<UserProfile> {
  try {
    // Fetch user's ride history
    const { data: rides } = await supabase
      .from('rides')
      .select('*')
      .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch user preferences (if you have a preferences table)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Build user profile
    const rideHistory = (rides || []).map(ride => ({
      pickup: { lat: ride.pickup_lat, lng: ride.pickup_lng },
      dropoff: { lat: ride.dropoff_lat, lng: ride.dropoff_lng },
      timestamp: new Date(ride.created_at),
      price: ride.price || 0,
      vehicleType: ride.vehicle_type || 'economy',
      rating: 4, // Default, should fetch from ratings table
      timeOfDay: getTimeOfDay(new Date(ride.created_at).getHours()),
      dayOfWeek: new Date(ride.created_at).getDay(),
    }));

    return {
      id: userId,
      rideHistory,
      preferences: {
        preferredVehicleTypes: profile?.preferred_vehicle_types || ['economy', 'comfort'],
        maxPrice: profile?.max_price || 1000,
        preferredDriverRatings: profile?.min_driver_rating || 4.0,
        smokingPreference: profile?.smoking_preference || false,
        musicPreference: profile?.music_preference || true,
        conversationPreference: profile?.conversation_preference || 'moderate',
      },
      ratings: [], // Should fetch from ratings table
      frequentLocations: [], // Could be computed from history
    };
  } catch (error) {
    console.error('Error loading user profile:', error);
    // Return default profile if there's an error
    return {
      id: userId,
      rideHistory: [],
      preferences: {
        preferredVehicleTypes: ['economy', 'comfort', 'premium'],
        maxPrice: 1000,
        preferredDriverRatings: 4.0,
        smokingPreference: false,
        musicPreference: true,
        conversationPreference: 'moderate',
      },
      ratings: [],
      frequentLocations: [],
    };
  }
}

async function getAllUserProfiles(limit: number = 20): Promise<UserProfile[]> {
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .limit(limit);

  if (!users) return [];

  const profiles = await Promise.all(
    users.map(user => getUserProfile(user.id).catch(() => null))
  );

  return profiles.filter(p => p !== null) as UserProfile[];
}

function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export async function createRideRequest(params: CreateRideRequestParams) {
  const { data, error } = await supabase
    .from('ride_requests')
    .insert({
      passenger_id: params.passengerId,
      pickup_lat: params.pickup.lat,
      pickup_lng: params.pickup.lng,
      pickup_address: params.pickup.address,
      dropoff_lat: params.dropoff.lat,
      dropoff_lng: params.dropoff.lng,
      dropoff_address: params.dropoff.address,
      max_price: params.maxPrice,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as RideRequest;
}

export async function acceptRide(rideId: string, passengerId: string) {
  const { data, error } = await supabase
    .from('rides')
    .update({
      passenger_id: passengerId,
      status: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rideId)
    .eq('status', 'available')
    .select()
    .single();

  if (error) throw error;
  return data as Ride;
}

export async function updateRideStatus(
  rideId: string,
  status: Ride['status'],
  currentLocation?: Location
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (currentLocation) {
    updateData.current_lat = currentLocation.lat;
    updateData.current_lng = currentLocation.lng;
  }

  const { data, error } = await supabase
    .from('rides')
    .update(updateData)
    .eq('id', rideId)
    .select()
    .single();

  if (error) throw error;
  return data as Ride;
}

export async function getUserRides(userId: string) {
  const { data, error } = await supabase
    .from('rides')
    .select(`
      *,
      driver:profiles!driver_id(*),
      passenger:profiles!passenger_id(*)
    `)
    .or(`driver_id.eq.${userId},passenger_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Ride[];
}

export function subscribeToRideUpdates(
  rideId: string,
  callback: (ride: Ride) => void
) {
  return supabase
    .channel(`ride:${rideId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${rideId}`,
      },
      (payload) => {
        callback(payload.new as Ride);
      }
    )
    .subscribe();
}
