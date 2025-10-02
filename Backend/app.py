from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import instaloader
import os
import tempfile

app = Flask(__name__)
CORS(app)

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

    try:
        # Create a temporary directory to save the video
        with tempfile.TemporaryDirectory() as tmpdirname:
            # Placeholder: Implement logic to download story video from story_url
            # For now, return not implemented error
            return jsonify({'error': 'Story video download not implemented yet'}), 501

            # If implemented, send the file:
            # return send_file(video_path, mimetype='video/mp4', as_attachment=True, download_name='story_video.mp4')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
