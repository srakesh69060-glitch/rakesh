from flask import Blueprint, jsonify, request

from models import execute, query_all, query_one


emergency_bp = Blueprint("emergency", __name__)

ALLOWED_TYPES = {"Accident", "Heart attack", "Pregnancy emergency", "Trauma"}
ALLOWED_STATUS = {"pending", "assigned", "enroute", "completed", "cancelled"}
DEFAULT_DISTRICTS = [
    "chennai",
    "vellore",
    "dindugal",
    "erode",
    "ambur",
    "pondiycherry",
    "ranipet",
    "kanchipuram",
    "tirupattur",
    "coimbatore",
]
INDIA_BOUNDS = {
    "min_lat": 6.0,
    "max_lat": 37.5,
    "min_lng": 68.0,
    "max_lng": 97.5,
}


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


def is_in_india(lat, lng):
    return (
        INDIA_BOUNDS["min_lat"] <= lat <= INDIA_BOUNDS["max_lat"]
        and INDIA_BOUNDS["min_lng"] <= lng <= INDIA_BOUNDS["max_lng"]
    )


def get_districts():
    try:
        rows = query_all("SELECT name FROM districts ORDER BY name")
        names = [row["name"] for row in rows if row.get("name")]
        if names:
            return names
    except Exception:
        pass
    return DEFAULT_DISTRICTS


@emergency_bp.get("/districts")
def list_districts():
    return jsonify({"districts": get_districts()})


@emergency_bp.post("/emergency")
def create_emergency():
    data = request.get_json(silent=True) or {}
    patient_name = data.get("patient_name", "").strip()
    patient_phone = data.get("patient_phone", "").strip()
    district = data.get("district", "").strip()
    emergency_type = data.get("emergency_type", "").strip()
    location = data.get("location", "").strip()
    notes = data.get("notes", "").strip() or None

    if not patient_name or not patient_phone or not district or not emergency_type or not location:
        return (
            jsonify(
                {
                    "error": "patient_name, patient_phone, district, emergency_type, and location are required"
                }
            ),
            400,
        )

    if emergency_type not in ALLOWED_TYPES:
        return (
            jsonify({"error": f"Invalid emergency_type. Use one of: {', '.join(ALLOWED_TYPES)}"}),
            400,
        )

    coords = parse_lat_lng(location)
    if not coords:
        return jsonify({"error": "Invalid location format. Use 'lat, lng'"}), 400
    if not is_in_india(coords[0], coords[1]):
        return jsonify({"error": "Location must be within India bounds."}), 400

    if district not in set(get_districts()):
        return jsonify({"error": "Invalid district"}), 400

    hospital = query_one(
        "SELECT id, name, location, contact FROM hospitals WHERE district = %s ORDER BY id LIMIT 1",
        (district,),
    )

    emergency_id = execute(
        """
        INSERT INTO emergencies (
            patient_name, patient_phone, district, location, emergency_type, notes, status, hospital_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            patient_name,
            patient_phone,
            district,
            location,
            emergency_type,
            notes,
            "pending",
            hospital["id"] if hospital else None,
        ),
    )

    return (
        jsonify(
            {
                "message": "Emergency created",
                "emergency_id": emergency_id,
                "suggested_hospital": hospital,
            }
        ),
        201,
    )


@emergency_bp.post("/emergency/location")
def update_emergency_location():
    data = request.get_json(silent=True) or {}
    emergency_id = data.get("emergency_id")
    location = data.get("location", "").strip()
    accuracy_m = data.get("accuracy_m")

    if not emergency_id or not location:
        return jsonify({"error": "emergency_id and location are required"}), 400

    coords = parse_lat_lng(location)
    if not coords:
        return jsonify({"error": "Invalid location format. Use 'lat, lng'"}), 400
    if not is_in_india(coords[0], coords[1]):
        return jsonify({"error": "Location must be within India bounds."}), 400

    if accuracy_m is not None:
        try:
            accuracy_m = float(accuracy_m)
        except (TypeError, ValueError):
            return jsonify({"error": "accuracy_m must be a number"}), 400

    emergency = query_one("SELECT id FROM emergencies WHERE id = %s", (emergency_id,))
    if not emergency:
        return jsonify({"error": "Emergency not found"}), 404

    execute(
        "UPDATE emergencies SET location = %s, accuracy_m = %s WHERE id = %s",
        (location, accuracy_m, emergency_id),
    )

    return jsonify({"message": "Emergency location updated"})


@emergency_bp.get("/emergencies")
def list_emergencies():
    status = request.args.get("status", "").strip()
    district = request.args.get("district", "").strip()

    query = """
        SELECT e.id, e.patient_name, e.patient_phone, e.district, e.location,
               e.emergency_type, e.notes, e.status, e.ambulance_id, e.hospital_id,
               e.report_text, e.created_at, e.resolved_at,
               e.accuracy_m,
               h.name AS hospital_name, h.contact AS hospital_contact,
               a.driver_name AS ambulance_driver
        FROM emergencies e
        LEFT JOIN hospitals h ON e.hospital_id = h.id
        LEFT JOIN ambulances a ON e.ambulance_id = a.id
    """

    params = []
    filters = []
    if status:
        filters.append("e.status = %s")
        params.append(status)
    if district:
        filters.append("e.district = %s")
        params.append(district)

    if filters:
        query += " WHERE " + " AND ".join(filters)

    query += " ORDER BY e.created_at DESC"

    rows = query_all(query, tuple(params))
    return jsonify({"emergencies": rows})


@emergency_bp.get("/emergency/<int:emergency_id>")
def get_emergency(emergency_id):
    row = query_one(
        """
        SELECT e.id, e.patient_name, e.patient_phone, e.district, e.location,
               e.emergency_type, e.notes, e.status, e.ambulance_id, e.hospital_id,
               e.report_text, e.created_at, e.resolved_at,
               e.accuracy_m,
               h.name AS hospital_name, h.contact AS hospital_contact,
               a.driver_name AS ambulance_driver
        FROM emergencies e
        LEFT JOIN hospitals h ON e.hospital_id = h.id
        LEFT JOIN ambulances a ON e.ambulance_id = a.id
        WHERE e.id = %s
        """,
        (emergency_id,),
    )

    if not row:
        return jsonify({"error": "Emergency not found"}), 404

    return jsonify({"emergency": row})


@emergency_bp.post("/emergency/assign")
def assign_resources():
    data = request.get_json(silent=True) or {}
    emergency_id = data.get("emergency_id")
    ambulance_id = data.get("ambulance_id")
    hospital_id = data.get("hospital_id")

    if not emergency_id:
        return jsonify({"error": "emergency_id is required"}), 400

    if not ambulance_id and not hospital_id:
        return jsonify({"error": "ambulance_id or hospital_id is required"}), 400

    emergency = query_one("SELECT id FROM emergencies WHERE id = %s", (emergency_id,))
    if not emergency:
        return jsonify({"error": "Emergency not found"}), 404

    if ambulance_id:
        ambulance = query_one("SELECT id FROM ambulances WHERE id = %s", (ambulance_id,))
        if not ambulance:
            return jsonify({"error": "Ambulance not found"}), 404

    if hospital_id:
        hospital = query_one("SELECT id FROM hospitals WHERE id = %s", (hospital_id,))
        if not hospital:
            return jsonify({"error": "Hospital not found"}), 404

    execute(
        "UPDATE emergencies SET ambulance_id = %s, hospital_id = %s, status = %s WHERE id = %s",
        (ambulance_id, hospital_id, "assigned", emergency_id),
    )

    return jsonify({"message": "Resources assigned"})


@emergency_bp.post("/emergency/status")
def update_emergency_status():
    data = request.get_json(silent=True) or {}
    emergency_id = data.get("emergency_id")
    status = data.get("status", "").strip()
    report_text = data.get("report_text")

    if not emergency_id or not status:
        return jsonify({"error": "emergency_id and status are required"}), 400

    if status not in ALLOWED_STATUS:
        return (
            jsonify({"error": f"Invalid status. Use one of: {', '.join(ALLOWED_STATUS)}"}),
            400,
        )

    emergency = query_one("SELECT id FROM emergencies WHERE id = %s", (emergency_id,))
    if not emergency:
        return jsonify({"error": "Emergency not found"}), 404

    if status in {"completed", "cancelled"}:
        execute(
            "UPDATE emergencies SET status = %s, report_text = %s, resolved_at = NOW() WHERE id = %s",
            (status, report_text, emergency_id),
        )
    else:
        execute(
            "UPDATE emergencies SET status = %s, report_text = %s WHERE id = %s",
            (status, report_text, emergency_id),
        )

    return jsonify({"message": "Status updated"})
