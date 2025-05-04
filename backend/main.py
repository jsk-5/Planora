from fastapi import FastAPI,Query
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import serpapi
import os
import json
import asyncio
from dummy_api_response import test_response

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://planora.vercel.app",  # Production frontend
        "https://planora-git-main.vercel.app",  # Vercel preview deployments
        "https://planora-*.vercel.app"  # Vercel branch deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root route for Vercel
@app.get("/")
async def root():
    return {"message": "Welcome to Planora API"}

def get_cheapest_flight(flight_data) -> dict:
    """
    Extracts the cheapest flight from Google Flights JSON data and returns a structured dict.
    
    Args:
        flight_data (dict): The parsed JSON data from Google Flights.
    
    Returns:
        dict: A structured dictionary with flight details.
              Returns None if no flights are found.
    """
    if not flight_data.get("other_flights"):
        return None

    # Find the cheapest flight
    cheapest_flight = min(flight_data["other_flights"], key=lambda x: x["price"])
    
    # Extract flight details
    flight_info = {
        "type": cheapest_flight["type"],
        "airline": cheapest_flight["flights"][0]["airline"],
        "airline_logo": cheapest_flight["airline_logo"],
        "price": cheapest_flight["price"],
        "departure": {
            "airport": cheapest_flight["flights"][0]["departure_airport"]["name"],
            "time": cheapest_flight["flights"][0]["departure_airport"]["time"],
            "iata_code": cheapest_flight["flights"][0]["departure_airport"]["id"],
        },
        "arrival": {
            "airport": cheapest_flight["flights"][0]["arrival_airport"]["name"],
            "time": cheapest_flight["flights"][0]["arrival_airport"]["time"],
            "iata_code": cheapest_flight["flights"][0]["arrival_airport"]["id"],
        },
        "duration_minutes": cheapest_flight["flights"][0]["duration"],
        "duration_formatted": f"{cheapest_flight['flights'][0]['duration'] // 60}h {cheapest_flight['flights'][0]['duration'] % 60}m",
        "flight_number": cheapest_flight["flights"][0]["flight_number"],
        "aircraft": cheapest_flight["flights"][0].get("airplane", "N/A"),
        "departure_token": cheapest_flight.get("departure_token", ""),
        "carbon_emissions_kg": cheapest_flight["carbon_emissions"]["this_flight"] / 1000,
    }
    
    return flight_info

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Backend is running"}


@app.get("/api/flights")
async def get_flights(**kwargs):
    """
    Flexible flight search function that handles different input combinations
    
    Can be used with:
    - Regular parameters: departure_id, arrival_id, outbound_date, return_date
    - Or with a single departure_token for direct links
    """
    # Base params
    params = {
        "engine": "google_flights",
        "hl": "en",
        "gl": "uk",
        "currency": "GBP",
        "deep_search ": True,
    }
    
    # Add kwargs to params
    for key, value in kwargs.items():
        params[key] = value
    
    # Validate params
    if "departure_token" not in params and not all(k in params for k in ["departure_id", "arrival_id", "outbound_date", "return_date"]):
        raise ValueError("Either provide departure_token OR (departure_id, arrival_id, outbound_date, return_date)")
    
    client = serpapi.Client(api_key=os.getenv("SERPAPI_API_KEY"))
    # results = client.search(params)
    
    
    return test_response

async def fetch_city_flights(departure_airport, city_iata, outbound_date, return_date):
    """
    Fetches both outbound and return flights for a specific city
    """
    try:
        print(f"Searching flights from {departure_airport} to {city_iata} ({outbound_date} to {return_date})")
        
        # Get outbound flight
       # outbound_results = await get_flights(
           # departure_id=departure_airport,
           # arrival_id=city_iata,
          #  outbound_date=outbound_date,
           # return_date=return_date
       # )
        # Get outbound flight
        outbound_results = await get_flights(
            departure_id="LGW",
            arrival_id="BCN",
            outbound_date=outbound_date,
            return_date=return_date
        )
        
        # Debug outbound results
        if not outbound_results or not outbound_results.get("other_flights"):
            print(f"No outbound flights found for {city_iata}")
            return {"city_iata": city_iata, "outbound_flight": None, "return_flight": None}
            
        outbound_flight = get_cheapest_flight(outbound_results)
        
        # If no outbound flight found or no departure token, return None
        if not outbound_flight or not outbound_flight.get("departure_token"):
            print(f"No valid outbound flight or departure token for {city_iata}")
            return {"city_iata": city_iata, "outbound_flight": outbound_flight, "return_flight": None}
        
        # Get return flight using departure token
        try:
            return_results = await get_flights(
                departure_id=departure_airport,
                arrival_id=city_iata,
                outbound_date=outbound_date,
                return_date=return_date,
                departure_token=outbound_flight["departure_token"]
            )
            return_flight = get_cheapest_flight(return_results)
        except Exception as e:
            print(f"Failed to fetch return flight for {city_iata}: {str(e)}")
            return_flight = None
        
        return {
            "city_iata": city_iata,
            "outbound_flight": outbound_flight,
            "return_flight": return_flight
        }
    except Exception as e:
        print(f"Error fetching flights for {city_iata}: {str(e)}")
        return {"city_iata": city_iata, "outbound_flight": None, "return_flight": None}

@app.get("/api/search")
async def city_finder(message) -> dict:
    # Get city suggestions from AI
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
            lisbon LIS, porto OPO, barcelona BCN, bordeux BOD, palermo PMO, tunis TUN
            </assistant_response>""", 
        input=message
    )
    
    print(f"AI response: {response.output_text}")
    
    # Parse AI response to get city list
    try:
        cities = response.output_text.strip().split(",")
        cities_list = []
        
        for city_entry in cities:
            parts = city_entry.strip().split()
            if len(parts) >= 2:
                # Last part is the IATA code, everything else is the city name
                city_iata = parts[-1]
                city_name = " ".join(parts[:-1])
                cities_list.append((city_name, city_iata))
        
        if not cities_list:
            # Fallback to some default cities if parsing fails
            cities_list = [
                ("London", "LHR"),
                ("Paris", "CDG"),
                ("Rome", "FCO"),
                ("Barcelona", "BCN"),
                ("Amsterdam", "AMS"),
                ("Lisbon", "LIS")
            ]
            print("Using fallback cities due to parsing issues")
        
        print(f"Parsed cities: {cities_list}")
    except Exception as e:
        print(f"Error parsing cities: {str(e)}")
        # Fallback to some default cities if parsing fails completely
        cities_list = [
            ("London", "LHR"),
            ("Paris", "CDG"),
            ("Rome", "FCO"),
            ("Barcelona", "BCN"),
            ("Amsterdam", "AMS"),
            ("Lisbon", "LIS")
        ]

    # Parse user data
    data = json.loads(message)
    departure_airport = data.get("departureAirport", "LGW")  # Default to LGW if not provided
    outbound_date = data["startDate"]
    return_date = data["endDate"]
    
    # Fetch flights for all cities in parallel
    tasks = []
    for _, city_iata in cities_list:
        task = fetch_city_flights(departure_airport, city_iata, outbound_date, return_date)
        tasks.append(task)
    
    flight_results = await asyncio.gather(*tasks)
    print(f"Flight results count: {len(flight_results)}")
    
    # Combine cities with their flight info
    cities_with_flights = []
    for i, (city_name, city_iata) in enumerate(cities_list):
        city_data = {
            "city_name": city_name,
            "city_iata": city_iata,
            "flight_info": flight_results[i]["outbound_flight"],
            "return_flight_info": flight_results[i]["return_flight"]
        }
        cities_with_flights.append(city_data)
    
    final_response = {"cities": cities_with_flights}
    print(f"Final API response structure: {json.dumps(final_response, default=str)[:200]}...")
    #print(final_response)
    return final_response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 