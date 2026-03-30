CREATE DATABASE IF NOT EXISTS emergency_response;
USE emergency_response;

DROP TABLE IF EXISTS emergencies;
DROP TABLE IF EXISTS ambulances;
DROP TABLE IF EXISTS hospitals;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS districts;

CREATE TABLE IF NOT EXISTS districts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    district VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS ambulances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_name VARCHAR(100) NOT NULL,
    current_lat DECIMAL(10, 7) NOT NULL DEFAULT 0,
    current_lng DECIMAL(10, 7) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    accuracy_m DECIMAL(8, 2) NULL,
    speed_mps DECIMAL(8, 2) NULL,
    heading_deg DECIMAL(6, 2) NULL
);

CREATE TABLE IF NOT EXISTS emergencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    patient_phone VARCHAR(20) NOT NULL,
    district VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    emergency_type VARCHAR(50) NOT NULL,
    notes TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ambulance_id INT NULL,
    hospital_id INT NULL,
    report_text TEXT NULL,
    accuracy_m DECIMAL(8, 2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_emergency_ambulance FOREIGN KEY (ambulance_id) REFERENCES ambulances(id),
    CONSTRAINT fk_emergency_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

INSERT INTO districts (name) VALUES
('chennai'),
('vellore'),
('dindugal'),
('erode'),
('ambur'),
('pondiycherry'),
('ranipet'),
('kanchipuram'),
('tirupattur'),
('coimbatore');

INSERT INTO hospitals (name, district, location, contact) VALUES
('City Care Hospital', 'chennai', '13.0827, 80.2707', '+91-44-5555-1111'),
('Vellore General Hospital', 'vellore', '12.9165, 79.1325', '+91-416-5555-2222'),
('Coimbatore Life Center', 'coimbatore', '11.0168, 76.9558', '+91-422-5555-3333');

INSERT INTO ambulances (driver_name, current_lat, current_lng, status) VALUES
('Ravi Kumar', 13.0827, 80.2707, 'available'),
('Meera B', 11.0168, 76.9558, 'available');
UPDATE ambulances SET current_lat = 13.0827, current_lng = 80.2707 WHERE id = 1;
UPDATE ambulances SET current_lat = 11.0168, current_lng = 76.9558 WHERE id = 2;

UPDATE hospitals SET location = '13.0827, 80.2707' WHERE id = 1;
UPDATE hospitals SET location = '12.9165, 79.1325' WHERE id = 2;
UPDATE hospitals SET location = '11.0168, 76.9558' WHERE id = 3;
