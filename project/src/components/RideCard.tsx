import { Car, MapPin, Clock, DollarSign, Star, User } from 'lucide-react';
import { Ride } from '../lib/supabase';

interface RideCardProps {
  ride: Ride;
  pickupDistance?: number;
  matchScore?: number;
  onAccept?: (rideId: string) => void;
  showAcceptButton?: boolean;
}

export default function RideCard({
  ride,
  pickupDistance,
  matchScore,
  onAccept,
  showAcceptButton = false,
}: RideCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            {ride.driver?.avatar_url ? (
              <img
                src={ride.driver.avatar_url}
                alt={ride.driver.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {ride.driver?.full_name || 'Driver'}
            </h3>
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-gray-700">{ride.driver?.rating.toFixed(1)}</span>
              <span className="text-gray-400">
                ({ride.driver?.total_rides} rides)
              </span>
            </div>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
            ride.status
          )}`}
        >
          {ride.status}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">Pickup</p>
            <p className="text-gray-900 truncate">{ride.pickup_address}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">Dropoff</p>
            <p className="text-gray-900 truncate">{ride.dropoff_address}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Car className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 capitalize">{ride.vehicle_type}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{ride.estimated_duration_min} min</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{ride.distance_km.toFixed(1)} km</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">${ride.price}</div>
        </div>
      </div>

      {pickupDistance !== undefined && (
        <div className="mt-3 text-sm text-gray-500">
          📍 {pickupDistance.toFixed(2)} km away from you
        </div>
      )}

      {matchScore !== undefined && matchScore > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Match Score</span>
            <span className="font-semibold text-green-600">
              {matchScore.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(matchScore, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {showAcceptButton && ride.status === 'available' && onAccept && (
        <button
          onClick={() => onAccept(ride.id)}
          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02]"
        >
          Accept Ride
        </button>
      )}
    </div>
  );
}
