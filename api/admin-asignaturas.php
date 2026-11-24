<?php

declare(strict_types=1);

require_once __DIR__ . '/seguridad-admin.php';

exigirAdministrador();

$conexion = obtenerConexion();
$metodo = $_SERVER['REQUEST_METHOD'];

function obtenerCarrera(PDO $conexion, int $carreraId): array
{
    $consulta = $conexion->prepare(
        'SELECT c.id, c.nombre, c.codigo, c.cuatrimestres, u.nombre AS universidad
         FROM carreras c
         INNER JOIN universidades u ON u.id = c.universidad_id
         WHERE c.id = ?'
    );

    $consulta->execute([$carreraId]);
    $carrera = $consulta->fetch();

    if (!$carrera) {
        responderJson(404, [
            'error' => 'La carrera no existe.',
        ]);
    }

    return $carrera;
}

if ($metodo === 'GET') {
    $carreraId = filter_var(
        $_GET['carrera_id'] ?? null,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($carreraId === false) {
        responderJson(400, [
            'error' => 'Falta el identificador de la carrera.',
        ]);
    }

    $carrera = obtenerCarrera($conexion, $carreraId);

    $consulta = $conexion->prepare(
        'SELECT id, codigo, nombre, cuatrimestre_sugerido, creditos, horas_semanales, costo, estado
         FROM asignaturas
         WHERE carrera_id = ?
         ORDER BY cuatrimestre_sugerido, codigo'
    );

    $consulta->execute([$carreraId]);
    $asignaturas = $consulta->fetchAll();

    $idsAsignaturas = array_map(fn ($fila) => (int) $fila['id'], $asignaturas);
    $prerequisitosPorAsignatura = array_fill_keys($idsAsignaturas, []);

    if ($idsAsignaturas !== []) {
        $marcadores = implode(',', array_fill(0, count($idsAsignaturas), '?'));

        $consulta = $conexion->prepare(
            "SELECT asignatura_id, requisito_id FROM prerrequisitos WHERE asignatura_id IN ($marcadores)"
        );

        $consulta->execute($idsAsignaturas);

        foreach ($consulta->fetchAll() as $fila) {
            $prerequisitosPorAsignatura[(int) $fila['asignatura_id']][] = (int) $fila['requisito_id'];
        }
    }

    foreach ($asignaturas as &$fila) {
        $fila['id'] = (int) $fila['id'];
        $fila['cuatrimestre_sugerido'] = (int) $fila['cuatrimestre_sugerido'];
        $fila['creditos'] = (int) $fila['creditos'];
        $fila['horas_semanales'] = (int) $fila['horas_semanales'];
        $fila['costo'] = (float) $fila['costo'];
        $fila['prerequisitos'] = $prerequisitosPorAsignatura[$fila['id']];
    }
    unset($fila);

    responderJson(200, [
        'carrera' => $carrera,
        'asignaturas' => $asignaturas,
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

$id = filter_var($datos['id'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
$carreraId = filter_var($datos['carrera_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

if ($id === false || $carreraId === false) {
    responderJson(400, [
        'error' => 'Revisá el identificador de la asignatura y de la carrera.',
    ]);
}

$carrera = obtenerCarrera($conexion, $carreraId);

if ($accion === 'estado') {
    $estado = $datos['estado'] ?? '';

    if ($id === 0 || !in_array($estado, ['activa', 'inactiva'], true)) {
        responderJson(400, [
            'error' => 'Seleccioná una asignatura y un estado válido.',
        ]);
    }

    $conexion->prepare(
        'UPDATE asignaturas SET estado = ? WHERE id = ? AND carrera_id = ?'
    )->execute([$estado, $id, $carreraId]);

    responderJson(200, [
        'mensaje' => $estado === 'activa' ? 'Asignatura activada.' : 'Asignatura desactivada.',
    ]);
}

// accion === 'guardar'
$codigo = $datos['codigo'] ?? '';
$nombre = $datos['nombre'] ?? '';

if (!is_string($codigo) || !is_string($nombre)) {
    responderJson(400, [
        'error' => 'El código y el nombre no son válidos.',
    ]);
}

$codigo = strtoupper(trim($codigo));
$nombre = trim($nombre);

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

$cuatrimestreSugerido = filter_var(
    $datos['cuatrimestre_sugerido'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1, 'max_range' => (int) $carrera['cuatrimestres']]]
);

$creditos = filter_var($datos['creditos'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 20]]);
$horasSemanales = filter_var($datos['horas_semanales'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 60]]);
$costo = filter_var($datos['costo'] ?? null, FILTER_VALIDATE_FLOAT, ['options' => ['min_range' => 0]]);
$estado = $datos['estado'] ?? 'activa';

if (
    $cuatrimestreSugerido === false ||
    $creditos === false ||
    $horasSemanales === false ||
    $costo === false ||
    !in_array($estado, ['activa', 'inactiva'], true)
) {
    responderJson(400, [
        'error' => "Revisá el cuatrimestre (1 a {$carrera['cuatrimestres']}), créditos, horas y costo.",
    ]);
}

$prerequisitos = array_unique(array_map(
    'intval',
    is_array($datos['prerequisitos'] ?? null) ? $datos['prerequisitos'] : []
));

$prerequisitos = array_values(array_filter($prerequisitos, fn ($valor) => $valor > 0 && $valor !== $id));

function rechazarAsignatura(PDO $conexion, int $estadoHttp, string $mensaje): never
{
    if ($conexion->inTransaction()) {
        $conexion->rollBack();
    }

    responderJson($estadoHttp, ['error' => $mensaje]);
}

try {
    $conexion->beginTransaction();

    $consulta = $conexion->prepare(
        'SELECT id FROM asignaturas WHERE carrera_id = ? AND codigo = ? AND id <> ?'
    );

    $consulta->execute([$carreraId, $codigo, $id]);

    if ($consulta->fetch()) {
        rechazarAsignatura($conexion, 409, 'Ya existe una asignatura con ese código en esta carrera.');
    }

    if ($prerequisitos !== []) {
        $marcadores = implode(',', array_fill(0, count($prerequisitos), '?'));

        $consulta = $conexion->prepare(
            "SELECT COUNT(*) FROM asignaturas WHERE carrera_id = ? AND id IN ($marcadores)"
        );

        $consulta->execute([$carreraId, ...$prerequisitos]);

        if ((int) $consulta->fetchColumn() !== count($prerequisitos)) {
            rechazarAsignatura($conexion, 400, 'Hay un prerrequisito que no pertenece a esta carrera.');
        }
    }

    if ($id > 0) {
        $consulta = $conexion->prepare('SELECT id FROM asignaturas WHERE id = ? AND carrera_id = ?');
        $consulta->execute([$id, $carreraId]);

        if (!$consulta->fetch()) {
            rechazarAsignatura($conexion, 404, 'La asignatura ya no existe. Actualizá el listado.');
        }

        $conexion->prepare(
            'UPDATE asignaturas
             SET codigo = ?, nombre = ?, cuatrimestre_sugerido = ?, creditos = ?, horas_semanales = ?, costo = ?, estado = ?
             WHERE id = ?'
        )->execute([$codigo, $nombre, $cuatrimestreSugerido, $creditos, $horasSemanales, $costo, $estado, $id]);

        $mensaje = 'Asignatura actualizada.';
    } else {
        $conexion->prepare(
            'INSERT INTO asignaturas (carrera_id, codigo, nombre, cuatrimestre_sugerido, creditos, horas_semanales, costo, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$carreraId, $codigo, $nombre, $cuatrimestreSugerido, $creditos, $horasSemanales, $costo, $estado]);

        $id = (int) $conexion->lastInsertId();
        $mensaje = 'Asignatura creada.';
    }

    $conexion->prepare('DELETE FROM prerrequisitos WHERE asignatura_id = ?')->execute([$id]);

    if ($prerequisitos !== []) {
        $insertarPrerequisito = $conexion->prepare(
            'INSERT INTO prerrequisitos (asignatura_id, requisito_id) VALUES (?, ?)'
        );

        foreach ($prerequisitos as $requisitoId) {
            $insertarPrerequisito->execute([$id, $requisitoId]);
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

    if ($error instanceof PDOException && (int) ($error->errorInfo[1] ?? 0) === 1062) {
        responderJson(409, ['error' => 'Ya existe una asignatura con ese código en esta carrera.']);
    }

    throw $error;
}
