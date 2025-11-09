import os
import requests
import logging

logger = logging.getLogger(__name__)

class LinkedInWrapper:
    HOST = os.getenv('LINKEDIN_RAPIDAPI_HOST') or os.getenv('RAPIDAPI_HOST', 'linkedin-api15.p.rapidapi.com')
    KEY = os.getenv('RAPIDAPI_KEY')

    @staticmethod
    def get_company_by_name(linkedin_name: str):
        if not LinkedInWrapper.KEY:
            return {'error': 'RAPIDAPI_KEY not configured'}
        if not linkedin_name:
            return {'error': 'linkedinName is required'}
        url = f"https://{LinkedInWrapper.HOST}/v1/companies/get"
        headers = {
            'x-rapidapi-key': LinkedInWrapper.KEY,
            'x-rapidapi-host': LinkedInWrapper.HOST
        }
        params = { 'linkedinName': linkedin_name }
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            return {
                'query': linkedin_name,
                'data': data
            }
        except requests.RequestException as e:
            logger.error(f"LinkedIn RapidAPI error: {str(e)}")
            status = getattr(getattr(e, 'response', None), 'status_code', None)
            return {'error': 'Failed to fetch LinkedIn data', 'status': status}
