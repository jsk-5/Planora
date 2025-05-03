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
}

export const searchCities = async (params: SearchParams) => {
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
