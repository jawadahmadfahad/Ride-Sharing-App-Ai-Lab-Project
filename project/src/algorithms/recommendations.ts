import { Location, haversineDistance } from './astar';

export interface UserProfile {
  id: string;
  rideHistory: RideHistory[];
  preferences: UserPreferences;
  ratings: number[];
  frequentLocations: Location[];
}

export interface RideHistory {
  pickup: Location;
  dropoff: Location;
  timestamp: Date;
  price: number;
  vehicleType: string;
  rating: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
}

export interface UserPreferences {
  preferredVehicleTypes: string[];
  maxPrice: number;
  preferredDriverRatings: number;
  smokingPreference: boolean;
  musicPreference: boolean;
  conversationPreference: 'quiet' | 'moderate' | 'chatty';
}

export interface Driver {
  id: string;
  rating: number;
  totalRides: number;
  vehicleType: string;
  preferences: {
    smokingAllowed: boolean;
    musicPlaying: boolean;
    conversationLevel: 'quiet' | 'moderate' | 'chatty';
  };
  rideHistory: RideHistory[];
}

export interface Ride {
  id: string;
  driver: Driver;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  price: number;
  vehicle_type: string;
  distance_km: number;
  estimated_duration_min: number;
}

/**
 * DEDUCTIVE REASONING: Rule-based filtering using logical inference
 * Uses predefined rules and constraints to eliminate unsuitable rides
 */
export function deductiveFiltering(
  rides: Ride[],
  userProfile: UserProfile,
  userLocation: Location,
  destination: Location
): Ride[] {
  return rides.filter(ride => {
    // Rule 1: Price constraint (hard rule)
    if (ride.price > userProfile.preferences.maxPrice) {
      return false;
    }

    // Rule 2: Driver rating threshold (logical rule)
    if (ride.driver.rating < userProfile.preferences.preferredDriverRatings) {
      return false;
    }

    // Rule 3: Vehicle type preference (strict rule)
    if (
      userProfile.preferences.preferredVehicleTypes.length > 0 &&
      !userProfile.preferences.preferredVehicleTypes.includes(ride.vehicle_type)
    ) {
      return false;
    }

    // Rule 4: Preference compatibility (logical inference)
    if (
      userProfile.preferences.smokingPreference !== ride.driver.preferences.smokingAllowed
    ) {
      return false;
    }

    // Rule 5: Distance feasibility (geometric rule)
    const pickupDistance = haversineDistance(userLocation, {
      lat: ride.pickup_lat,
      lng: ride.pickup_lng,
    });
    if (pickupDistance > 5) {
      // More than 5km away
      return false;
    }

    return true;
  });
}

/**
 * INDUCTIVE REASONING: Pattern recognition and learning from historical data
 * Discovers patterns from past behavior to predict future preferences
 */
export function inductiveScoring(
  ride: Ride,
  userProfile: UserProfile,
  userLocation: Location,
  destination: Location
): number {
  let score = 0;

  // Pattern 1: Frequent route similarity (learn from history)
  const routeSimilarityScore = calculateRouteSimilarity(
    { lat: ride.pickup_lat, lng: ride.pickup_lng },
    { lat: ride.dropoff_lat, lng: ride.dropoff_lng },
    userProfile.rideHistory
  );
  score += routeSimilarityScore * 30;

  // Pattern 2: Time-based preference learning
  const currentHour = new Date().getHours();
  const timePreferenceScore = calculateTimePreference(
    currentHour,
    ride.vehicle_type,
    userProfile.rideHistory
  );
  score += timePreferenceScore * 20;

  // Pattern 3: Price pattern learning (infer price sensitivity)
  const pricePattern = inferPriceSensitivity(ride.price, userProfile.rideHistory);
  score += pricePattern * 15;

  // Pattern 4: Driver compatibility based on past ratings
  const driverCompatibilityScore = predictDriverCompatibility(
    ride.driver,
    userProfile
  );
  score += driverCompatibilityScore * 25;

  // Pattern 5: Proximity pattern (closer pickups preferred historically?)
  const proximityScore = calculateProximityPreference(
    userLocation,
    { lat: ride.pickup_lat, lng: ride.pickup_lng },
    userProfile.rideHistory
  );
  score += proximityScore * 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * COLLABORATIVE FILTERING: Learn from similar users
 * Inductive approach using user-user similarity
 */
export function collaborativeFiltering(
  ride: Ride,
  userProfile: UserProfile,
  allUsers: UserProfile[]
): number {
  // Find similar users based on ride history
  const similarUsers = findSimilarUsers(userProfile, allUsers);

  if (similarUsers.length === 0) return 50; // Neutral score

  let totalScore = 0;
  let weightSum = 0;

  similarUsers.forEach(({ user, similarity }) => {
    // Check if similar users liked similar rides
    const userLikedSimilarRides = user.rideHistory.filter(
      history =>
        history.vehicleType === ride.vehicle_type &&
        history.rating >= 4 &&
        Math.abs(history.price - ride.price) < ride.price * 0.2
    ).length;

    const likeScore = (userLikedSimilarRides / user.rideHistory.length) * 100;
    totalScore += likeScore * similarity;
    weightSum += similarity;
  });

  return weightSum > 0 ? totalScore / weightSum : 50;
}

/**
 * CONTENT-BASED FILTERING: Learn from user's own preferences
 * Inductive approach using item-item similarity
 */
export function contentBasedFiltering(
  ride: Ride,
  userProfile: UserProfile
): number {
  if (userProfile.rideHistory.length === 0) return 50;

  let score = 0;
  const weights = {
    vehicleType: 0.3,
    priceRange: 0.25,
    distance: 0.2,
    rating: 0.25,
  };

  // Vehicle type preference from history
  const vehicleTypeMatches = userProfile.rideHistory.filter(
    h => h.vehicleType === ride.vehicle_type && h.rating >= 4
  ).length;
  score +=
    (vehicleTypeMatches / userProfile.rideHistory.length) * 100 * weights.vehicleType;

  // Price range preference
  const avgPrice =
    userProfile.rideHistory.reduce((sum, h) => sum + h.price, 0) /
    userProfile.rideHistory.length;
  const priceDiff = Math.abs(ride.price - avgPrice) / avgPrice;
  score += Math.max(0, (1 - priceDiff) * 100) * weights.priceRange;

  // Distance preference
  const avgDistance =
    userProfile.rideHistory.reduce((sum, h) => {
      const dist = haversineDistance(h.pickup, h.dropoff);
      return sum + dist;
    }, 0) / userProfile.rideHistory.length;
  const distDiff = Math.abs(ride.distance_km - avgDistance) / avgDistance;
  score += Math.max(0, (1 - distDiff) * 100) * weights.distance;

  // Driver rating alignment
  const avgPreferredRating =
    userProfile.ratings.reduce((a, b) => a + b, 0) / userProfile.ratings.length;
  const ratingAlignment = (ride.driver.rating / avgPreferredRating) * 100;
  score += Math.min(100, ratingAlignment) * weights.rating;

  return Math.min(100, score);
}

/**
 * HYBRID RECOMMENDATION SYSTEM
 * Combines deductive (rule-based) and inductive (learning-based) approaches
 */
export function hybridRecommendation(
  rides: Ride[],
  userProfile: UserProfile,
  userLocation: Location,
  destination: Location,
  allUsers?: UserProfile[]
): Array<Ride & { recommendationScore: number; reasoning: string[] }> {
  // STEP 1: DEDUCTIVE FILTERING (eliminate unsuitable rides)
  const filteredRides = deductiveFiltering(
    rides,
    userProfile,
    userLocation,
    destination
  );

  // STEP 2: INDUCTIVE SCORING (learn patterns and score remaining rides)
  const scoredRides = filteredRides.map(ride => {
    const reasoning: string[] = [];

    // Inductive pattern recognition
    const inductiveScore = inductiveScoring(ride, userProfile, userLocation, destination);
    reasoning.push(`Pattern Analysis: ${inductiveScore.toFixed(1)}/100`);

    // Content-based filtering
    const contentScore = contentBasedFiltering(ride, userProfile);
    reasoning.push(`Personal History Match: ${contentScore.toFixed(1)}/100`);

    // Collaborative filtering (if other users available)
    let collaborativeScore = 50;
    if (allUsers && allUsers.length > 0) {
      collaborativeScore = collaborativeFiltering(ride, userProfile, allUsers);
      reasoning.push(`Similar Users Preference: ${collaborativeScore.toFixed(1)}/100`);
    }

    // Combine scores with weights
    const finalScore =
      inductiveScore * 0.4 + contentScore * 0.35 + collaborativeScore * 0.25;

    // Add reasoning based on score
    if (finalScore >= 80) {
      reasoning.push('✅ Highly Recommended');
    } else if (finalScore >= 60) {
      reasoning.push('👍 Good Match');
    } else {
      reasoning.push('⚠️ Average Match');
    }

    return {
      ...ride,
      recommendationScore: finalScore,
      reasoning,
    };
  });

  // Sort by recommendation score
  return scoredRides.sort((a, b) => b.recommendationScore - a.recommendationScore);
}

// Helper functions for pattern recognition

function calculateRouteSimilarity(
  pickup: Location,
  dropoff: Location,
  history: RideHistory[]
): number {
  if (history.length === 0) return 0;

  const similarRoutes = history.filter(ride => {
    const pickupDist = haversineDistance(pickup, ride.pickup);
    const dropoffDist = haversineDistance(dropoff, ride.dropoff);
    return pickupDist < 1 && dropoffDist < 1; // Within 1km
  });

  const avgRating =
    similarRoutes.reduce((sum, r) => sum + r.rating, 0) / similarRoutes.length || 0;

  return (similarRoutes.length / history.length) * (avgRating / 5);
}

function calculateTimePreference(
  currentHour: number,
  vehicleType: string,
  history: RideHistory[]
): number {
  const timeOfDay = getTimeOfDay(currentHour);
  const relevantRides = history.filter(
    h => h.timeOfDay === timeOfDay && h.vehicleType === vehicleType
  );

  if (relevantRides.length === 0) return 0.5;

  const avgRating =
    relevantRides.reduce((sum, r) => sum + r.rating, 0) / relevantRides.length;
  return avgRating / 5;
}

function inferPriceSensitivity(price: number, history: RideHistory[]): number {
  if (history.length === 0) return 0.5;

  const avgPrice = history.reduce((sum, h) => sum + h.price, 0) / history.length;
  const priceDiff = Math.abs(price - avgPrice) / avgPrice;

  return Math.max(0, 1 - priceDiff);
}

function predictDriverCompatibility(
  driver: Driver,
  userProfile: UserProfile
): number {
  let score = 0;

  // Rating compatibility
  score += (driver.rating / 5) * 40;

  // Experience level
  const experienceScore = Math.min(1, driver.totalRides / 100) * 30;
  score += experienceScore;

  // Preference alignment
  if (
    driver.preferences.conversationLevel === userProfile.preferences.conversationPreference
  ) {
    score += 30;
  } else {
    score += 15;
  }

  return score;
}

function calculateProximityPreference(
  currentLocation: Location,
  pickupLocation: Location,
  history: RideHistory[]
): number {
  const distance = haversineDistance(currentLocation, pickupLocation);

  if (history.length === 0) {
    return Math.max(0, 1 - distance / 5); // Default: prefer closer
  }

  // Learn from history
  const avgPickupDistance =
    history.reduce((sum, h) => {
      return sum + haversineDistance(h.pickup, currentLocation);
    }, 0) / history.length;

  const similarityToHistory = 1 - Math.abs(distance - avgPickupDistance) / 5;
  return Math.max(0, similarityToHistory);
}

function findSimilarUsers(
  userProfile: UserProfile,
  allUsers: UserProfile[]
): Array<{ user: UserProfile; similarity: number }> {
  return allUsers
    .filter(u => u.id !== userProfile.id && u.rideHistory.length > 0)
    .map(user => ({
      user,
      similarity: calculateUserSimilarity(userProfile, user),
    }))
    .filter(({ similarity }) => similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10); // Top 10 similar users
}

function calculateUserSimilarity(user1: UserProfile, user2: UserProfile): number {
  let score = 0;

  // Vehicle type similarity
  const commonVehicles = user1.preferences.preferredVehicleTypes.filter(v =>
    user2.preferences.preferredVehicleTypes.includes(v)
  ).length;
  score += (commonVehicles / Math.max(user1.preferences.preferredVehicleTypes.length, 1)) * 0.3;

  // Price range similarity
  const priceDiff = Math.abs(user1.preferences.maxPrice - user2.preferences.maxPrice);
  score += Math.max(0, 1 - priceDiff / user1.preferences.maxPrice) * 0.3;

  // Preference similarity
  if (user1.preferences.smokingPreference === user2.preferences.smokingPreference) score += 0.2;
  if (user1.preferences.conversationPreference === user2.preferences.conversationPreference)
    score += 0.2;

  return score;
}

function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * REAL-TIME LEARNING: Update user profile based on ride feedback
 * Reinforcement learning approach
 */
export function updateUserProfile(
  userProfile: UserProfile,
  ride: Ride,
  rating: number,
  accepted: boolean
): UserProfile {
  const newHistory: RideHistory = {
    pickup: { lat: ride.pickup_lat, lng: ride.pickup_lng },
    dropoff: { lat: ride.dropoff_lat, lng: ride.dropoff_lng },
    timestamp: new Date(),
    price: ride.price,
    vehicleType: ride.vehicle_type,
    rating,
    timeOfDay: getTimeOfDay(new Date().getHours()),
    dayOfWeek: new Date().getDay(),
  };

  // Update preferences based on positive feedback
  if (accepted && rating >= 4) {
    if (!userProfile.preferences.preferredVehicleTypes.includes(ride.vehicle_type)) {
      userProfile.preferences.preferredVehicleTypes.push(ride.vehicle_type);
    }
  }

  return {
    ...userProfile,
    rideHistory: [...userProfile.rideHistory, newHistory],
    ratings: [...userProfile.ratings, rating],
  };
}
