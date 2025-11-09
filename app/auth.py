from flask import Blueprint, request, jsonify
import jwt
import datetime
import os
from functools import wraps

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'supersecretkey')
JWT_EXPIRATION = int(os.getenv('JWT_EXPIRATION_HOURS', 2))

USERS = {
    'admin': 'admin123',
    'user': 'password123'
}

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400

    username = data.get('username')
    password = data.get('password')

    if username not in USERS or USERS[username] != password:
        return jsonify({'error': 'Invalid credentials'}), 401

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
