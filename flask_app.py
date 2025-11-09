from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'change-me')

CORS(app)
limiter = Limiter(key_func=get_remote_address, app=app)

# Import routes
from app.routes.insights import insights_bp  # noqa: E402
from app.auth import auth_bp  # noqa: E402

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
