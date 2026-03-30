import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from routes.auth import auth_bp
from routes.emergency import emergency_bp
from routes.ambulance import ambulance_bp


def create_app():
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
    app = Flask(__name__, static_folder=frontend_dir, static_url_path="")
    CORS(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(emergency_bp)
    app.register_blueprint(ambulance_bp)

    @app.get("/")
    def serve_index():
        return send_from_directory(frontend_dir, "index.html")

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok", "message": "Emergency Response API running"})

    @app.get("/<path:filename>")
    def serve_static(filename):
        return send_from_directory(frontend_dir, filename)

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(500)
    def server_error(_):
        return jsonify({"error": "Internal Server Error"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
