import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { searchPlaces, reverseGeocode, NominatimPlace } from '../services/nominatimService';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React-Leaflet
// This resolves the issue with webpack not loading marker icons correctly
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialAddress?: string;
  radiusKm?: number;
  onLocationChange: (latitude: number, longitude: number, address: string) => void;
}

// Component to handle map click events
const MapClickHandler: React.FC<{
  onLocationSelect: (lat: number, lng: number) => void;
}> = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLatitude = 0,
  initialLongitude = 0,
  initialAddress = '',
  radiusKm = 0,
  onLocationChange,
}) => {
  const [position, setPosition] = useState<[number, number]>([
    initialLatitude,
    initialLongitude,
  ]);
  const [address, setAddress] = useState<string>(initialAddress);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<NominatimPlace[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<any>(null);

  // Handle location selection (from map click or search)
  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng]);

    // Reverse geocode to get address
    const fetchedAddress = await reverseGeocode(lat, lng);
    setAddress(fetchedAddress);
    onLocationChange(lat, lng, fetchedAddress);
  };

  // Handle search input change with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search to respect Nominatim rate limits (1 req/sec)
    searchTimeoutRef.current = setTimeout(async () => {
      if (query.trim().length >= 3) {
        setIsSearching(true);
        const results = await searchPlaces(query);
        setSearchResults(results);
        setShowResults(true);
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 1000); // 1 second debounce
  };

  // Handle selecting a search result
  const handleResultSelect = (place: NominatimPlace) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    setPosition([lat, lng]);
    setAddress(place.display_name);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);

    onLocationChange(lat, lng, place.display_name);

    // Pan map to selected location
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 13);
    }
  };

  // Handle getting current location from browser
  const handleGetCurrentLocation = () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setPosition([lat, lng]);

        // Reverse geocode to get address
        const fetchedAddress = await reverseGeocode(lat, lng);
        setAddress(fetchedAddress);
        onLocationChange(lat, lng, fetchedAddress);

        // Pan map to current location
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        }

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access in your browser.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out.');
            break;
          default:
            setLocationError('An unknown error occurred while getting location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Update position when initial props change
  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      setPosition([initialLatitude, initialLongitude]);
    }
  }, [initialLatitude, initialLongitude]);

  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
    }
  }, [initialAddress]);

  return (
    <div style={{ width: '100%' }}>
      {/* Get Current Location Button */}
      <div style={{ marginBottom: '10px' }}>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: isLocating ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLocating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isLocating) {
              e.currentTarget.style.backgroundColor = '#218838';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLocating) {
              e.currentTarget.style.backgroundColor = '#28a745';
            }
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="12" y1="2" x2="12" y2="4"></line>
            <line x1="12" y1="20" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="4" y2="12"></line>
            <line x1="20" y1="12" x2="22" y2="12"></line>
          </svg>
          {isLocating ? 'Getting your location...' : 'Use My Current Location'}
        </button>
      </div>

      {/* Location Error Message */}
      {locationError && (
        <div
          style={{
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {locationError}
        </div>
      )}

      {/* Search Input */}
      <div style={{ marginBottom: '10px', position: 'relative' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Or search for an address or place..."
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {searchResults.map((place) => (
              <div
                key={place.place_id}
                onClick={() => handleResultSelect(place)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: '14px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                {place.display_name}
              </div>
            ))}
          </div>
        )}

        {isSearching && (
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            Searching...
          </div>
        )}
      </div>

      {/* Map Container */}
      <div style={{ height: '400px', width: '100%', marginBottom: '10px' }}>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marker at selected position */}
          <Marker position={position} />

          {/* Radius circle if provided */}
          {radiusKm > 0 && (
            <Circle
              center={position}
              radius={radiusKm * 1000} // Convert km to meters
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
              }}
            />
          )}

          {/* Map click handler */}
          <MapClickHandler onLocationSelect={handleLocationSelect} />
        </MapContainer>
      </div>

      {/* Current Location Display */}
      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
          <strong>Selected Location:</strong>
        </div>
        <div style={{ fontSize: '14px', marginBottom: '5px' }}>
          {address || 'Click on the map or search for a location'}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
        Tip: Use your current location, search for an address, or click anywhere on the map
      </div>
    </div>
  );
};

export default LocationPicker;
