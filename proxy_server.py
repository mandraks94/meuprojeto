from flask import Flask, request, Response
import requests

app = Flask(__name__)

# Proxy para contornar restrições de CSP
@app.route('/proxy', methods=['POST'])
def proxy():
    data = request.get_json()
    url = data.get('url')
    if not url:
        return Response("Missing url parameter", status=400)

    try:
        resp = requests.get(url, stream=True)
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]
        return Response(resp.content, resp.status_code, headers)
    except Exception as e:
        return Response(f"Error fetching url: {str(e)}", status=500)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
