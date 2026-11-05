<?php

declare(strict_types=1);

require_once __DIR__ . '/seguridad-admin.php';

exigirAdministrador();

$conexion = obtenerConexion();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $universidades = $conexion->query(
        'SELECT id, nombre
         FROM universidades
         ORDER BY nombre'
    )->fetchAll();

    $carreras = $conexion->query(
        "SELECT
            c.id,
            c.universidad_id,
            c.codigo,
            c.nombre,
            c.cuatrimestres,
            c.estado,
            u.nombre AS universidad,

            (
                SELECT COUNT(*)
                FROM asignaturas a
                WHERE a.carrera_id = c.id
            ) AS total_asignaturas,

            (
                SELECT COUNT(*)
                FROM usuarios e
                WHERE e.carrera_id = c.id
                  AND e.rol = 'estudiante'
            ) AS total_estudiantes

         FROM carreras c
         INNER JOIN universidades u
            ON u.id = c.universidad_id

         ORDER BY c.nombre, c.id"
    )->fetchAll();

    responderJson(200, [
        'universidades' => $universidades,
        'carreras' => $carreras,
    ]);
}

if ($metodo !== 'POST') {
    header('Allow: GET, POST');

    responderJson(405, [
        'error' => 'Método no permitido.',
    ]);
}

validarTokenAdmin();

$datos = leerJson();
$accion = $datos['accion'] ?? '';

if (!in_array($accion, ['guardar', 'estado'], true)) {
    responderJson(400, [
        'error' => 'Acción no válida.',
    ]);
}

$id = filter_var(
    $datos['id'] ?? 0,
    FILTER_VALIDATE_INT,
    [
        'options' => [
            'min_range' => 0,
            'max_range' => 4294967295,
        ],
    ]
);

$estado = $datos['estado'] ?? '';

if (
    $id === false ||
    !in_array($estado, ['activa', 'inactiva'], true)
) {
    responderJson(400, [
        'error' => 'Revisá el identificador y el estado.',
    ]);
}

if ($accion === 'estado' && $id === 0) {
    responderJson(400, [
        'error' => 'Seleccioná una carrera.',
    ]);
}

if ($accion === 'guardar') {
    $codigo = $datos['codigo'] ?? '';
    $nombre = $datos['nombre'] ?? '';

    if (
        !is_string($codigo) ||
        !is_string($nombre)
    ) {
        responderJson(400, [
            'error' => 'El código y el nombre no son válidos.',
        ]);
    }

    $codigo = strtoupper(trim($codigo));
    $nombre = trim($nombre);

    $universidadId = filter_var(
        $datos['universidad_id'] ?? null,
        FILTER_VALIDATE_INT,
        [
            'options' => [
                'min_range' => 1,
                'max_range' => 4294967295,
            ],
        ]
    );

    $cuatrimestres = filter_var(
        $datos['cuatrimestres'] ?? null,
        FILTER_VALIDATE_INT,
        [
            'options' => [
                'min_range' => 1,
                'max_range' => 30,
            ],
        ]
    );

    if (!preg_match('/^[A-Z0-9_-]{2,20}$/D', $codigo)) {
        responderJson(400, [
            'error' => 'El código debe tener de 2 a 20 letras, números o guiones.',
        ]);
    }

    if (!preg_match('/^[^\r\n]{3,150}$/u', $nombre)) {
        responderJson(400, [
            'error' => 'El nombre debe tener de 3 a 150 caracteres en una sola línea.',
        ]);
    }

    if (
        $universidadId === false ||
        $cuatrimestres === false
    ) {
        responderJson(400, [
            'error' => 'Seleccioná una universidad y entre 1 y 30 cuatrimestres.',
        ]);
    }
}

function rechazarCarrera(
    PDO $conexion,
    int $estadoHttp,
    string $mensaje
): never {
    if ($conexion->inTransaction()) {
        $conexion->rollBack();
    }

    responderJson($estadoHttp, [
        'error' => $mensaje,
    ]);
}

try {
    $conexion->beginTransaction();

    if ($id > 0) {
        $consulta = $conexion->prepare(
            'SELECT *
             FROM carreras
             WHERE id = ?
             FOR UPDATE'
        );

        $consulta->execute([$id]);
        $actual = $consulta->fetch();

        if (!$actual) {
            rechazarCarrera(
                $conexion,
                404,
                'La carrera ya no existe. Actualizá el listado.'
            );
        }
    }

    if ($accion === 'estado') {
        $consulta = $conexion->prepare(
            'UPDATE carreras
             SET estado = ?
             WHERE id = ?'
        );

        $consulta->execute([$estado, $id]);

        $mensaje = $estado === 'activa'
            ? 'Carrera activada.'
            : 'Carrera desactivada.';

    } else {
        $consulta = $conexion->prepare(
            'SELECT id
             FROM universidades
             WHERE id = ?'
        );

        $consulta->execute([$universidadId]);

        if (!$consulta->fetch()) {
            rechazarCarrera(
                $conexion,
                400,
                'La universidad seleccionada no existe.'
            );
        }

        // Revisar códigos repetidos dentro de la universidad.
        $consulta = $conexion->prepare(
            'SELECT id
             FROM carreras
             WHERE universidad_id = ?
               AND codigo = ?
               AND id <> ?'
        );

        $consulta->execute([
            $universidadId,
            $codigo,
            $id,
        ]);

        if ($consulta->fetch()) {
            rechazarCarrera(
                $conexion,
                409,
                'Ya existe ese código de carrera en la universidad.'
            );
        }

        if ($id > 0) {
            // Conservar los cuatrimestres de las materias existentes.
            $consulta = $conexion->prepare(
                'SELECT COALESCE(
                    MAX(cuatrimestre_sugerido),
                    0
                 )
                 FROM asignaturas
                 WHERE carrera_id = ?'
            );

            $consulta->execute([$id]);

            if (
                (int) $consulta->fetchColumn()
                > $cuatrimestres
            ) {
                rechazarCarrera(
                    $conexion,
                    409,
                    'Hay asignaturas en cuatrimestres superiores al valor indicado.'
                );
            }

            if (
                (int) $actual['universidad_id']
                !== $universidadId
            ) {
                $consulta = $conexion->prepare(
                    'SELECT COUNT(*)
                     FROM usuarios
                     WHERE carrera_id = ?'
                );

                $consulta->execute([$id]);

                if ((int) $consulta->fetchColumn() > 0) {
                    rechazarCarrera(
                        $conexion,
                        409,
                        'Esta carrera tiene usuarios asociados y debe conservar su universidad.'
                    );
                }
            }

            $consulta = $conexion->prepare(
                'UPDATE carreras
                 SET universidad_id = ?,
                     codigo = ?,
                     nombre = ?,
                     cuatrimestres = ?,
                     estado = ?
                 WHERE id = ?'
            );

            $consulta->execute([
                $universidadId,
                $codigo,
                $nombre,
                $cuatrimestres,
                $estado,
                $id,
            ]);

            $mensaje = 'Carrera actualizada.';

        } else {
            $consulta = $conexion->prepare(
                'INSERT INTO carreras (
                    universidad_id,
                    codigo,
                    nombre,
                    cuatrimestres,
                    estado
                 )
                 VALUES (?, ?, ?, ?, ?)'
            );

            $consulta->execute([
                $universidadId,
                $codigo,
                $nombre,
                $cuatrimestres,
                $estado,
            ]);

            $id = (int) $conexion->lastInsertId();
            $mensaje = 'Carrera creada.';
        }
    }

    $conexion->commit();

    responderJson(200, [
        'id' => $id,
        'mensaje' => $mensaje,
    ]);

} catch (Throwable $error) {
    if ($conexion->inTransaction()) {
        $conexion->rollBack();
    }

    if (
        $error instanceof PDOException &&
        (int) ($error->errorInfo[1] ?? 0) === 1062
    ) {
        responderJson(409, [
            'error' => 'Ya existe ese código de carrera en la universidad.',
        ]);
    }

    throw $error;
}