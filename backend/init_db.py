"""
AcadeQR — Script de Inicialización y Poblado de Base de Datos MySQL (XAMPP)
Crea la base de datos `acadeqr_db`, sus tablas relacionales y registros iniciales (seed).
"""

import sys
import uuid
import datetime
import pymysql
import bcrypt

DB_HOST = "localhost"
DB_PORT = 3306
DB_USER = "root"
DB_PASSWORD = ""
DB_NAME = "acadeqr_db"


def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def initialize_database():
    print(f"[*] Conectando a MySQL en {DB_HOST}:{DB_PORT} como '{DB_USER}'...")
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            autocommit=True,
            charset="utf8mb4",
        )
    except Exception as e:
        print(f"[!] Error conectando a MySQL: {e}")
        print("[!] Asegúrate de que MySQL en XAMPP esté iniciado (puerto 3306).")
        sys.exit(1)

    with conn.cursor() as cursor:
        print(f"[*] Creando base de datos `{DB_NAME}` si no existe...")
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )
        cursor.execute(f"USE `{DB_NAME}`;")

        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")

        print("[*] Creando tabla `usuarios`...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS `usuarios` (
                `id` VARCHAR(36) NOT NULL PRIMARY KEY,
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
                INDEX `idx_usuarios_rol_activo` (`rol`, `activo`),
                INDEX `idx_usuarios_documento` (`documento`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
        )

        print("[*] Creando tabla `sesiones`...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS `sesiones` (
                `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                `instructor_id` VARCHAR(36) NOT NULL,
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
                INDEX `idx_sesiones_instructor_activa` (`instructor_id`, `activa`),
                INDEX `idx_sesiones_fecha` (`fecha`),
                INDEX `idx_sesiones_cohorte` (`codigo_cohorte`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
        )

        print("[*] Creando tabla `codigos_qr`...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS `codigos_qr` (
                `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                `sesion_id` VARCHAR(36) NOT NULL,
                `token` VARCHAR(128) NOT NULL UNIQUE,
                `expira_en` DATETIME NOT NULL,
                `revocado` TINYINT(1) NOT NULL DEFAULT 0,
                `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_qr_sesion_expira` (`sesion_id`, `expira_en`, `revocado`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
        )

        print("[*] Creando tabla `asistencias`...")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS `asistencias` (
                `id` VARCHAR(36) NOT NULL PRIMARY KEY,
                `sesion_id` VARCHAR(36) NOT NULL,
                `aprendiz_id` VARCHAR(36) NOT NULL,
                `estado` ENUM('PRESENTE', 'TARDANZA', 'AUSENTE', 'EXCUSA') NOT NULL DEFAULT 'PRESENTE',
                `metodo` VARCHAR(40) NOT NULL DEFAULT 'Dynamic QR',
                `distancia_metros` INT NULL,
                `firma_token` VARCHAR(64) NULL,
                `nota` VARCHAR(255) NULL,
                `fecha_registro` DATE NOT NULL,
                `registrado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY `uq_asistencia_unica` (`sesion_id`, `aprendiz_id`, `fecha_registro`),
                INDEX `idx_asistencias_aprendiz` (`aprendiz_id`, `registrado_en`),
                INDEX `idx_asistencias_estado` (`estado`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
        )

        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

        # Comprobar si ya existen usuarios para evitar duplicar seeds
        cursor.execute("SELECT COUNT(*) FROM `usuarios`;")
        count = cursor.fetchone()[0]

        if count == 0:
            print("[*] Insertando datos iniciales (Seeds) con contraseñas seguras...")
            default_password_hash = hash_password("123456")
            admin_password_hash = hash_password("Admin123!")

            users_seed = [
                (
                    "usr-admin-01",
                    "Coordinador Académico General",
                    "CC 19.845.221",
                    "admin@acadeqr.edu.co",
                    admin_password_hash,
                    "ADMIN",
                    "Dirección de Formación",
                    "Sede Central",
                    "#0f172a",
                    1,
                ),
                (
                    "usr-inst-01",
                    "Ing. Mateo Restrepo",
                    "CC 71.392.840",
                    "mateo.restrepo@sena.edu.co",
                    default_password_hash,
                    "INSTRUCTOR",
                    "Mecatrónica y Automatización",
                    "Sede Técnica Norte",
                    "#006948",
                    1,
                ),
                (
                    "usr-inst-02",
                    "Inst. Carolina Suárez",
                    "CC 43.882.109",
                    "carolina.suarez@sena.edu.co",
                    default_password_hash,
                    "INSTRUCTOR",
                    "Fabricación Mecánica CNC",
                    "Sede Técnica Norte",
                    "#0051d5",
                    1,
                ),
                (
                    "lrn-01",
                    "Camila Mendoza Ruiz",
                    "CC 1.094.882.310",
                    "camila.mendoza@soy.sena.edu.co",
                    default_password_hash,
                    "APRENDIZ",
                    "Tecnología en Mecatrónica",
                    "Sede Técnica Norte",
                    "#006948",
                    1,
                ),
                (
                    "lrn-02",
                    "Santiago Vargas Gil",
                    "CC 1.018.490.224",
                    "santiago.vargas@soy.sena.edu.co",
                    default_password_hash,
                    "APRENDIZ",
                    "Tecnología en Mecatrónica",
                    "Sede Técnica Norte",
                    "#0051d5",
                    1,
                ),
                (
                    "lrn-03",
                    "Valentina Herrera Castro",
                    "CC 1.032.774.901",
                    "valentina.herrera@soy.sena.edu.co",
                    default_password_hash,
                    "APRENDIZ",
                    "Tecnología en Mecatrónica",
                    "Sede Técnica Norte",
                    "#0f172a",
                    1,
                ),
                (
                    "lrn-04",
                    "Andrés Felipe Morales",
                    "CC 1.088.341.552",
                    "andres.morales@soy.sena.edu.co",
                    default_password_hash,
                    "APRENDIZ",
                    "Tecnología en Mecatrónica",
                    "Sede Técnica Norte",
                    "#8d4b00",
                    1,
                ),
            ]

            cursor.executemany(
                """
                INSERT INTO `usuarios` 
                (`id`, `nombre`, `documento`, `email`, `password_hash`, `rol`, `programa`, `sede`, `avatar_color`, `activo`)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                users_seed,
            )

            today = datetime.date.today().isoformat()
            sessions_seed = [
                (
                    "ses-2841",
                    "usr-inst-01",
                    "COH-2841",
                    "Mecatrónica Industrial y Control PLC",
                    "Mecatrónica y Automatización",
                    "Sede Técnica Norte",
                    "Taller B-204",
                    today,
                    "08:00:00",
                    "12:00:00",
                    1,
                    50,
                    15,
                ),
                (
                    "ses-3109",
                    "usr-inst-02",
                    "COH-3109",
                    "Fresado de Precisión CNC y Metrología",
                    "Fabricación Mecánica",
                    "Sede Técnica Norte",
                    "Bahía CNC C-102",
                    today,
                    "08:30:00",
                    "12:30:00",
                    1,
                    40,
                    10,
                ),
            ]

            cursor.executemany(
                """
                INSERT INTO `sesiones` 
                (`id`, `instructor_id`, `codigo_cohorte`, `nombre`, `departamento`, `sede`, `aula`, `fecha`, `hora_inicio`, `hora_fin`, `activa`, `geocerca_metros`, `gracia_minutos`)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                sessions_seed,
            )

            # Tokens QR iniciales
            now = datetime.datetime.now()
            expires = now + datetime.timedelta(minutes=30)
            cursor.execute(
                """
                INSERT INTO `codigos_qr` (`id`, `sesion_id`, `token`, `expira_en`, `revocado`)
                VALUES 
                ('qr-001', 'ses-2841', 'ACADEQR:COH-2841:TK-882194:SEC-104', %s, 0),
                ('qr-002', 'ses-3109', 'ACADEQR:COH-3109:TK-551029:SEC-072', %s, 0);
                """,
                (expires, expires),
            )

            # Asistencias de ejemplo
            attendances_seed = [
                ("att-01", "ses-2841", "lrn-01", "PRESENTE", "Dynamic QR", 18, "SIG-9A4F2C", None, today),
                ("att-02", "ses-2841", "lrn-02", "PRESENTE", "Dynamic QR", 24, "SIG-9A4F2C", None, today),
                ("att-03", "ses-2841", "lrn-03", "PRESENTE", "Dynamic QR", 12, "SIG-3B8E10", None, today),
                ("att-04", "ses-2841", "lrn-04", "TARDANZA", "Dynamic QR", 31, "SIG-7D1C44", "Llegó con 14 min de retraso", today),
            ]

            cursor.executemany(
                """
                INSERT INTO `asistencias` 
                (`id`, `sesion_id`, `aprendiz_id`, `estado`, `metodo`, `distancia_metros`, `firma_token`, `nota`, `fecha_registro`)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                attendances_seed,
            )
            print("[+] Datos de prueba insertados con éxito.")
        else:
            print(f"[i] La base de datos ya contiene {count} usuarios. No se sobreescribieron datos.")

    conn.close()
    print("[✓] Base de datos MySQL en XAMPP lista y configurada exitosamente.")


if __name__ == "__main__":
    initialize_database()
