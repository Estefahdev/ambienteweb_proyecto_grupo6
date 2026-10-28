-- UniPath: datos de prueba (correr después de schema.sql)
-- Plan de ejemplo de 30 materias y un estudiante en el III cuatrimestre 2026.

INSERT INTO universidades (id, nombre) VALUES
    (1, 'Universidad Fidélitas');

INSERT INTO carreras (id, universidad_id, codigo, nombre, cuatrimestres) VALUES
    (1, 1, 'ISC', 'Ingeniería en Sistemas de Computación', 10);

-- Estudiante de prueba; config.php apunta a este id hasta que exista el login
INSERT INTO usuarios (id, universidad_id, nombre, carne, correo_institucional, rol, carrera_id, estado) VALUES
    (1, 1, 'Estudiante de prueba', '000000001', 'estudiante.prueba@unipath.test', 'estudiante', 1, 'activo');

-- ==========================================
-- PLAN DE ESTUDIOS
-- ==========================================

INSERT INTO asignaturas (carrera_id, codigo, nombre, cuatrimestre_sugerido, creditos, horas_semanales, costo) VALUES
    (1, 'MA-101',  'Matemática general',              1,  3, 4, 90000),
    (1, 'SC-101',  'Introducción a la programación',  1,  4, 5, 120000),
    (1, 'EG-101',  'Comunicación oral y escrita',     1,  3, 3, 90000),
    (1, 'MA-102',  'Cálculo I',                       2,  4, 6, 120000),
    (1, 'SC-102',  'Programación I',                  2,  4, 5, 120000),
    (1, 'SC-103',  'Fundamentos de computación',      2,  3, 4, 90000),
    (1, 'MA-201',  'Álgebra lineal',                  3,  4, 5, 120000),
    (1, 'SC-201',  'Programación II',                 3,  4, 6, 120000),
    (1, 'SC-202',  'Estructuras de datos',            3,  4, 6, 120000),
    (1, 'MA-202',  'Estadística',                     4,  3, 4, 90000),
    (1, 'SC-203',  'Bases de datos I',                4,  4, 5, 120000),
    (1, 'SC-204',  'Arquitectura de computadoras',    4,  3, 4, 90000),
    (1, 'SC-301',  'Bases de datos II',               5,  4, 5, 120000),
    (1, 'SC-302',  'Sistemas operativos',             5,  4, 5, 120000),
    (1, 'SC-303',  'Ingeniería de software I',        5,  4, 5, 120000),
    (1, 'SC-502',  'Ambiente web cliente servidor',   6,  4, 6, 120000),
    (1, 'SC-401',  'Redes I',                         6,  4, 5, 120000),
    (1, 'SC-402',  'Análisis y diseño de sistemas',   6,  4, 5, 120000),
    (1, 'SC-601',  'Programación web avanzada',       7,  4, 6, 120000),
    (1, 'SC-602',  'Redes II',                        7,  4, 5, 120000),
    (1, 'SC-603',  'Ingeniería de software II',       7,  4, 5, 120000),
    (1, 'SC-701',  'Seguridad informática',           8,  4, 5, 120000),
    (1, 'SC-702',  'Computación en la nube',          8,  4, 6, 120000),
    (1, 'SC-703',  'Gestión de proyectos',            8,  3, 4, 90000),
    (1, 'SC-801',  'Inteligencia artificial',         9,  4, 6, 120000),
    (1, 'SC-802',  'Aplicaciones móviles',            9,  4, 5, 120000),
    (1, 'EG-801',  'Ética profesional',               9,  3, 3, 90000),
    (1, 'SC-901',  'Auditoría de sistemas',           10, 3, 4, 90000),
    (1, 'SC-902',  'Proyecto de graduación',          10, 4, 8, 120000),
    (1, 'SC-903',  'Calidad de software',             10, 3, 4, 90000);

-- Los prerrequisitos se enlazan por código para no depender de los id
INSERT INTO prerrequisitos (asignatura_id, requisito_id)
SELECT a.id, r.id
FROM (
    SELECT 'MA-102' AS materia, 'MA-101' AS requisito
    UNION ALL SELECT 'SC-102', 'SC-101'
    UNION ALL SELECT 'SC-103', 'SC-101'
    UNION ALL SELECT 'MA-201', 'MA-102'
    UNION ALL SELECT 'SC-201', 'SC-102'
    UNION ALL SELECT 'SC-202', 'SC-102'
    UNION ALL SELECT 'SC-202', 'SC-103'
    UNION ALL SELECT 'MA-202', 'MA-201'
    UNION ALL SELECT 'SC-203', 'SC-202'
    UNION ALL SELECT 'SC-204', 'SC-103'
    UNION ALL SELECT 'SC-301', 'SC-203'
    UNION ALL SELECT 'SC-302', 'SC-204'
    UNION ALL SELECT 'SC-303', 'SC-201'
    UNION ALL SELECT 'SC-502', 'SC-201'
    UNION ALL SELECT 'SC-502', 'SC-203'
    UNION ALL SELECT 'SC-401', 'SC-204'
    UNION ALL SELECT 'SC-402', 'SC-303'
    UNION ALL SELECT 'SC-601', 'SC-502'
    UNION ALL SELECT 'SC-602', 'SC-401'
    UNION ALL SELECT 'SC-603', 'SC-402'
    UNION ALL SELECT 'SC-701', 'SC-602'
    UNION ALL SELECT 'SC-702', 'SC-601'
    UNION ALL SELECT 'SC-702', 'SC-401'
    UNION ALL SELECT 'SC-703', 'SC-603'
    UNION ALL SELECT 'SC-801', 'MA-202'
    UNION ALL SELECT 'SC-801', 'SC-202'
    UNION ALL SELECT 'SC-802', 'SC-601'
    UNION ALL SELECT 'SC-901', 'SC-701'
    UNION ALL SELECT 'SC-902', 'SC-702'
    UNION ALL SELECT 'SC-902', 'SC-703'
    UNION ALL SELECT 'SC-903', 'SC-603'
) p
JOIN asignaturas a ON a.codigo = p.materia AND a.carrera_id = 1
JOIN asignaturas r ON r.codigo = p.requisito AND r.carrera_id = 1;

INSERT INTO horarios_asignatura (asignatura_id, dia, bloque, modalidad)
SELECT a.id, h.dia, h.bloque, h.modalidad
FROM (
    SELECT 'SC-601' AS materia, 'lun' AS dia, 'noche' AS bloque, 'presencial' AS modalidad
    UNION ALL SELECT 'SC-601', 'sab', 'manana', 'virtual'
    UNION ALL SELECT 'SC-602', 'mar', 'noche', 'presencial'
    UNION ALL SELECT 'SC-602', 'jue', 'tarde', 'presencial'
    UNION ALL SELECT 'SC-603', 'mie', 'noche', 'virtual'
    UNION ALL SELECT 'SC-603', 'sab', 'tarde', 'presencial'
    UNION ALL SELECT 'SC-701', 'lun', 'noche', 'virtual'
    UNION ALL SELECT 'SC-701', 'vie', 'manana', 'presencial'
    UNION ALL SELECT 'SC-702', 'jue', 'noche', 'presencial'
    UNION ALL SELECT 'SC-702', 'sab', 'manana', 'virtual'
    UNION ALL SELECT 'SC-703', 'mar', 'noche', 'virtual'
    UNION ALL SELECT 'SC-703', 'sab', 'tarde', 'presencial'
    UNION ALL SELECT 'SC-801', 'mie', 'noche', 'presencial'
    UNION ALL SELECT 'SC-801', 'sab', 'manana', 'presencial'
    UNION ALL SELECT 'SC-802', 'vie', 'noche', 'presencial'
    UNION ALL SELECT 'SC-802', 'sab', 'tarde', 'virtual'
    UNION ALL SELECT 'EG-801', 'jue', 'noche', 'virtual'
    UNION ALL SELECT 'SC-901', 'lun', 'noche', 'presencial'
    UNION ALL SELECT 'SC-902', 'sab', 'manana', 'presencial'
    UNION ALL SELECT 'SC-903', 'mie', 'noche', 'virtual'
    UNION ALL SELECT 'SC-903', 'vie', 'tarde', 'presencial'
) h
JOIN asignaturas a ON a.codigo = h.materia AND a.carrera_id = 1;

-- ==========================================
-- AVANCE DEL ESTUDIANTE DE PRUEBA
-- ==========================================

INSERT INTO estudiante_asignatura (usuario_id, asignatura_id, estado)
SELECT 1, a.id, e.estado
FROM (
    SELECT 'MA-101' AS materia, 'aprobada' AS estado
    UNION ALL SELECT 'SC-101', 'aprobada'
    UNION ALL SELECT 'EG-101', 'aprobada'
    UNION ALL SELECT 'MA-102', 'aprobada'
    UNION ALL SELECT 'SC-102', 'aprobada'
    UNION ALL SELECT 'SC-103', 'aprobada'
    UNION ALL SELECT 'MA-201', 'aprobada'
    UNION ALL SELECT 'SC-201', 'aprobada'
    UNION ALL SELECT 'SC-202', 'aprobada'
    UNION ALL SELECT 'MA-202', 'aprobada'
    UNION ALL SELECT 'SC-203', 'aprobada'
    UNION ALL SELECT 'SC-204', 'aprobada'
    UNION ALL SELECT 'SC-301', 'aprobada'
    UNION ALL SELECT 'SC-303', 'aprobada'
    UNION ALL SELECT 'SC-302', 'en_curso'
    UNION ALL SELECT 'SC-502', 'en_curso'
    UNION ALL SELECT 'SC-401', 'en_curso'
    UNION ALL SELECT 'SC-402', 'en_curso'
) e
JOIN asignaturas a ON a.codigo = e.materia AND a.carrera_id = 1;