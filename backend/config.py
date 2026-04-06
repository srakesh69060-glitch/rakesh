import os


class Config:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "ers_user")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "Root@123")
    DB_NAME = os.getenv("DB_NAME", "emergency_response")
    _DB_PORT_RAW = os.getenv("DB_PORT", "3306")
    try:
        DB_PORT = int(_DB_PORT_RAW)
    except (TypeError, ValueError):
        DB_PORT = 3306
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
