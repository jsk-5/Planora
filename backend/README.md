# Planora Backend

FastAPI backend for Planora travel planning application.

## Deployment on Vercel

This backend is configured to be deployed on Vercel. Follow these steps to deploy:

1. Push this code to your GitHub repository
2. In Vercel, create a new project and import from your GitHub repository
3. Select the `/backend` directory as the root directory for the project
4. Add the following environment variables in the Vercel project settings:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SERPAPI_API_KEY`: Your SerpAPI key for flight data

## Local Development

To run the backend locally:

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the backend directory with:
   ```
   OPENAI_API_KEY=your_openai_api_key
   SERPAPI_API_KEY=your_serpapi_key
   ```

3. Run the FastAPI server:
   ```
   uvicorn main:app --reload
   ```

The API will be available at http://localhost:8000
