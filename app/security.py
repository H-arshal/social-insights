import re

class Validator:
    @staticmethod
    def validate_username(username: str) -> bool:
        if not username or len(username) < 3 or len(username) > 50:
            return False
        return re.match(r'^[a-zA-Z0-9_-]+$', username) is not None

    @staticmethod
    def validate_subreddit(subreddit: str) -> bool:
        if not subreddit or len(subreddit) < 2 or len(subreddit) > 50:
            return False
        return re.match(r'^[a-zA-Z0-9_]+$', subreddit) is not None

    @staticmethod
    def validate_channel_id(channel_id: str) -> bool:
        return bool(channel_id) and len(channel_id) >= 20

class RateLimitConfig:
    LIMITS = {
        'default': '20/minute',
        'login': '5/minute',
        'search': '10/minute'
    }
