<?php

declare(strict_types=1);

require_once __DIR__ . '/seguridad-admin.php';

exigirAdministrador();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');

    responderJson(405, [
        'error' => 'Método no permitido.',
    ]);
}

validarTokenAdmin();

$conexion = obtenerConexion();
$datos = leerJson();

$carreraId = filter_var($datos['carrera_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$filas = $datos['filas'] ?? null;

if ($carreraId === false || !is_array($filas) || $filas === []) {
    responderJson(400, [
        'error' => 'Faltan la carrera o las filas a importar.',
    ]);
}

$consulta = $conexion->prepare('SELECT cuatrimestres FROM carreras WHERE id = ?');
$consulta->execute([$carreraId]);
$carrera = $consulta->fetch();

if (!$carrera) {
    responderJson(404, ['error' => 'La carrera no existe.']);
}

$maxCuatrimestres = (int) $carrera['cuatrimestres'];

// Valida una fila del CSV. Devuelve el mensaje de error, o null si está bien.
function validarFilaPlan(array $fila, int $maxCuatrimestres): ?string
{
    $codigo = strtoupper(trim((string) ($fila['codigo'] ?? '')));
    $nombre = trim((string) ($fila['nombre'] ?? ''));

    if (!preg_match('/^[A-Z0-9_-]{2,20}$/D', $codigo)) {
        return 'El código debe tener de 2 a 20 letras, números o guiones.';
    }

    if (!preg_match('/^[^\r\n]{3,150}$/u', $nombre)) {
        return 'El nombre debe tener de 3 a 150 caracteres.';
    }

    $cuatrimestre = filter_var($fila['cuatrimestre_sugerido'] ?? null, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => $maxCuatrimestres],
    ]);

    $creditos = filter_var($fila['creditos'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 20]]);
    $horas = filter_var($fila['horas_semanales'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 60]]);
    $costo = filter_var($fila['costo'] ?? null, FILTER_VALIDATE_FLOAT, ['options' => ['min_range' => 0]]);

    if ($cuatrimestre === false) {
        return "El cuatrimestre sugerido debe ser un número entre 1 y {$maxCuatrimestres}.";
    }

    if ($creditos === false || $horas === false || $costo === false) {
        return 'Revisá que créditos, horas semanales y costo sean números válidos.';
    }

    return null;
}

$resultado = ['insertadas' => 0, 'actualizadas' => 0, 'errores' => []];

$buscar = $conexion->prepare('SELECT id FROM asignaturas WHERE carrera_id = ? AND codigo = ?');

$insertar = $conexion->prepare(
    'INSERT INTO asignaturas (carrera_id, codigo, nombre, cuatrimestre_sugerido, creditos, horas_semanales, costo)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);

$actualizar = $conexion->prepare(
    'UPDATE asignaturas
     SET nombre = ?, cuatrimestre_sugerido = ?, creditos = ?, horas_semanales = ?, costo = ?
     WHERE id = ?'
);

foreach ($filas as $indice => $fila) {
    $numeroFila = $indice + 1;

    if (!is_array($fila)) {
        $resultado['errores'][] = ['fila' => $numeroFila, 'mensaje' => 'La fila no tiene el formato esperado.'];
        continue;
    }

    $error = validarFilaPlan($fila, $maxCuatrimestres);

    if ($error !== null) {
        $resultado['errores'][] = ['fila' => $numeroFila, 'mensaje' => $error];
        continue;
    }

    $codigo = strtoupper(trim((string) $fila['codigo']));
    $nombre = trim((string) $fila['nombre']);
    $cuatrimestre = (int) $fila['cuatrimestre_sugerido'];
    $creditos = (int) $fila['creditos'];
    $horas = (int) $fila['horas_semanales'];
    $costo = (float) $fila['costo'];

    $buscar->execute([$carreraId, $codigo]);
    $existente = $buscar->fetchColumn();

    if ($existente) {
        $actualizar->execute([$nombre, $cuatrimestre, $creditos, $horas, $costo, $existente]);
        $resultado['actualizadas']++;
    } else {
        $insertar->execute([$carreraId, $codigo, $nombre, $cuatrimestre, $creditos, $horas, $costo]);
        $resultado['insertadas']++;
    }
}

responderJson(200, $resultado);
