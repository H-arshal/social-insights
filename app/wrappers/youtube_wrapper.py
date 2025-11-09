import requests
import logging
import os

logger = logging.getLogger(__name__)

class YouTubeWrapper:
    BASE_URL = "https://www.googleapis.com/youtube/v3"
    API_KEY = os.getenv('YOUTUBE_API_KEY')

    @staticmethod
    def get_channel_stats(channel_id: str):
        try:
            if not YouTubeWrapper.API_KEY:
                return {'error': 'YouTube API key not configured'}
            url = f"{YouTubeWrapper.BASE_URL}/channels"
            params = {
                'part': 'statistics,snippet,contentDetails',
                'id': channel_id,
                'key': YouTubeWrapper.API_KEY
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if not data.get('items'):
                return {'error': 'Channel not found'}
            item = data['items'][0]
            snippet = item.get('snippet', {})
            stats = item.get('statistics', {})
            return {
                'channel_id': channel_id,
                'channel_name': snippet.get('title'),
                'description': snippet.get('description'),
                'thumbnail': snippet.get('thumbnails', {}).get('default', {}).get('url'),
                'subscribers': stats.get('subscriberCount'),
                'total_views': stats.get('viewCount'),
                'total_videos': stats.get('videoCount'),
                'created': snippet.get('publishedAt')
            }
        except requests.RequestException as e:
            logger.error(f"YouTube API error: {str(e)}")
            return {'error': f'Failed to fetch YouTube data: {str(e)}'}

    @staticmethod
    def search_videos(query: str, max_results: int = 5):
        try:
            if not YouTubeWrapper.API_KEY:
                return {'error': 'YouTube API key not configured'}
            url = f"{YouTubeWrapper.BASE_URL}/search"
            params = {
                'part': 'snippet',
                'q': query,
                'maxResults': max_results,
                'type': 'video',
                'key': YouTubeWrapper.API_KEY
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            videos = []
            for item in data.get('items', []):
                snippet = item.get('snippet', {})
                videos.append({
                    'video_id': item.get('id', {}).get('videoId'),
                    'title': snippet.get('title'),
                    'description': snippet.get('description'),
                    'thumbnail': snippet.get('thumbnails', {}).get('default', {}).get('url'),
                    'channel': snippet.get('channelTitle'),
                    'published_at': snippet.get('publishedAt')
                })
            return {
                'query': query,
                'results_count': len(videos),
                'videos': videos
            }
        except requests.RequestException as e:
            logger.error(f"YouTube API error: {str(e)}")
            return {'error': f'Failed to search videos: {str(e)}'}

    @staticmethod
    def search_channels(query: str, max_results: int = 10, sort: str = 'name', order: str = 'desc'):
        """Search channels by name and return stats, with sorting.
        sort: one of ['name', 'subscribers', 'total_views']
        order: 'asc' | 'desc'
        """
        try:
            if not YouTubeWrapper.API_KEY:
                return {'error': 'YouTube API key not configured'}

            # 1) Search channels by query
            search_url = f"{YouTubeWrapper.BASE_URL}/search"
            search_params = {
                'part': 'snippet',
                'q': query,
                'maxResults': max_results,
                'type': 'channel',
                'key': YouTubeWrapper.API_KEY
            }

            s_resp = requests.get(search_url, params=search_params, timeout=10)
            s_resp.raise_for_status()
            s_data = s_resp.json()

            channel_ids = [item.get('id', {}).get('channelId') for item in s_data.get('items', []) if item.get('id', {}).get('channelId')]
            if not channel_ids:
                return {'query': query, 'results_count': 0, 'channels': []}

            # 2) Fetch channel stats in batch
            details_url = f"{YouTubeWrapper.BASE_URL}/channels"
            details_params = {
                'part': 'statistics,snippet',
                'id': ','.join(channel_ids),
                'key': YouTubeWrapper.API_KEY
            }
            d_resp = requests.get(details_url, params=details_params, timeout=10)
            d_resp.raise_for_status()
            d_data = d_resp.json()

            channels = []
            for item in d_data.get('items', []):
                snippet = item.get('snippet', {})
                stats = item.get('statistics', {})
                channels.append({
                    'channel_id': item.get('id'),
                    'channel_name': snippet.get('title'),
                    'description': snippet.get('description'),
                    'thumbnail': snippet.get('thumbnails', {}).get('default', {}).get('url'),
                    'subscribers': int(stats.get('subscriberCount')) if stats.get('subscriberCount') is not None else 0,
                    'total_views': int(stats.get('viewCount')) if stats.get('viewCount') is not None else 0,
                    'total_videos': int(stats.get('videoCount')) if stats.get('videoCount') is not None else 0,
                    'created': snippet.get('publishedAt')
                })

            # 3) Sorting
            key_map = {
                'name': 'channel_name',
                'subscribers': 'subscribers',
                'total_views': 'total_views'
            }
            sort_key = key_map.get(sort, 'channel_name')
            reverse = (order.lower() != 'asc')
            channels.sort(key=lambda c: c.get(sort_key) or 0, reverse=reverse)

            return {
                'query': query,
                'results_count': len(channels),
                'sort': sort_key,
                'order': 'desc' if reverse else 'asc',
                'channels': channels
            }

        except requests.RequestException as e:
            logger.error(f"YouTube API error: {str(e)}")
            return {'error': f'Failed to search channels: {str(e)}'}
