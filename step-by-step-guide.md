# Social Media Insights API Wrapper - Complete Step-by-Step Guide

## Table of Contents
1. [Project Setup](#project-setup)
2. [Backend - Flask Foundation](#backend---flask-foundation)
3. [Authentication - JWT Implementation](#authentication---jwt-implementation)
4. [API Wrappers - Reddit & YouTube](#api-wrappers---reddit--youtube)
5. [Security Layer - Rate Limiting & Validation](#security-layer---rate-limiting--validation)
6. [FastAPI Integration - Async Processing](#fastapi-integration---async-processing)
7. [Frontend - React Dashboard](#frontend---react-dashboard)
8. [Testing & Deployment](#testing--deployment)

---

## Project Setup

### Step 1: Create Project Directory

```bash
mkdir social_insights_api
cd social_insights_api
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

### Step 3: Create Project Structure

```bash
mkdir -p app/{wrappers,utils,routes}
mkdir -p frontend
touch requirements.txt .env .gitignore
```

**Project Structure:**
```
social_insights_api/
├── app/
│   ├── __init__.py
│   ├── auth.py
│   ├── security.py
│   ├── wrappers/
│   │   ├── __init__.py
│   │   ├── reddit_wrapper.py
│   │   ├── youtube_wrapper.py
│   │   └── twitter_wrapper.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── cache.py
│   │   └── logger.py
│   └── routes/
│       ├── __init__.py
│       └── insights.py
├── fastapi_service.py
├── flask_app.py
├── requirements.txt
├── .env
├── .gitignore
└── frontend/
    ├── src/
    ├── public/
    └── package.json
```

### Step 4: Install Dependencies

Create `requirements.txt`:
```
Flask==2.3.2
Flask-CORS==4.0.0
Flask-Limiter==3.5.0
PyJWT==2.8.0
python-dotenv==1.0.0
requests==2.31.0
FastAPI==0.104.1
uvicorn==0.24.0
httpx==0.25.2
```

Install:
```bash
pip install -r requirements.txt
```

### Step 5: Configure Environment Variables

Create `.env`:
```
FLASK_SECRET_KEY=your_super_secret_key_here_change_this_in_production
JWT_SECRET_KEY=your_jwt_secret_key_here_change_this_in_production
JWT_EXPIRATION_HOURS=2
YOUTUBE_API_KEY=your_youtube_api_key_here
REDIS_URL=redis://localhost:6379
```

Create `.gitignore`:
```
venv/
.env
__pycache__/
*.pyc
.DS_Store
node_modules/
dist/
build/
.cache/
```

---

## Backend - Flask Foundation

### Step 6: Flask App Structure

Create `flask_app.py`:
```python
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')

CORS(app)
limiter = Limiter(key_func=get_remote_address, app=app)

# Import routes
from app.routes.insights import insights_bp
from app.auth import auth_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(insights_bp, url_prefix='/api')

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'Social Media Insights API Wrapper',
        'endpoints': {
            'auth': '/api/auth/login',
            'reddit': '/api/insights/reddit',
            'youtube': '/api/insights/youtube',
            'trending': '/api/trending'
        }
    })

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Rate limit exceeded'}), 429

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### Step 7: Create App Package Init

Create `app/__init__.py`:
```python
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

def create_app():
    app = Flask(__name__)
    CORS(app)
    return app
```

---

## Authentication - JWT Implementation

### Step 8: JWT Authentication

Create `app/auth.py`:
```python
from flask import Blueprint, request, jsonify
import jwt
import datetime
import os
from functools import wraps

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'supersecretkey')
JWT_EXPIRATION = int(os.getenv('JWT_EXPIRATION_HOURS', 2))

# Simple user database (in production, use a real database)
USERS = {
    'admin': 'admin123',
    'user': 'password123'
}

@auth_bp.route('/login', methods=['POST'])
def login():
    """Generate JWT token for user"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    # Validate credentials
    if username not in USERS or USERS[username] != password:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Generate JWT token
    token = jwt.encode({
        'user': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION)
    }, SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        'token': token,
        'user': username,
        'expires_in': JWT_EXPIRATION * 3600
    }), 200

def token_required(f):
    """Decorator to verify JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user = data.get('user')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated
```

### Step 9: Create Routes Init

Create `app/routes/__init__.py`:
```python
# Routes package
```

---

## API Wrappers - Reddit & YouTube

### Step 10: Reddit Wrapper

Create `app/wrappers/reddit_wrapper.py`:
```python
import requests
import logging

logger = logging.getLogger(__name__)

class RedditWrapper:
    """Wrapper for Reddit API"""
    
    BASE_URL = "https://www.reddit.com"
    
    @staticmethod
    def get_subreddit_posts(subreddit: str, limit: int = 10):
        """Fetch hot posts from a subreddit"""
        try:
            # Reddit requires a User-Agent
            headers = {
                "User-Agent": "SocialInsightsAPI/1.0 (by YourUsername)"
            }
            
            url = f"{RedditWrapper.BASE_URL}/r/{subreddit}/hot.json"
            params = {"limit": limit}
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
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
            
            return {
                'subreddit': subreddit,
                'posts_count': len(posts),
                'posts': posts
            }
        
        except requests.RequestException as e:
            logger.error(f"Reddit API error: {str(e)}")
            return {'error': f'Failed to fetch Reddit data: {str(e)}'}
    
    @staticmethod
    def get_subreddit_info(subreddit: str):
        """Get subreddit metadata"""
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
```

### Step 11: YouTube Wrapper

Create `app/wrappers/youtube_wrapper.py`:
```python
import requests
import logging
import os

logger = logging.getLogger(__name__)

class YouTubeWrapper:
    """Wrapper for YouTube Data API"""
    
    BASE_URL = "https://www.googleapis.com/youtube/v3"
    API_KEY = os.getenv('YOUTUBE_API_KEY')
    
    @staticmethod
    def get_channel_stats(channel_id: str):
        """Get channel statistics and info"""
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
        """Search for videos"""
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
```

### Step 12: Wrappers Init

Create `app/wrappers/__init__.py`:
```python
from .reddit_wrapper import RedditWrapper
from .youtube_wrapper import YouTubeWrapper

__all__ = ['RedditWrapper', 'YouTubeWrapper']
```

---

## Security Layer - Rate Limiting & Validation

### Step 13: Security Module

Create `app/security.py`:
```python
import re
import logging

logger = logging.getLogger(__name__)

class Validator:
    """Input validation utilities"""
    
    @staticmethod
    def validate_username(username: str) -> bool:
        """Validate username format"""
        if not username or len(username) < 3 or len(username) > 50:
            return False
        return re.match(r'^[a-zA-Z0-9_-]+$', username) is not None
    
    @staticmethod
    def validate_subreddit(subreddit: str) -> bool:
        """Validate subreddit name"""
        if not subreddit or len(subreddit) < 2 or len(subreddit) > 50:
            return False
        return re.match(r'^[a-zA-Z0-9_]+$', subreddit) is not None
    
    @staticmethod
    def validate_channel_id(channel_id: str) -> bool:
        """Validate YouTube channel ID"""
        return bool(channel_id) and len(channel_id) >= 20

class RateLimitConfig:
    """Rate limiting configuration"""
    
    LIMITS = {
        'default': '20/minute',
        'login': '5/minute',
        'search': '10/minute'
    }
```

### Step 14: Create Insights Routes

Create `app/routes/insights.py`:
```python
from flask import Blueprint, request, jsonify
from app.auth import token_required
from app.security import Validator
from app.wrappers import RedditWrapper, YouTubeWrapper
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

insights_bp = Blueprint('insights', __name__)
limiter = Limiter(key_func=get_remote_address)

@insights_bp.route('/insights/reddit', methods=['GET'])
@token_required
@limiter.limit("10/minute")
def reddit_insights(current_user):
    """Get Reddit subreddit posts"""
    subreddit = request.args.get('subreddit', 'technology')
    limit = request.args.get('limit', 10, type=int)
    
    # Validate input
    if not Validator.validate_subreddit(subreddit):
        return jsonify({'error': 'Invalid subreddit name'}), 400
    
    if limit < 1 or limit > 100:
        limit = 10
    
    data = RedditWrapper.get_subreddit_posts(subreddit, limit)
    return jsonify(data), 200

@insights_bp.route('/insights/youtube', methods=['GET'])
@token_required
@limiter.limit("10/minute")
def youtube_insights(current_user):
    """Get YouTube channel statistics"""
    channel_id = request.args.get('channel_id')
    
    if not channel_id:
        return jsonify({'error': 'channel_id parameter required'}), 400
    
    if not Validator.validate_channel_id(channel_id):
        return jsonify({'error': 'Invalid channel ID format'}), 400
    
    data = YouTubeWrapper.get_channel_stats(channel_id)
    return jsonify(data), 200

@insights_bp.route('/insights/youtube/search', methods=['GET'])
@token_required
@limiter.limit("5/minute")
def youtube_search(current_user):
    """Search YouTube videos"""
    query = request.args.get('q')
    max_results = request.args.get('max_results', 5, type=int)
    
    if not query or len(query) < 2:
        return jsonify({'error': 'Search query too short'}), 400
    
    if max_results < 1 or max_results > 50:
        max_results = 5
    
    data = YouTubeWrapper.search_videos(query, max_results)
    return jsonify(data), 200

@insights_bp.route('/trending', methods=['GET'])
@token_required
@limiter.limit("10/minute")
def get_trending(current_user):
    """Get trending content from multiple platforms"""
    platform = request.args.get('platform', 'reddit')
    
    if platform == 'reddit':
        data = RedditWrapper.get_subreddit_posts('all', limit=5)
    elif platform == 'youtube':
        data = YouTubeWrapper.search_videos('trending', max_results=5)
    else:
        return jsonify({'error': 'Unsupported platform'}), 400
    
    return jsonify(data), 200
```

---

## FastAPI Integration - Async Processing

### Step 15: FastAPI Microservice

Create `fastapi_service.py`:
```python
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
import httpx
import logging
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Social Media Insights Async Service")

# CORS configuration
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
    """
    Aggregate insights from multiple platforms in parallel
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    async with httpx.AsyncClient() as client:
        # Make parallel requests
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
```

---

## Frontend - React Dashboard

### Step 16: Create React App

```bash
cd frontend
npx create-react-app .
npm install axios tailwindcss
npx tailwindcss init
```

### Step 17: Configure Tailwind

Update `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Step 18: API Utility

Create `src/utils/api.js`:
```javascript
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Step 19: Login Component

Create `src/components/LoginForm.jsx`:
```javascript
import { useState } from 'react';
import api from '../utils/api';

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      const response = await api.post('/api/auth/login', {
        username,
        password
      });
      
      localStorage.setItem('authToken', response.data.token);
      onLogin(true);
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">Social Insights</h1>
        <p className="text-gray-600 text-center mb-6">API Wrapper Platform</p>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
        
        <p className="text-gray-600 text-sm mt-4 text-center">
          Demo: admin / admin123
        </p>
      </div>
    </div>
  );
}
```

### Step 20: Dashboard Component

Create `src/components/Dashboard.jsx`:
```javascript
import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Dashboard({ onLogout }) {
  const [redditData, setRedditData] = useState(null);
  const [youtubeData, setYoutubeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subreddit, setSubreddit] = useState('technology');
  const [channelId, setChannelId] = useState('UCsXVk37bltHxD1rDPwtNM8Q');

  const fetchData = async () => {
    setLoading(true);
    try {
      const redditRes = await api.get(`/api/insights/reddit?subreddit=${subreddit}`);
      setRedditData(redditRes.data);
      
      const youtubeRes = await api.get(`/api/insights/youtube?channel_id=${channelId}`);
      setYoutubeData(youtubeRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Social Media Insights</h1>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Search</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Subreddit"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              className="px-4 py-2 border rounded"
            />
            <input
              type="text"
              placeholder="Channel ID"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="px-4 py-2 border rounded"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Fetch Data'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Reddit Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4 text-orange-600">Reddit</h3>
            {redditData && !redditData.error ? (
              <>
                <p className="text-gray-600 mb-4">r/{redditData.subreddit}</p>
                <div className="space-y-3">
                  {redditData.posts?.slice(0, 5).map((post, i) => (
                    <div key={i} className="border-l-4 border-orange-500 pl-4">
                      <p className="font-semibold text-sm">{post.title}</p>
                      <p className="text-gray-500 text-xs">↑ {post.score} | 💬 {post.comments}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-red-500">{redditData?.error || 'Loading...'}</p>
            )}
          </div>

          {/* YouTube Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">YouTube</h3>
            {youtubeData && !youtubeData.error ? (
              <>
                <p className="text-gray-600 font-semibold mb-2">{youtubeData.channel_name}</p>
                <div className="space-y-2 text-sm">
                  <p><strong>Subscribers:</strong> {youtubeData.subscribers}</p>
                  <p><strong>Total Views:</strong> {youtubeData.total_views}</p>
                  <p><strong>Videos:</strong> {youtubeData.total_videos}</p>
                </div>
              </>
            ) : (
              <p className="text-red-500">{youtubeData?.error || 'Loading...'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 21: Main App Component

Create `src/App.jsx`:
```javascript
import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LoginForm onLogin={setIsLoggedIn} />
      )}
    </div>
  );
}

export default App;
```

### Step 22: Configure React Environment

Create `.env` in frontend directory:
```
REACT_APP_API_URL=http://localhost:5000
```

---

## Testing & Deployment

### Step 23: Run Backend

```bash
# Terminal 1 - Flask
python flask_app.py

# Terminal 2 - FastAPI
python fastapi_service.py
```

### Step 24: Run Frontend

```bash
# Terminal 3 - React
cd frontend
npm start
```

### Step 25: Test Endpoints

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Get Reddit Insights (replace TOKEN):**
```bash
curl -X GET 'http://localhost:5000/api/insights/reddit?subreddit=technology' \
  -H "Authorization: Bearer TOKEN"
```

### Step 26: Deployment

**Deploy Backend to Render:**
1. Create `Procfile`:
```
web: gunicorn flask_app:app
```

2. Deploy to Render/Railway
3. Set environment variables in dashboard

**Deploy Frontend to Vercel:**
```bash
cd frontend
npm install -g vercel
vercel
```

---

## Summary

You now have a complete Social Media Insights API Wrapper project with:

✅ Flask authentication (JWT)
✅ Reddit API wrapper
✅ YouTube API wrapper
✅ Rate limiting & validation
✅ FastAPI async integration
✅ React dashboard with Tailwind
✅ Full authentication flow
✅ Production-ready structure

**Next Steps:**
1. Get API keys (YouTube)
2. Test endpoints locally
3. Add Twitter/X wrapper
4. Implement caching (Redis)
5. Deploy to production
6. Add comprehensive tests

Good luck, Harshal! 🚀
