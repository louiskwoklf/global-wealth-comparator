from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/submit", methods=["POST"])
def submit():

    print("Endpoint hit")
    print("Request content type:", request.content_type)
    print("Request data raw:", request.data)
    print("Request json:", request.get_json())
    data = request.get_json()
    return jsonify(status="ok", received=data)

if __name__ == "__main__":
    app.run()