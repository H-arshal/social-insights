import os
import requests
import logging
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

class InstagramWrapper:
    BASE_URL = "https://instagram120.p.rapidapi.com"
    RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY')
    RAPIDAPI_HOST = os.getenv('RAPIDAPI_HOST', 'instagram120.p.rapidapi.com')

    @staticmethod
    def get_community(profile_url: str):
        """Fetch Instagram community stats for a given profile URL via RapidAPI."""
        if not InstagramWrapper.RAPIDAPI_KEY:
            return {'error': 'RAPIDAPI_KEY not configured'}
        try:
            headers = {
                'x-rapidapi-key': InstagramWrapper.RAPIDAPI_KEY,
                'x-rapidapi-host': InstagramWrapper.RAPIDAPI_HOST,
            }
            # This legacy method may not be supported by instagram120; keep for backward-compat if HOST differs
            query = urlencode({'url': profile_url})
            url = f"https://instagram-statistics-api.p.rapidapi.com/community?{query}"
            resp = requests.get(url, headers={**headers, 'x-rapidapi-host': 'instagram-statistics-api.p.rapidapi.com'}, timeout=15)
            # RapidAPI may return non-200 for invalid URLs or limits
            if resp.status_code == 404:
                return {'profile_url': profile_url, 'message': 'Profile not found', 'data': None}
            resp.raise_for_status()
            data = resp.json()
            # Normalize shape a bit
            return {
                'profile_url': profile_url,
                'data': data
            }
        except requests.RequestException as e:
            logger.error(f"Instagram RapidAPI error: {str(e)}")
            status = getattr(getattr(e, 'response', None), 'status_code', None)
            if status == 429:
                return {'profile_url': profile_url, 'error': 'Rate limit exceeded', 'data': None}
            return {'profile_url': profile_url, 'error': 'Failed to fetch Instagram data', 'data': None}

    @staticmethod
    def get_posts(username: str, max_id: str = ""):
        """Fetch Instagram posts by username via instagram120 RapidAPI."""
        if not InstagramWrapper.RAPIDAPI_KEY:
            return {'error': 'RAPIDAPI_KEY not configured'}
        try:
            headers = {
                'x-rapidapi-key': InstagramWrapper.RAPIDAPI_KEY,
                'x-rapidapi-host': InstagramWrapper.RAPIDAPI_HOST,
                'Content-Type': 'application/json'
            }
            url = f"{InstagramWrapper.BASE_URL}/api/instagram/posts"
            payload = {
                "username": username,
                "maxId": max_id or ""
            }
            resp = requests.post(url, json=payload, headers=headers, timeout=20)
            if resp.status_code == 404:
                return {'username': username, 'message': 'User not found', 'data': None}
            resp.raise_for_status()
            data = resp.json()
            return {
                'username': username,
                'data': data
            }
        except requests.RequestException as e:
            logger.error(f"Instagram RapidAPI error: {str(e)}")
            status = getattr(getattr(e, 'response', None), 'status_code', None)
            if status == 429:
                return {'username': username, 'error': 'Rate limit exceeded', 'data': None}
            return {'username': username, 'error': 'Failed to fetch Instagram posts', 'data': None}
