from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import instaloader
import os
import tempfile

app = Flask(__name__)
# Ajustar CORS para permitir requisições do Instagram
from flask_cors import CORS

cors = CORS(app, resources={
    r"/*": {
        "origins": [
            "https://www.instagram.com",
            "https://instagram.com",
            "https://www.facebook.com",
            "https://facebook.com"
        ],
        "supports_credentials": True
    }
})

INSTAGRAM_USERNAME = os.getenv('INSTAGRAM_USERNAME')
INSTAGRAM_PASSWORD = os.getenv('INSTAGRAM_PASSWORD')

L = instaloader.Instaloader()

# Login to Instagram if credentials are provided
if INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD:
    try:
        L.login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD)
        print("Logged in to Instagram successfully.")
    except Exception as e:
        print(f"Failed to login to Instagram: {e}")

@app.route('/download_story_video', methods=['POST', 'GET'])
def download_story_video():
    if request.method == 'GET':
        return jsonify({'error': 'GET method not allowed for this endpoint'}), 405

    data = request.get_json()
    story_url = data.get('story_url')
    if not story_url:
        return jsonify({'error': 'Missing story_url parameter'}), 400

    from urllib.parse import urlparse

    def extract_username_from_url(story_url):
        # Exemplo: https://www.instagram.com/stories/username/1234567890123456789/
        try:
            parts = urlparse(story_url).path.strip('/').split('/')
            if len(parts) >= 2 and parts[0] == 'stories':
                return parts[1]
        except Exception as e:
            print(f"Erro ao extrair username: {e}")
        return None

    try:
        data = request.get_json()
        story_url = data.get('story_url')
        if not story_url:
            return jsonify({'error': 'Missing story_url parameter'}), 400

        username = extract_username_from_url(story_url)
        if not username:
            return jsonify({'error': 'Could not extract username from URL'}), 400

        profile = instaloader.Profile.from_username(L.context, username)
        def extract_story_id(story_url):
            try:
                parts = urlparse(story_url).path.strip('/').split('/')
                if len(parts) >= 3:
                    return parts[2]
            except Exception:
                return None

        story_id = extract_story_id(story_url)

        for story in L.get_stories(userids=[profile.userid]):
            for item in story.get_items():
                if item.video_url and story_id and str(item.mediaid) == story_id:
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmpfile:
                        L.download_storyitem(item, target=tmpfile.name)
                        return send_file(tmpfile.name, mimetype='video/mp4', as_attachment=True, download_name='story_video.mp4')

        return jsonify({'error': 'Story video not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

from flask import send_file
import json
import io

@app.route('/extract_followers_following', methods=['GET'])
def extract_followers_following():
    try:
        username = "jehnfison"
        profile = instaloader.Profile.from_username(L.context, username)

        followers = []
        for follower in profile.get_followers():
            followers.append(follower.username)

        followees = []
        for followee in profile.get_followees():
            followees.append(followee.username)

        data = {
            "followers": followers,
            "following": followees
        }

        json_data = json.dumps(data, ensure_ascii=False)
        buffer = io.BytesIO()
        buffer.write(json_data.encode('utf-8'))
        buffer.seek(0)

        return send_file(buffer, mimetype='application/json', as_attachment=True, download_name='followers_following.json')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
