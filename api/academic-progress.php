<?php
declare(strict_types=1);

require_once __DIR__ . '/comun.php';

$pdo = obtenerConexion();
$usuarioId = usuarioActualId();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // Obtener carrera y nombre del estudiante.
    $consulta = $pdo->prepare(
        'SELECT nombre, carrera_id
         FROM usuarios
         WHERE id = ?
           AND rol = \'estudiante\'
           AND estado = \'activo\''
    );

    $consulta->execute([$usuarioId]);
    $usuario = $consulta->fetch();

    if (!$usuario) {
        responderJson(403, [
            'error' => 'No se encontró un estudiante activo.'
        ]);
    }

    $carreraId = (int) $usuario['carrera_id'];

    // Obtener las materias de su carrera.
    $consulta = $pdo->prepare(
        'SELECT
            id,
            codigo,
            nombre,
            creditos,
            cuatrimestre_sugerido
         FROM asignaturas
         WHERE carrera_id = ?
         ORDER BY cuatrimestre_sugerido, codigo'
    );

    $consulta->execute([$carreraId]);
    $materias = $consulta->fetchAll();

    // Obtener los estados registrados.
    $consulta = $pdo->prepare(
        'SELECT asignatura_id, estado
         FROM estudiante_asignatura
         WHERE usuario_id = ?'
    );

    $consulta->execute([$usuarioId]);

    $estadosPorId = [];

    foreach ($consulta->fetchAll() as $fila) {
        $estadosPorId[(int) $fila['asignatura_id']] = $fila['estado'];
    }

    // Obtener los prerrequisitos.
    $consulta = $pdo->prepare(
        'SELECT asignatura_id, requisito_id
         FROM prerrequisitos'
    );

    $consulta->execute();
    $requisitosPorId = [];

    foreach ($consulta->fetchAll() as $fila) {
        $requisitosPorId[(int) $fila['asignatura_id']][] =
            (int) $fila['requisito_id'];
    }

    // Relacionar identificadores con códigos de materias.
    $codigosPorId = [];

    foreach ($materias as $materia) {
        $codigosPorId[(int) $materia['id']] = $materia['codigo'];
    }

    $courses = [];
    $states = [];

    foreach ($materias as $materia) {

        $id = (int) $materia['id'];
        $codigo = $materia['codigo'];

        $requirements = [];

        foreach ($requisitosPorId[$id] ?? [] as $requisitoId) {
            if (isset($codigosPorId[$requisitoId])) {
                $requirements[] = $codigosPorId[$requisitoId];
            }
        }

        $estado = $estadosPorId[$id] ?? 'pendiente';

        $states[$codigo] = $estado;

        $courses[] = [
            'id' => $id,
            'code' => $codigo,
            'name' => $materia['nombre'],
            'credits' => (int) $materia['creditos'],
            'term' => (int) $materia['cuatrimestre_sugerido'],
            'hours' => 0,
            'cost' => 0,
            'requirements' => $requirements
        ];
    }

    responderJson(200, [
        'courses' => $courses,
        'states' => $states,
        'userName' => $usuario['nombre']
    ]);
}

// Guardar avance académico.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $datos = leerJson();
    $estados = $datos['states'] ?? null;

    if (!is_array($estados)) {
        responderJson(400, [
            'error' => 'Los estados académicos no son válidos.'
        ]);
    }

    // Obtener las materias que pertenecen a la carrera.
    $consulta = $pdo->prepare(
        'SELECT id, codigo
         FROM asignaturas
         WHERE carrera_id = (
             SELECT carrera_id
             FROM usuarios
             WHERE id = ?
               AND rol = \'estudiante\'
               AND estado = \'activo\'
         )'
    );

    $consulta->execute([$usuarioId]);

    $materias = [];

    foreach ($consulta->fetchAll() as $fila) {
        $materias[$fila['codigo']] = (int) $fila['id'];
    }

    try {
        $pdo->beginTransaction();

        $buscar = $pdo->prepare(
            'SELECT estado
             FROM estudiante_asignatura
             WHERE usuario_id = ?
               AND asignatura_id = ?'
        );

        $insertar = $pdo->prepare(
            'INSERT INTO estudiante_asignatura
                (usuario_id, asignatura_id, estado)
             VALUES (?, ?, ?)'
        );

        $actualizar = $pdo->prepare(
            'UPDATE estudiante_asignatura
             SET estado = ?
             WHERE usuario_id = ?
               AND asignatura_id = ?'
        );

        $eliminar = $pdo->prepare(
            'DELETE FROM estudiante_asignatura
             WHERE usuario_id = ?
               AND asignatura_id = ?'
        );

        foreach ($estados as $codigo => $estado) {

            if (!is_string($codigo) || !isset($materias[$codigo])) {
                throw new InvalidArgumentException(
                    'Se recibió una materia que no pertenece a tu carrera.'
                );
            }

            if (!in_array(
                $estado,
                ['aprobada', 'en_curso', 'pendiente'],
                true
            )) {
                throw new InvalidArgumentException(
                    'Se recibió un estado académico no válido.'
                );
            }

            $asignaturaId = $materias[$codigo];

            // Pendiente significa que no existe un estado registrado.
            if ($estado === 'pendiente') {
                $eliminar->execute([$usuarioId, $asignaturaId]);
                continue;
            }

            $buscar->execute([$usuarioId, $asignaturaId]);
            $existe = $buscar->fetch();

            if ($existe) {
                $actualizar->execute([
                    $estado,
                    $usuarioId,
                    $asignaturaId
                ]);
            } else {
                $insertar->execute([
                    $usuarioId,
                    $asignaturaId,
                    $estado
                ]);
            }
        }

        $pdo->commit();

        responderJson(200, [
            'mensaje' => 'El avance académico se guardó correctamente.'
        ]);

    } catch (Throwable $error) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $error;
    }
}

header('Allow: GET, POST');

responderJson(405, [
    'error' => 'Método no permitido.'
]);
