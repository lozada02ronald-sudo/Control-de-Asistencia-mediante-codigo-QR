-- ==========================================================
-- AcadeQR — Script Completo MySQL para XAMPP / phpMyAdmin
-- Sistema Institucional de Control de Asistencia mediante QR
-- ==========================================================

-- 1. Creación de la Base de Datos
CREATE DATABASE IF NOT EXISTS `acadeqr_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `acadeqr_db`;

-- Desactivar chequeo de claves foráneas para recreación limpia
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `asistencias`;
DROP TABLE IF EXISTS `codigos_qr`;
DROP TABLE IF EXISTS `sesiones`;
DROP TABLE IF EXISTS `usuarios`;
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- 2. Estructura de Tablas
-- ==========================================================

-- Tabla de Usuarios (Administradores, Instructores, Aprendices)
CREATE TABLE `usuarios` (
  `id` CHAR(36) NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `documento` VARCHAR(40) NULL,
  `email` VARCHAR(160) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol` ENUM('ADMIN', 'INSTRUCTOR', 'APRENDIZ') NOT NULL DEFAULT 'APRENDIZ',
  `empresa` VARCHAR(160) NULL,
  `programa` VARCHAR(160) NULL,
  `sede` VARCHAR(120) NULL,
  `avatar_color` VARCHAR(20) DEFAULT '#006948',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_usuarios_rol_activo` (`rol`, `activo`),
  INDEX `idx_usuarios_documento` (`documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Sesiones de Clase
CREATE TABLE `sesiones` (
  `id` CHAR(36) NOT NULL,
  `instructor_id` CHAR(36) NOT NULL,
  `codigo_cohorte` VARCHAR(40) NOT NULL,
  `nombre` VARCHAR(180) NOT NULL,
  `departamento` VARCHAR(160) NULL,
  `sede` VARCHAR(120) NOT NULL,
  `aula` VARCHAR(80) NOT NULL,
  `fecha` DATE NOT NULL,
  `hora_inicio` TIME NOT NULL DEFAULT '08:00:00',
  `hora_fin` TIME NOT NULL DEFAULT '12:00:00',
  `activa` TINYINT(1) NOT NULL DEFAULT 1,
  `geocerca_metros` INT NOT NULL DEFAULT 50,
  `gracia_minutos` INT NOT NULL DEFAULT 15,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sesiones_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_sesiones_instructor_activa` (`instructor_id`, `activa`),
  INDEX `idx_sesiones_fecha` (`fecha`),
  INDEX `idx_sesiones_cohorte` (`codigo_cohorte`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Tokens de Código QR Dinámicos Rotativos
CREATE TABLE `codigos_qr` (
  `id` CHAR(36) NOT NULL,
  `sesion_id` CHAR(36) NOT NULL,
  `token` VARCHAR(128) NOT NULL UNIQUE,
  `expira_en` DATETIME NOT NULL,
  `revocado` TINYINT(1) NOT NULL DEFAULT 0,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_qr_sesion` FOREIGN KEY (`sesion_id`) REFERENCES `sesiones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_qr_sesion_expira` (`sesion_id`, `expira_en`, `revocado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Registros de Asistencia
CREATE TABLE `asistencias` (
  `id` CHAR(36) NOT NULL,
  `sesion_id` CHAR(36) NOT NULL,
  `aprendiz_id` CHAR(36) NOT NULL,
  `estado` ENUM('PRESENTE', 'TARDANZA', 'AUSENTE', 'EXCUSA') NOT NULL DEFAULT 'PRESENTE',
  `metodo` VARCHAR(40) NOT NULL DEFAULT 'Dynamic QR',
  `distancia_metros` INT NULL,
  `firma_token` VARCHAR(64) NULL,
  `nota` VARCHAR(255) NULL,
  `fecha_registro` DATE NOT NULL,
  `registrado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_asistencia_sesion` FOREIGN KEY (`sesion_id`) REFERENCES `sesiones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_asistencia_aprendiz` FOREIGN KEY (`aprendiz_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY `uq_asistencia_unica` (`sesion_id`, `aprendiz_id`, `fecha_registro`),
  INDEX `idx_asistencias_aprendiz` (`aprendiz_id`, `registrado_en`),
  INDEX `idx_asistencias_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 3. Inserción de Datos Iniciales (Seed Data para Pruebas)
-- ==========================================================

-- Usuarios Iniciales: Admin, Instructores y Aprendices
INSERT INTO `usuarios` (`id`, `nombre`, `documento`, `email`, `password_hash`, `rol`, `programa`, `sede`, `avatar_color`, `activo`) VALUES
-- Administrador
('usr-admin-01', 'Coordinador Académico General', 'CC 19.845.221', 'admin@acadeqr.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'ADMIN', 'Dirección de Formación Profesional', 'Sede Central', '#0f172a', 1),

-- Instructores
('usr-inst-01', 'Ing. Mateo Restrepo', 'CC 71.392.840', 'mateo.restrepo@sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'INSTRUCTOR', 'Mecatrónica y Automatización', 'Sede Técnica Norte', '#006948', 1),
('usr-inst-02', 'Inst. Carolina Suárez', 'CC 43.882.109', 'carolina.suarez@sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'INSTRUCTOR', 'Fabricación Mecánica CNC', 'Sede Técnica Norte', '#0051d5', 1),
('usr-inst-03', 'Dr. Carlos Mendoza', 'CC 98.411.022', 'carlos.mendoza@sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'INSTRUCTOR', 'Electrónica y Robótica', 'Sede Central', '#8d4b00', 1),

-- Aprendices Ficha 2841 (Mecatrónica)
('lrn-01', 'Camila Mendoza Ruiz', 'CC 1.094.882.310', 'camila.mendoza@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#006948', 1),
('lrn-02', 'Santiago Vargas Gil', 'CC 1.018.490.224', 'santiago.vargas@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#0051d5', 1),
('lrn-03', 'Valentina Herrera Castro', 'CC 1.032.774.901', 'valentina.herrera@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#0f172a', 1),
('lrn-04', 'Andrés Felipe Morales', 'CC 1.088.341.552', 'andres.morales@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#8d4b00', 1),
('lrn-05', 'Lucía Fernanda Díaz', 'CC 1.005.619.048', 'lucia.diaz@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#006948', 1),
('lrn-06', 'Daniela Ospina Quintero', 'CC 1.112.903.117', 'daniela.ospina@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#0051d5', 1),
('lrn-07', 'Julián Esteban Rojas', 'CC 1.020.844.630', 'julian.rojas@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#3d4a42', 1),
('lrn-08', 'Mariana Gómez Salazar', 'CC 1.098.112.405', 'mariana.gomez@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#006948', 1),
('lrn-09', 'Sebastián Cano Arias', 'CC 1.045.229.883', 'sebastian.cano@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#8d4b00', 1),
('lrn-10', 'Sofía Pineda Beltrán', 'CC 1.077.510.992', 'sofia.pineda@soy.sena.edu.co', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'APRENDIZ', 'Tecnología en Mecatrónica', 'Sede Técnica Norte', '#0051d5', 1);

-- Sesiones de Clase
INSERT INTO `sesiones` (`id`, `instructor_id`, `codigo_cohorte`, `nombre`, `departamento`, `sede`, `aula`, `fecha`, `hora_inicio`, `hora_fin`, `activa`, `geocerca_metros`, `gracia_minutos`) VALUES
('ses-2841', 'usr-inst-01', 'COH-2841', 'Mecatrónica Industrial y Control PLC', 'Mecatrónica y Automatización', 'Sede Técnica Norte', 'Taller B-204', CURDATE(), '08:00:00', '12:00:00', 1, 50, 10),
('ses-3109', 'usr-inst-02', 'COH-3109', 'Fresado de Precisión CNC y Metrología', 'Fabricación Mecánica', 'Sede Técnica Norte', 'Bahía CNC C-102', CURDATE(), '08:30:00', '12:30:00', 1, 40, 10),
('ses-4120', 'usr-inst-03', 'COH-4120', 'Sistemas Embebidos y Robótica Móvil', 'Electrónica', 'Sede Central', 'Lab Robótica R-1', CURDATE(), '14:00:00', '18:00:00', 0, 60, 15);

-- Códigos QR de Ejemplo (Activos)
INSERT INTO `codigos_qr` (`id`, `sesion_id`, `token`, `expira_en`, `revocado`) VALUES
('qr-001', 'ses-2841', 'ACADEQR:COH-2841:TK-882194:SEC-104', DATE_ADD(NOW(), INTERVAL 25 SECOND), 0),
('qr-002', 'ses-3109', 'ACADEQR:COH-3109:TK-551029:SEC-072', DATE_ADD(NOW(), INTERVAL 20 SECOND), 0);

-- Registros de Asistencias Iniciales
INSERT INTO `asistencias` (`id`, `sesion_id`, `aprendiz_id`, `estado`, `metodo`, `distancia_metros`, `firma_token`, `nota`, `fecha_registro`, `registrado_en`) VALUES
('att-01', 'ses-2841', 'lrn-01', 'PRESENTE', 'Dynamic QR', 18, 'SIG-9A4F2C', NULL, CURDATE(), NOW() - INTERVAL 120 MINUTE),
('att-02', 'ses-2841', 'lrn-02', 'PRESENTE', 'Dynamic QR', 24, 'SIG-9A4F2C', NULL, CURDATE(), NOW() - INTERVAL 115 MINUTE),
('att-03', 'ses-2841', 'lrn-03', 'PRESENTE', 'Dynamic QR', 12, 'SIG-3B8E10', NULL, CURDATE(), NOW() - INTERVAL 110 MINUTE),
('att-04', 'ses-2841', 'lrn-04', 'TARDANZA', 'Dynamic QR', 31, 'SIG-7D1C44', 'Registro 14 min después del inicio', CURDATE(), NOW() - INTERVAL 95 MINUTE),
('att-05', 'ses-2841', 'lrn-05', 'PRESENTE', 'Dynamic QR', 9, 'SIG-4E2A9B', NULL, CURDATE(), NOW() - INTERVAL 125 MINUTE),
('att-06', 'ses-2841', 'lrn-06', 'PRESENTE', 'Manual Token', 27, 'SIG-3B8E10', NULL, CURDATE(), NOW() - INTERVAL 105 MINUTE),
('att-07', 'ses-2841', 'lrn-07', 'AUSENTE', 'None', NULL, NULL, 'Sin registro en sesión', CURDATE(), NOW()),
('att-08', 'ses-2841', 'lrn-08', 'PRESENTE', 'Dynamic QR', 15, 'SIG-9A4F2C', NULL, CURDATE(), NOW() - INTERVAL 118 MINUTE),
('att-09', 'ses-2841', 'lrn-09', 'PRESENTE', 'Dynamic QR', 22, 'SIG-3B8E10', NULL, CURDATE(), NOW() - INTERVAL 108 MINUTE),
('att-10', 'ses-2841', 'lrn-10', 'AUSENTE', 'None', NULL, NULL, 'Sin registro en sesión', CURDATE(), NOW());
