import axios from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Custom User-Agent as required by Nominatim usage policy
const USER_AGENT = 'ServiceMarketplacePlatform/1.0';

export interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
}


//   Search for places by query string (geocoding)
//   @param query - Address or place name to search
//   @returns Array of matching places

export const searchPlaces = async (query: string): Promise<NominatimPlace[]> => {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 5,
      },
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
};


//   Reverse geocode coordinates to get address
//   @param latitude - Latitude coordinate
//   @param longitude - Longitude coordinate
//   @returns Address string

export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    return response.data.display_name || 'Unknown location';
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return 'Unknown location';
  }
};


//   Geocode address to coordinates
//   @param address - Address string to geocode
//   @returns GeocodeResult with coordinates and formatted address

export const geocodeAddress = async (
  address: string
): Promise<GeocodeResult | null> => {
  try {
    const places = await searchPlaces(address);

    if (places.length === 0) {
      return null;
    }

    const firstPlace = places[0];
    return {
      latitude: parseFloat(firstPlace.lat),
      longitude: parseFloat(firstPlace.lon),
      address: firstPlace.display_name,
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};


//   Format address from Nominatim address components
//   @param address - Nominatim address object
//   @returns Formatted address string

export const formatAddress = (address: NominatimPlace['address']): string => {
  if (!address) return 'Unknown location';

  const parts = [];

  if (address.road) parts.push(address.road);
  if (address.neighbourhood) parts.push(address.neighbourhood);
  if (address.suburb) parts.push(address.suburb);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postcode) parts.push(address.postcode);
  if (address.country) parts.push(address.country);

  return parts.join(', ');
};
