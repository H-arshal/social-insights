from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging
import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Social Media Insights Async Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')

@app.get("/")
async def root():
    return {"message": "FastAPI Async Service", "version": "1.0"}

@app.get("/async/insights/all")
async def get_all_insights(
    subreddit: str = Query("technology", min_length=2),
    channel_id: str = Query(None),
    authorization: str = Header(None)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    async with httpx.AsyncClient() as client:
        tasks = [
            client.get(
                "http://localhost:5000/api/insights/reddit",
                params={"subreddit": subreddit},
                headers={"Authorization": authorization}
            )
        ]
        if channel_id:
            tasks.append(
                client.get(
                    "http://localhost:5000/api/insights/youtube",
                    params={"channel_id": channel_id},
                    headers={"Authorization": authorization}
                )
            )
        try:
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            results = {
                'reddit': responses[0].json() if isinstance(responses[0], httpx.Response) else None,
                'youtube': responses[1].json() if len(responses) > 1 and isinstance(responses[1], httpx.Response) else None,
                'aggregated_at': datetime.now().isoformat()
            }
            return results
        except Exception as e:
            logger.error(f"Aggregation error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to aggregate insights")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
