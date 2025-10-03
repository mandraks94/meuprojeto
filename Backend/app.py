from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import asyncio
from pyppeteer import launch

app = Flask(__name__)
# Ajustar CORS para permitir requisições do Instagram
from flask_cors import CORS

cors = CORS(app, resources={
    r"/*": {
        "origins": "*",
        "supports_credentials": True
    }
})

import os

async def capture_media_from_story(url):
    browser = await launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
    page = await browser.newPage()

    INSTAGRAM_USERNAME = os.getenv('INSTAGRAM_USERNAME')
    INSTAGRAM_PASSWORD = os.getenv('INSTAGRAM_PASSWORD')

    if INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD:
        # Fazer login no Instagram
        await page.goto('https://www.instagram.com/accounts/login/', {'waitUntil': 'networkidle2'})
        await page.type('input[name="username"]', INSTAGRAM_USERNAME, {'delay': 100})
        await page.type('input[name="password"]', INSTAGRAM_PASSWORD, {'delay': 100})
        await page.click('button[type="submit"]')
        # Esperar a navegação após login
        await page.waitForNavigation({'waitUntil': 'networkidle2'})

    await page.goto(url, {'waitUntil': 'networkidle2'})

    # Tentar capturar vídeo ou imagem da story
    video_url = await page.evaluate('''() => {
        const video = document.querySelector('video');
        if (video && video.src) {
            return video.src;
        }
        const img = document.querySelector('img');
        if (img && img.src) {
            return img.src;
        }
        return null;
    }''')

    if not video_url:
        await browser.close()
        return None, None

    # Baixar o arquivo para um arquivo temporário
    import aiohttp
    import tempfile

    async with aiohttp.ClientSession() as session:
        async with session.get(video_url) as resp:
            if resp.status != 200:
                await browser.close()
                return None, None
            suffix = '.mp4' if video_url.endswith('.mp4') else '.jpg'
            tmpfile = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            content = await resp.read()
            tmpfile.write(content)
            tmpfile.close()

    await browser.close()
    return tmpfile.name, 'video/mp4' if suffix == '.mp4' else 'image/jpeg'

@app.route('/download_story_media', methods=['POST', 'GET'])
def download_story_media():
    if request.method == 'POST':
        if request.content_type == 'application/json':
            data = request.get_json()
            story_url = data.get('story_url')
        else:
            story_url = request.form.get('story_url')
    else:
        story_url = request.args.get('story_url')

    if not story_url:
        return jsonify({'error': 'Missing story_url parameter'}), 400

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        filepath, mimetype = loop.run_until_complete(capture_media_from_story(story_url))
        if not filepath:
            return jsonify({'error': 'Could not capture media from story'}), 404
        return send_file(filepath, mimetype=mimetype, as_attachment=True, download_name='story_media')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
