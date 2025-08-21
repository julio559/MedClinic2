-- Database Schema para Medical AI App
-- MySQL

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS medical_ai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medical_ai_db;

-- Tabela de Usuários (Médicos)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    crm VARCHAR(50) UNIQUE NOT NULL,
    specialty VARCHAR(100),
    avatar TEXT,
    isActive BOOLEAN DEFAULT true,
    lastLogin DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Pacientes
CREATE TABLE patients (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    birthDate DATE,
    gender ENUM('M', 'F', 'Other'),
    address TEXT,
    medicalHistory TEXT,
    allergies TEXT,
    doctorId VARCHAR(36) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctorId) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Análises
CREATE TABLE analyses (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    symptoms TEXT,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    aiConfidenceScore DECIMAL(3,2),
    patientId VARCHAR(36) NOT NULL,
    doctorId VARCHAR(36) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Resultados das Análises
CREATE TABLE analysis_results (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    result TEXT NOT NULL,
    confidenceScore DECIMAL(3,2),
    aiModel VARCHAR(100),
    isCompleted BOOLEAN DEFAULT false,
    analysisId VARCHAR(36) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (analysisId) REFERENCES analyses(id) ON DELETE CASCADE
);

-- Tabela de Imagens Médicas
CREATE TABLE medical_images (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    originalName VARCHAR(255) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileSize INT NOT NULL,
    mimeType VARCHAR(100) NOT NULL,
    imageType ENUM('xray', 'mri', 'ct', 'ultrasound', 'photo', 'other') DEFAULT 'photo',
    analysisId VARCHAR(36) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (analysisId) REFERENCES analyses(id) ON DELETE CASCADE
);

-- Tabela de Assinaturas
CREATE TABLE subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    plan ENUM('trial', 'monthly', 'quarterly', 'annual') DEFAULT 'trial',
    status ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
    startDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    endDate DATETIME NOT NULL,
    analysisLimit INT NOT NULL DEFAULT 3,
    analysisUsed INT DEFAULT 0,
    userId VARCHAR(36) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Dados iniciais para teste (senha: 123456)
INSERT INTO users (id, name, email, password, crm, specialty, createdAt, updatedAt) VALUES 
('dr-ethan-123', 'Dr. Ethan Carter', 'ethan@medicalai.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/dQeJHUlPzWrEF6LLG', 'CRM123456', 'Dermatologia', NOW(), NOW()),
('dr-lucas-456', 'Dr. Lucas Mendes', 'lucas@medicalai.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/dQeJHUlPzWrEF6LLG', 'CRM789012', 'Cardiologia', NOW(), NOW());

-- Assinaturas iniciais
INSERT INTO subscriptions (id, plan, endDate, analysisLimit, userId, createdAt, updatedAt) VALUES 
('sub-ethan-123', 'trial', DATE_ADD(NOW(), INTERVAL 7 DAY), 3, 'dr-ethan-123', NOW(), NOW()),
('sub-lucas-456', 'trial', DATE_ADD(NOW(), INTERVAL 7 DAY), 3, 'dr-lucas-456', NOW(), NOW());

-- Pacientes de exemplo
INSERT INTO patients (id, name, email, phone, doctorId, createdAt, updatedAt) VALUES 
('patient-001', 'João Silva Santos', 'joao@email.com', '(11) 99999-9999', 'dr-ethan-123', NOW(), NOW()),
('patient-002', 'Maria Oliveira', 'maria@email.com', '(11) 88888-8888', 'dr-ethan-123', NOW(), NOW());
