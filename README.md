# Real-Time Emergency Response System for Rural Areas

## Overview
Full-stack web application for rural emergency reporting, hospital coordination, and real-time ambulance tracking. Frontend is served directly by Flask (single URL).

## Tech Stack
- Backend: Flask, Flask-CORS, MySQL, mysql-connector-python
- Frontend: HTML, CSS, JavaScript
- Maps: Google Maps API

## Setup
1. Create MySQL database and tables:
   - Run `database.sql` in MySQL Workbench or CLI.
2. Configure database credentials in `backend/config.py`.
3. Install backend dependencies:
   - `pip install -r requirements.txt`

## Run Locally (Single Server)
```bash
cd backend
python app.py
```
Then open:
```
http://localhost:5000
```

## Default Coverage Districts
- chennai
- vellore
- dindugal
- erode
- ambur
- pondiycherry
- ranipet
- kanchipuram
- tirupattur
- coimbatore

## API Endpoints (Key)
- GET `/districts`
- POST `/emergency`
- GET `/emergencies`
- GET `/emergency/<id>`
- POST `/emergency/assign`
- POST `/emergency/status`
- POST `/update_ambulance`
- GET `/ambulances`
- GET `/hospitals`

## Google Maps
Replace `YOUR_GOOGLE_MAPS_API_KEY` in `frontend/map.html`.
