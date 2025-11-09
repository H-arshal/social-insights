import requests
import logging

logger = logging.getLogger(__name__)

class RedditWrapper:
    BASE_URL = "https://www.reddit.com"

    @staticmethod
    def get_subreddit_posts(subreddit: str, limit: int = 10):
        try:
            headers = {
                "User-Agent": "SocialInsightsAPI/1.0 (by YourUsername)"
            }
            url = f"{RedditWrapper.BASE_URL}/r/{subreddit}/hot.json"
            params = {"limit": limit}
            response = requests.get(url, headers=headers, params=params, timeout=10)
            # If subreddit is missing/private/quarantined, Reddit may return 403/404
            if response.status_code in (403, 404):
                return {
                    'subreddit': subreddit,
                    'posts_count': 0,
                    'posts': [],
                    'message': 'No subreddit found or access forbidden'
                }
            response.raise_for_status()
            data = response.json()
            posts = []
            for child in data.get('data', {}).get('children', []):
                post_data = child.get('data', {})
                posts.append({
                    'title': post_data.get('title'),
                    'score': post_data.get('score'),
                    'comments': post_data.get('num_comments'),
                    'author': post_data.get('author'),
                    'url': post_data.get('url'),
                    'created': post_data.get('created_utc')
                })
            result = {
                'subreddit': subreddit,
                'posts_count': len(posts),
                'posts': posts
            }
            if len(posts) == 0:
                result['message'] = 'No posts found'
            return result
        except requests.RequestException as e:
            logger.error(f"Reddit API error: {str(e)}")
            # Try to extract status code for friendlier message
            status = getattr(getattr(e, 'response', None), 'status_code', None)
            if status in (403, 404):
                return {
                    'subreddit': subreddit,
                    'posts_count': 0,
                    'posts': [],
                    'message': 'No subreddit found or access forbidden'
                }
            return {'subreddit': subreddit, 'posts_count': 0, 'posts': [], 'message': 'Failed to fetch Reddit data'}

    @staticmethod
    def get_subreddit_info(subreddit: str):
        try:
            headers = {
                "User-Agent": "SocialInsightsAPI/1.0 (by YourUsername)"
            }
            url = f"{RedditWrapper.BASE_URL}/r/{subreddit}/about.json"
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json().get('data', {})
            return {
                'name': data.get('display_name'),
                'subscribers': data.get('subscribers'),
                'description': data.get('public_description'),
                'created': data.get('created_utc')
            }
        except requests.RequestException as e:
            logger.error(f"Reddit API error: {str(e)}")
            return {'error': f'Failed to fetch subreddit info: {str(e)}'}
