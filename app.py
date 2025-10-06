from flask import Flask, request, jsonify
import instaloader

app = Flask(__name__)

@app.route('/stories', methods=['GET'])
def get_stories():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Usuário não informado'}), 400

    try:
        L = instaloader.Instaloader()
        # Login opcional (necessário para stories privados)
        # L.login('seu_usuario', 'sua_senha')

        profile = instaloader.Profile.from_username(L.context, username)
        stories = []

        for story in L.get_stories():
            for item in story.get_items():
                if item.owner_username == username:
                    stories.append({
                        'url': item.url,
                        'date': item.date.strftime('%Y-%m-%d %H:%M:%S')
                    })

        return jsonify({'stories': stories})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
