import os
import json
try:
    import redis
except ImportError:  # optional dependency for later
    redis = None

REDIS_URL = os.getenv('REDIS_URL')
_client = None

if redis and REDIS_URL:
    try:
        _client = redis.from_url(REDIS_URL)
    except Exception:
        _client = None

def get(key: str):
    if not _client:
        return None
    val = _client.get(key)
    if not val:
        return None
    try:
        return json.loads(val)
    except Exception:
        return val

def set(key: str, value, ex: int = 300):
    if not _client:
        return False
    try:
        _client.set(key, json.dumps(value), ex=ex)
        return True
    except Exception:
        return False
