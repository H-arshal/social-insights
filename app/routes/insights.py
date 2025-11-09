from flask import Blueprint, request, jsonify
from app.auth import token_required
from app.security import Validator
from app.wrappers import RedditWrapper, YouTubeWrapper, LinkedInWrapper
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

insights_bp = Blueprint('insights', __name__)
limiter = Limiter(key_func=get_remote_address)

@insights_bp.route('/insights/reddit', methods=['GET'])
@token_required
@limiter.limit("10/minute")
def reddit_insights(current_user):
    subreddit = request.args.get('subreddit', 'technology')
    limit = request.args.get('limit', 10, type=int)

    if not Validator.validate_subreddit(subreddit):
        return jsonify({'error': 'Invalid subreddit name'}), 400

    if limit < 1 or limit > 100:
        limit = 10

    data = RedditWrapper.get_subreddit_posts(subreddit, limit)
    return jsonify(data), 200

@insights_bp.route('/insights/linkedin/company', methods=['GET'])
@token_required
@limiter.limit("5/minute")
def linkedin_company(current_user):
    name = request.args.get('name') or request.args.get('linkedinName')
    if not name:
        return jsonify({'error': 'Missing required parameter: name'}), 400
    data = LinkedInWrapper.get_company_by_name(name)
    return jsonify(data), 200

@insights_bp.route('/insights/youtube/channels', methods=['GET'])
@token_required
@limiter.limit("5/minute")
def youtube_channel_search(current_user):
    """Search YouTube channels by name with sorting."""
    query = request.args.get('q')
    max_results = request.args.get('max_results', 10, type=int)
    sort = request.args.get('sort', 'name')  # name | subscribers | total_views
    order = request.args.get('order', 'desc')  # asc | desc

    if not query or len(query) < 2:
        return jsonify({'error': 'Search query too short'}), 400

    if max_results < 1 or max_results > 50:
        max_results = 10

    data = YouTubeWrapper.search_channels(query=query, max_results=max_results, sort=sort, order=order)
    return jsonify(data), 200

@insights_bp.route('/insights/youtube', methods=['GET'])
@token_required
@limiter.limit("10/minute")
def youtube_insights(current_user):
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
    platform = request.args.get('platform', 'reddit')

    if platform == 'reddit':
        data = RedditWrapper.get_subreddit_posts('all', limit=5)
    elif platform == 'youtube':
        data = YouTubeWrapper.search_videos('trending', max_results=5)
    else:
        return jsonify({'error': 'Unsupported platform'}), 400

    return jsonify(data), 200
