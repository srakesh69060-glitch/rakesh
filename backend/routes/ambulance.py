from flask import Blueprint, jsonify, request

from models import execute, query_all, query_one


ambulance_bp = Blueprint("ambulance", __name__)

INDIA_BOUNDS = {
    "min_lat": 6.0,
    "max_lat": 37.5,
    "min_lng": 68.0,
    "max_lng": 97.5,
}


def is_in_india(lat, lng):
    return (
        INDIA_BOUNDS["min_lat"] <= lat <= INDIA_BOUNDS["max_lat"]
        and INDIA_BOUNDS["min_lng"] <= lng <= INDIA_BOUNDS["max_lng"]
    )


def parse_lat_lng(text):
    parts = [p.strip() for p in (text or "").split(",")]
    if len(parts) != 2:
        return None
    try:
        lat = float(parts[0])
        lng = float(parts[1])
    except ValueError:
        return None
    return lat, lng


def cleanup_invalid_locations():
    # Non-destructive cleanup for invalid legacy rows.
    execute(
        """
        UPDATE ambulances
        SET status = 'invalid_location',
            accuracy_m = NULL,
            speed_mps = NULL,
            heading_deg = NULL
        WHERE current_lat IS NOT NULL
          AND current_lng IS NOT NULL
          AND (
              current_lat < %s OR current_lat > %s
              OR current_lng < %s OR current_lng > %s
          )
        """,
        (
            INDIA_BOUNDS["min_lat"],
            INDIA_BOUNDS["max_lat"],
            INDIA_BOUNDS["min_lng"],
            INDIA_BOUNDS["max_lng"],
        ),
    )


@ambulance_bp.post("/update_ambulance")
def update_ambulance():
    data = request.get_json(silent=True) or {}
    ambulance_id = data.get("ambulance_id")
    current_lat = data.get("current_lat")
    current_lng = data.get("current_lng")
    status = data.get("status", "available").strip() or "available"
    accuracy_m = data.get("accuracy_m")
    speed_mps = data.get("speed_mps")
    heading_deg = data.get("heading_deg")

    if not ambulance_id or current_lat is None or current_lng is None:
        return jsonify({"error": "ambulance_id, current_lat, and current_lng are required"}), 400
    try:
        current_lat = float(current_lat)
        current_lng = float(current_lng)
    except (TypeError, ValueError):
        return jsonify({"error": "current_lat and current_lng must be numbers"}), 400
    if not is_in_india(current_lat, current_lng):
        return jsonify({"error": "Ambulance location must be within India bounds."}), 400

    if accuracy_m is not None:
        try:
            accuracy_m = float(accuracy_m)
        except (TypeError, ValueError):
            return jsonify({"error": "accuracy_m must be a number"}), 400
    if speed_mps is not None:
        try:
            speed_mps = float(speed_mps)
        except (TypeError, ValueError):
            return jsonify({"error": "speed_mps must be a number"}), 400
    if heading_deg is not None:
        try:
            heading_deg = float(heading_deg)
        except (TypeError, ValueError):
            return jsonify({"error": "heading_deg must be a number"}), 400

    ambulance = query_one("SELECT id FROM ambulances WHERE id = %s", (ambulance_id,))
    if not ambulance:
        return jsonify({"error": "Ambulance not found"}), 404

    execute(
        """
        UPDATE ambulances
        SET current_lat = %s,
            current_lng = %s,
            status = %s,
            accuracy_m = %s,
            speed_mps = %s,
            heading_deg = %s
        WHERE id = %s
        """,
        (current_lat, current_lng, status, accuracy_m, speed_mps, heading_deg, ambulance_id),
    )

    return jsonify({"message": "Ambulance updated"})


@ambulance_bp.get("/ambulances")
def list_ambulances():
    cleanup_invalid_locations()
    rows = query_all(
        """
        SELECT id, driver_name, current_lat, current_lng, status,
               updated_at, accuracy_m, speed_mps, heading_deg
        FROM ambulances
        WHERE current_lat BETWEEN %s AND %s
          AND current_lng BETWEEN %s AND %s
          AND status <> 'invalid_location'
        """,
        (
            INDIA_BOUNDS["min_lat"],
            INDIA_BOUNDS["max_lat"],
            INDIA_BOUNDS["min_lng"],
            INDIA_BOUNDS["max_lng"],
        ),
    )
    return jsonify({"ambulances": rows})


@ambulance_bp.post("/ambulance")
def create_ambulance():
    data = request.get_json(silent=True) or {}
    driver_name = data.get("driver_name", "").strip()
    current_lat = data.get("current_lat", 0.0)
    current_lng = data.get("current_lng", 0.0)
    status = data.get("status", "available").strip() or "available"

    if not driver_name:
        return jsonify({"error": "driver_name is required"}), 400
    try:
        current_lat = float(current_lat)
        current_lng = float(current_lng)
    except (TypeError, ValueError):
        return jsonify({"error": "current_lat and current_lng must be numbers"}), 400
    if not is_in_india(current_lat, current_lng):
        return jsonify({"error": "Ambulance location must be within India bounds."}), 400

    ambulance_id = execute(
        "INSERT INTO ambulances (driver_name, current_lat, current_lng, status) VALUES (%s, %s, %s, %s)",
        (driver_name, current_lat, current_lng, status),
    )

    return jsonify({"message": "Ambulance created", "ambulance_id": ambulance_id}), 201


@ambulance_bp.get("/hospitals")
def list_hospitals():
    rows = query_all("SELECT id, name, district, location, contact FROM hospitals")
    return jsonify({"hospitals": rows})


@ambulance_bp.post("/hospital")
def create_hospital():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    district = data.get("district", "").strip()
    location = data.get("location", "").strip()
    contact = data.get("contact", "").strip()

    if not name or not district or not location or not contact:
        return jsonify({"error": "name, district, location, and contact are required"}), 400
    coords = parse_lat_lng(location)
    if not coords:
        return jsonify({"error": "Invalid location format. Use 'lat, lng'"}), 400
    if not is_in_india(coords[0], coords[1]):
        return jsonify({"error": "Hospital location must be within India bounds."}), 400

    hospital_id = execute(
        "INSERT INTO hospitals (name, district, location, contact) VALUES (%s, %s, %s, %s)",
        (name, district, location, contact),
    )

    return jsonify({"message": "Hospital created", "hospital_id": hospital_id}), 201
