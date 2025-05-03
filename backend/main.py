
from fastapi import FastAPI,Query
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import serpapi
import os
import json


load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)
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

@app.get("/api/search")
async def city_finder(message) -> dict[str, list]:
    response = client.responses.create(
        model="gpt-4.1",
        instructions=""" 
            #Identity
            You are an assistant travel planner, and you are trying to find best places to send you customers.
            To find the best places you need to check on the weather and situations of countries given the input

            # Instructions

            Seach the web and you knowledge to suggest the best countries
            Your answers should only be the name of the best cities selected. You cannot say anything else apart from the names and the IATA codes.
            Each names and iata code should be separated with a comma.
            you can only mention 6 cities per answer

            # Examples

            <user_query>
            {"tags":["Beach","Party","Sun"],"costPerPerson":1000,"startDate":"May 14, 2025","endDate":"May 20, 2025"}
            </user_query>

            <assistant_response>
            lisbon IATA_CODE, porto IATA_CODE, barcelona IATA_CODE, bordeux IATA_CODE, palermo IATA_CODE, tunis IATA_CODE
            </assistant_response>""", 
        input= message
    ) 
    cities = response.output_text.split(",")
    cities_list = [(city.strip().split()[0], city.strip().split()[1]) for city in cities]
    

    return { "result" : cities_list}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 