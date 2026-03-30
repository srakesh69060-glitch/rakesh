from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from models import execute, query_one


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    role = data.get("role", "user").strip() or "user"

    if not name or not phone or not password:
        return jsonify({"error": "name, phone, and password are required"}), 400

    existing = query_one("SELECT id FROM users WHERE phone = %s", (phone,))
    if existing:
        return jsonify({"error": "Phone already registered"}), 409

    password_hash = generate_password_hash(password)
    user_id = execute(
        "INSERT INTO users (name, phone, password, role) VALUES (%s, %s, %s, %s)",
        (name, phone, password_hash, role),
    )

    return (
        jsonify({"message": "Registered successfully", "user_id": user_id}),
        201,
    )


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    phone = data.get("phone", "").strip()
    password = data.get("password", "")

    if not phone or not password:
        return jsonify({"error": "phone and password are required"}), 400

    user = query_one(
        "SELECT id, name, phone, password, role FROM users WHERE phone = %s",
        (phone,),
    )
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify(
        {
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "phone": user["phone"],
                "role": user["role"],
            },
        }
    )
