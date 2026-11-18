-- ==========================================================
-- AcadeQR — Script Inicial MySQL 8.4
-- Control de Asistencia mediante Código QR Dinámico
-- ==========================================================

CREATE DATABASE IF NOT EXISTS acadeqr_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE acadeqr_db;

CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  documento VARCHAR(40) NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ADMIN', 'INSTRUCTOR', 'APRENDIZ') NOT NULL DEFAULT 'APRENDIZ',
  empresa VARCHAR(160) NULL,
  programa VARCHAR(160) NULL,
  sede VARCHAR(120) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuarios_rol_activo (rol, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sesiones (
  id CHAR(36) NOT NULL PRIMARY KEY,
  instructor_id CHAR(36) NOT NULL,
  codigo_cohorte VARCHAR(40) NOT NULL,
  nombre VARCHAR(180) NOT NULL,
  sede VARCHAR(120) NOT NULL,
  aula VARCHAR(80) NOT NULL,
  fecha DATE NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  geocerca_metros INT NOT NULL DEFAULT 50,
  gracia_minutos INT NOT NULL DEFAULT 15,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sesiones_instructor FOREIGN KEY (instructor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_sesiones_instructor_activa (instructor_id, activa),
  INDEX idx_sesiones_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS codigos_qr (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sesion_id CHAR(36) NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expira_en DATETIME NOT NULL,
  revocado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_qr_sesion FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE,
  INDEX idx_qr_sesion_expira (sesion_id, expira_en, revocado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asistencias (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sesion_id CHAR(36) NOT NULL,
  aprendiz_id CHAR(36) NOT NULL,
  estado ENUM('PRESENTE', 'TARDANZA', 'AUSENTE', 'EXCUSA') NOT NULL DEFAULT 'PRESENTE',
  metodo VARCHAR(40) NOT NULL DEFAULT 'Dynamic QR',
  distancia_metros INT NULL,
  firma_token VARCHAR(64) NULL,
  fecha_registro DATE NOT NULL,
  registrado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asistencia_sesion FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asistencia_aprendiz FOREIGN KEY (aprendiz_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_asistencia_unica (sesion_id, aprendiz_id, fecha_registro),
  INDEX idx_asistencias_aprendiz (aprendiz_id, registrado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
