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

@app.route('/download_story_video', methods=['POST'])
def download_story_video():
    data = request.get_json()
    shortcode = data.get('shortcode')
    if not shortcode:
        return jsonify({'error': 'Missing shortcode parameter'}), 400

    try:
        # Create a temporary directory to save the video
        with tempfile.TemporaryDirectory() as tmpdirname:
            # Download the story video using Instaloader
            profile = instaloader.Profile.from_username(L.context, INSTAGRAM_USERNAME)
            # Note: Instaloader does not provide direct story download by shortcode,
            # so this is a placeholder for actual implementation.
            # You may need to adjust this logic based on Instaloader capabilities.

            # For demonstration, let's assume we have the video URL or path
            video_path = os.path.join(tmpdirname, 'story_video.mp4')

            # Here you would download or save the video to video_path

            # For now, just return an error to indicate this needs implementation
            return jsonify({'error': 'Story video download not implemented yet'}), 501

            # If implemented, send the file:
            # return send_file(video_path, mimetype='video/mp4', as_attachment=True, download_name='story_video.mp4')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
