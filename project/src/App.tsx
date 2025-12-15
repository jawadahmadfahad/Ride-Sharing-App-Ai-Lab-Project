import { useState, useEffect } from 'react';
import { Car, User, LogOut, Plus, Search as SearchIcon } from 'lucide-react';
import { supabase } from './lib/supabase';
import { createRide, acceptRide } from './services/rideService';
import { Location } from './algorithms/astar';
import { getShortestRoute } from './services/routing';
import CreateRideForm from './components/CreateRideForm';
import SearchRideForm from './components/SearchRideForm';
import RideList from './components/RideList';
import MapView from './components/MapView';

type ViewMode = 'search' | 'create' | 'myRides';

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchData, setSearchData] = useState<{
    pickup: Location & { address: string };
    dropoff: Location & { address: string };
  } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<{
    pickup: Location & { address: string };
    dropoff: Location & { address: string };
    path?: Location[];
  } | null>(null);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        (async () => {
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadProfile(session.user.id);
          } else {
            setProfile(null);
          }
        })();
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      await loadProfile(session.user.id);
    }
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    setProfile(data);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        }
      }
    });

    if (error) {
      alert('Sign up error: ' + error.message);
      return;
    }

    if (data.user) {
      // Wait a moment for auth to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        phone: phone,
      });
      
      if (profileError) {
        alert('Database error saving new user: ' + profileError.message + '\n\nPlease make sure you ran the SQL to create tables in Supabase.');
        console.error('Profile creation error:', profileError);
        return;
      }
      
      alert('Account created successfully! Please sign in.');
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCreateRide = async (data: {
    pickup: Location & { address: string };
    dropoff: Location & { address: string };
    vehicleType: string;
    seatsAvailable: number;
  }) => {
    if (!user) return;

    try {
      setCalculatingRoute(true);
      const result = await createRide({
        driverId: user.id,
        pickup: data.pickup,
        dropoff: data.dropoff,
        vehicleType: data.vehicleType,
        seatsAvailable: data.seatsAvailable,
      });

      setSelectedRoute({
        pickup: data.pickup,
        dropoff: data.dropoff,
        path: result.path,
      });

      alert('Ride created successfully with shortest route!');
      setViewMode('search');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleSearchRides = async (data: {
    pickup: Location & { address: string };
    dropoff: Location & { address: string };
  }) => {
    setSearchData(data);
    
    try {
      setCalculatingRoute(true);
      // Calculate shortest route for the search using A* algorithm
      const routeResult = await getShortestRoute(
        { lat: data.pickup.lat, lng: data.pickup.lng },
        { lat: data.dropoff.lat, lng: data.dropoff.lng }
      );
      
      setSelectedRoute({
        pickup: data.pickup,
        dropoff: data.dropoff,
        path: routeResult.path,
      });
    } catch (error) {
      console.error('Route calculation error:', error);
      // Fallback to simple route
      setSelectedRoute({
        pickup: data.pickup,
        dropoff: data.dropoff,
      });
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    if (!user) return;

    try {
      await acceptRide(rideId, user.id);
      alert('Ride accepted successfully!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-4 rounded-2xl">
                <Car className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">RideShare</h1>
            <p className="text-gray-600">Smart ride matching with AI pathfinding</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sign Up</h2>
                <form onSubmit={handleSignUp} className="space-y-3">
                  <input
                    name="fullName"
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
                  >
                    Sign Up
                  </button>
                </form>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sign In</h2>
                <form onSubmit={handleSignIn} className="space-y-3">
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-gray-800 text-white font-semibold py-2 rounded-lg hover:bg-gray-900 transition-all"
                  >
                    Sign In
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                <Car className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">RideShare</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {profile?.full_name}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setViewMode('search')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'search'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SearchIcon className="w-5 h-5" />
            Find Rides
          </button>
          <button
            onClick={() => setViewMode('create')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'create'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Plus className="w-5 h-5" />
            Offer Ride
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            {viewMode === 'search' && (
              <div className="space-y-6">
                <SearchRideForm onSearch={handleSearchRides} loading={calculatingRoute} />
                {calculatingRoute && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-blue-900 font-medium">Calculating shortest route using A* algorithm...</span>
                  </div>
                )}
                {searchData && (
                  <RideList
                    userLocation={searchData.pickup}
                    destination={searchData.dropoff}
                    onAcceptRide={handleAcceptRide}
                    showAcceptButton={true}
                    userId={user?.id}
                  />
                )}
                {!searchData && <RideList userId={user?.id} />}
              </div>
            )}

            {viewMode === 'create' && (
              <div className="space-y-6">
                <CreateRideForm onSubmit={handleCreateRide} loading={calculatingRoute} />
                {calculatingRoute && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-blue-900 font-medium">Calculating shortest route using A* algorithm...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            {selectedRoute && (
              <MapView
                pickup={selectedRoute.pickup}
                dropoff={selectedRoute.dropoff}
                path={selectedRoute.path}
              />
            )}
            {!selectedRoute && (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Search for rides or create a new ride to see the route
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
