from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import serpapi
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Backend is running"}



@app.get("/api/flights")
async def get_flights(
    departure_id: str = Query(..., description="Departure airport code"),
    arrival_id: str = Query(..., description="Arrival airport code")
):
    params = {
        "engine": "google_flights",
        "hl": "en",
        "gl": "uk",
        "departure_id": departure_id,
        "arrival_id": arrival_id,
        "outbound_date": "2025-05-04",
        "return_date": "2025-05-10",
        "currency": "GBP",
    }
    client = serpapi.Client(api_key=os.getenv("SERPAPI_API_KEY"))
    results = client.search(params)
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 