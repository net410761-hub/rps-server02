from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.environ.get('API_SECRET')
if not SECRET_KEY:
    print("❌ API_SECRET не задан")
    exit(1)

# Рекорды в памяти (для старта)
leaderboard = [
    {"name": "GODLIKE", "streak": 47},
    {"name": "Terminator", "streak": 42}
]

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    sorted_board = sorted(leaderboard, key=lambda x: x['streak'], reverse=True)
    return jsonify(sorted_board)

@app.route('/api/record-record', methods=['POST'])
def record_record():
    if request.headers.get('X-API-Key') != SECRET_KEY:
        return jsonify({'error': 'unauthorized'}), 401
    
    data = request.json
    leaderboard.append({"name": data['name'], "streak": data['streak']})
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
