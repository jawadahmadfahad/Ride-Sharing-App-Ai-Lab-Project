import { useState, useEffect } from 'react';
import { Ride } from '../lib/supabase';
import { getAvailableRides, findMatchingRides, getRecommendedRides } from '../services/rideService';
import { Location } from '../algorithms/astar';
import RideCard from './RideCard';
import { Loader2, Search, Brain, Sparkles } from 'lucide-react';

interface RideListProps {
  userLocation?: Location;
  destination?: Location;
  onAcceptRide?: (rideId: string) => void;
  showAcceptButton?: boolean;
  userId?: string;
}

export default function RideList({
  userLocation,
  destination,
  onAcceptRide,
  showAcceptButton = false,
  userId,
}: RideListProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [matchedRides, setMatchedRides] = useState<
    Array<{ ride: Ride; pickupDistance: number; matchScore: number }>
  >([]);
  const [recommendedRides, setRecommendedRides] = useState<
    Array<Ride & { recommendationScore: number; reasoning: string[] }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'matched' | 'recommended'>('all');

  useEffect(() => {
    loadRides();
  }, [userLocation, destination, viewMode]);

  const loadRides = async () => {
    setLoading(true);
    try {
      if (viewMode === 'recommended' && userLocation && destination && userId) {
        const recommendations = await getRecommendedRides(userLocation, destination, userId);
        setRecommendedRides(recommendations);
      } else if (viewMode === 'matched' && userLocation && destination) {
        const matches = await findMatchingRides(userLocation, destination);
        setMatchedRides(matches);
      } else {
        const availableRides = await getAvailableRides();
        setRides(availableRides);
      }
    } catch (error) {
      console.error('Error loading rides:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const hasLocationData = userLocation && destination;

  return (
    <div>
      {hasLocationData && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Search className="w-4 h-4" />
              All Rides
            </button>
            
            <button
              onClick={() => setViewMode('matched')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'matched'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Search className="w-4 h-4" />
              Best Matches
            </button>

            {userId && (
              <button
                onClick={() => setViewMode('recommended')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'recommended'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Brain className="w-4 h-4" />
                AI Recommended
                <Sparkles className="w-3 h-3" />
              </button>
            )}
          </div>

          {viewMode === 'recommended' && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-purple-900">
                <Brain className="w-4 h-4" />
                <span className="font-medium">AI-Powered Recommendations</span>
              </div>
              <p className="text-xs text-purple-700 mt-1">
                Using hybrid reasoning: pattern learning + user preferences + collaborative filtering
              </p>
            </div>
          )}

          <button
            onClick={loadRides}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Refresh
          </button>
        </div>
      )}

      {viewMode === 'matched' && matchedRides.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No matching rides found</p>
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting your pickup or dropoff location
          </p>
        </div>
      )}

      {viewMode === 'recommended' && recommendedRides.length === 0 && (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No recommendations available yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Take a few rides to build your preference profile
          </p>
        </div>
      )}

      {viewMode === 'all' && rides.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No available rides</p>
        </div>
      )}

      <div className="space-y-4">
        {viewMode === 'recommended' && recommendedRides.map((ride) => (
          <div key={ride.id} className="relative">
            <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              {ride.recommendationScore.toFixed(0)}% Match
            </div>
            <RideCard
              ride={ride}
              onAccept={onAcceptRide}
              showAcceptButton={showAcceptButton}
            />
            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Why this ride?
              </div>
              <ul className="text-xs text-purple-700 space-y-1">
                {ride.reasoning.map((reason, idx) => (
                  <li key={idx}>• {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {viewMode === 'matched' && matchedRides.map(({ ride, pickupDistance, matchScore }) => (
          <div key={ride.id} className="relative">
            <div className="absolute -top-2 -right-2 z-10 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              {matchScore.toFixed(0)}% Match
            </div>
            <RideCard
              ride={ride}
              onAccept={onAcceptRide}
              showAcceptButton={showAcceptButton}
            />
            <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
              <span>📍 {pickupDistance.toFixed(1)} km from pickup</span>
            </div>
          </div>
        ))}

        {viewMode === 'all' && rides.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            onAccept={onAcceptRide}
            showAcceptButton={showAcceptButton}
          />
        ))}
      </div>
    </div>
  );
}
