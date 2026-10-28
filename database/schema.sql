-- UniPath: estructura de la base de datos (MySQL 8 / MariaDB 10.6+)
-- ATENCIÓN: borra y vuelve a crear todas las tablas. Solo para crear la base desde cero.

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ruta_detalle, rutas, horario_laboral, situacion_personal,
    estudiante_asignatura, horarios_asignatura, prerrequisitos, asignaturas,
    usuarios, carreras, universidades;
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- INSTITUCIÓN Y USUARIOS (versión mínima; la completa Abraham)
-- ==========================================

CREATE TABLE universidades (
    id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre  VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE carreras (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    universidad_id  INT UNSIGNED NOT NULL,
    codigo          VARCHAR(20)  NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    cuatrimestres   TINYINT UNSIGNED NOT NULL,
    estado          ENUM('activa', 'inactiva') NOT NULL DEFAULT 'activa',
    UNIQUE KEY uq_carrera_codigo (universidad_id, codigo),
    CONSTRAINT fk_carrera_universidad FOREIGN KEY (universidad_id) REFERENCES universidades (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    universidad_id        INT UNSIGNED NOT NULL,
    nombre                VARCHAR(150) NOT NULL,
    carne                 VARCHAR(20)  NULL,
    correo_institucional  VARCHAR(150) NOT NULL,
    contrasena_hash       VARCHAR(255) NULL,  -- NULL hasta que el estudiante active la cuenta
    rol                   ENUM('estudiante', 'administrador') NOT NULL DEFAULT 'estudiante',
    carrera_id            INT UNSIGNED NULL,
    estado                ENUM('pendiente', 'activo', 'inactivo') NOT NULL DEFAULT 'pendiente',
    fecha_registro        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_usuario_correo (correo_institucional),
    UNIQUE KEY uq_usuario_carne (universidad_id, carne),
    CONSTRAINT fk_usuario_universidad FOREIGN KEY (universidad_id) REFERENCES universidades (id),
    CONSTRAINT fk_usuario_carrera FOREIGN KEY (carrera_id) REFERENCES carreras (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PLAN DE ESTUDIOS
-- ==========================================

CREATE TABLE asignaturas (
    id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    carrera_id             INT UNSIGNED NOT NULL,
    codigo                 VARCHAR(20)  NOT NULL,
    nombre                 VARCHAR(150) NOT NULL,
    cuatrimestre_sugerido  TINYINT UNSIGNED NOT NULL,
    creditos               TINYINT UNSIGNED NOT NULL,
    horas_semanales        TINYINT UNSIGNED NOT NULL,  -- horas de estudio fuera de clase
    costo                  DECIMAL(10, 2) NOT NULL,
    estado                 ENUM('activa', 'inactiva') NOT NULL DEFAULT 'activa',
    UNIQUE KEY uq_asignatura_codigo (carrera_id, codigo),
    CONSTRAINT fk_asignatura_carrera FOREIGN KEY (carrera_id) REFERENCES carreras (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prerrequisitos (
    asignatura_id  INT UNSIGNED NOT NULL,
    requisito_id   INT UNSIGNED NOT NULL,
    PRIMARY KEY (asignatura_id, requisito_id),
    CONSTRAINT fk_prerrequisito_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas (id) ON DELETE CASCADE,
    CONSTRAINT fk_prerrequisito_requisito FOREIGN KEY (requisito_id) REFERENCES asignaturas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bloques iguales a los de horario_laboral para poder detectar choques
CREATE TABLE horarios_asignatura (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    asignatura_id  INT UNSIGNED NOT NULL,
    dia            ENUM('lun', 'mar', 'mie', 'jue', 'vie', 'sab') NOT NULL,
    bloque         ENUM('manana', 'tarde', 'noche') NOT NULL,
    modalidad      ENUM('presencial', 'virtual') NOT NULL,
    UNIQUE KEY uq_horario (asignatura_id, dia, bloque),
    CONSTRAINT fk_horario_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- AVANCE Y SITUACIÓN DEL ESTUDIANTE
-- ==========================================

CREATE TABLE estudiante_asignatura (
    usuario_id     INT UNSIGNED NOT NULL,
    asignatura_id  INT UNSIGNED NOT NULL,
    estado         ENUM('aprobada', 'en_curso') NOT NULL,
    PRIMARY KEY (usuario_id, asignatura_id),
    CONSTRAINT fk_avance_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_avance_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE situacion_personal (
    usuario_id         INT UNSIGNED PRIMARY KEY,
    tipo_trabajo       ENUM('no', 'medio_tiempo', 'tiempo_completo') NOT NULL,
    horas_disponibles  TINYINT UNSIGNED NOT NULL,
    presupuesto        DECIMAL(10, 2) NOT NULL,
    max_materias       TINYINT UNSIGNED NOT NULL,
    periodo_meta       CHAR(6) NULL,  -- cuatrimestre meta, formato 2027-3
    actualizado        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_situacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE horario_laboral (
    usuario_id  INT UNSIGNED NOT NULL,
    dia         ENUM('lun', 'mar', 'mie', 'jue', 'vie', 'sab') NOT NULL,
    bloque      ENUM('manana', 'tarde', 'noche') NOT NULL,
    PRIMARY KEY (usuario_id, dia, bloque),
    CONSTRAINT fk_horario_laboral_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- RUTAS GENERADAS
-- ==========================================

CREATE TABLE rutas (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT UNSIGNED NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    tipo            ENUM('equilibrada', 'rapida', 'ligera') NOT NULL,
    recomendada_ia  BOOLEAN NOT NULL DEFAULT FALSE,
    explicacion_ia  TEXT NULL,
    activa          BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ruta_usuario (usuario_id),
    CONSTRAINT fk_ruta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ruta_detalle (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ruta_id        INT UNSIGNED NOT NULL,
    periodo        CHAR(6) NOT NULL,  -- formato 2027-1
    asignatura_id  INT UNSIGNED NOT NULL,
    horario_id     INT UNSIGNED NULL,
    UNIQUE KEY uq_ruta_asignatura (ruta_id, asignatura_id),
    CONSTRAINT fk_detalle_ruta FOREIGN KEY (ruta_id) REFERENCES rutas (id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas (id),
    CONSTRAINT fk_detalle_horario FOREIGN KEY (horario_id) REFERENCES horarios_asignatura (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;