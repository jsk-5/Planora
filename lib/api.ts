import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const healthCheck = async () => {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    console.error("Health check failed:", error);
    throw error;
  }
};

interface SearchParams {
  tags: string[];
  costPerPerson: number;
  startDate: string;
  endDate: string;
  departureAirport?: string;
}

// Define types for flight data
interface FlightInfo {
  type: string;
  airline: string;
  airline_logo?: string;
  price: number;
  departure: {
    airport: string;
    time: string;
    iata_code: string;
  };
  arrival: {
    airport: string;
    time: string;
    iata_code: string;
  };
  duration_minutes: number;
  duration_formatted: string;
  flight_number: string;
  aircraft: string;
  departure_token: string;
  carbon_emissions_kg: number;
}

interface CityData {
  city_name: string;
  city_iata: string;
  flight_info: FlightInfo | null;
  return_flight_info: FlightInfo | null;
}

interface ApiResponse {
  cities: CityData[];
}

export const searchCities = async (
  params: SearchParams
): Promise<ApiResponse> => {
  try {
    const message = encodeURIComponent(JSON.stringify(params));
    const response = await api.get(`/search?message=${message}`);
    return response.data;
  } catch (error) {
    console.log(params);
    console.error("ChatGPT is Tweaking fr:", error);
    throw error;
  }
};

export default api;
