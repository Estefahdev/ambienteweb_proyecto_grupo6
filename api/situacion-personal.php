<?php
// GET: devuelve la situación personal del estudiante · POST: la valida y la guarda
declare(strict_types=1);

require_once __DIR__ . '/comun.php';

const TIPOS_TRABAJO = ['no', 'medio_tiempo', 'tiempo_completo'];
const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
const BLOQUES = ['manana', 'tarde', 'noche'];

function obtenerSituacion(PDO $pdo, int $usuarioId): ?array
{
    $consulta = $pdo->prepare(
        'SELECT tipo_trabajo, horas_disponibles, presupuesto, max_materias, periodo_meta, actualizado
         FROM situacion_personal WHERE usuario_id = ?'
    );
    $consulta->execute([$usuarioId]);
    $fila = $consulta->fetch();

    if (!$fila) {
        return null;
    }

    $consulta = $pdo->prepare('SELECT dia, bloque FROM horario_laboral WHERE usuario_id = ?');
    $consulta->execute([$usuarioId]);

    return [
        'tipoTrabajo'      => $fila['tipo_trabajo'],
        'horarioLaboral'   => $consulta->fetchAll(),
        'horasDisponibles' => (int) $fila['horas_disponibles'],
        'presupuesto'      => (float) $fila['presupuesto'],
        'maxMaterias'      => (int) $fila['max_materias'],
        'fechaMeta'        => $fila['periodo_meta'],
        // La base guarda en UTC; se manda en ISO 8601 para que el navegador la pase a hora local
        'actualizado'      => (new DateTimeImmutable($fila['actualizado'], new DateTimeZone('UTC')))->format(DATE_ATOM),
    ];
}

// Mismas reglas que el JS; se repiten porque la validación del navegador se puede saltar
function validarSituacion(array $datos): array
{
    $errores = [];
    $tipo = $datos['tipoTrabajo'] ?? null;
    $horario = $datos['horarioLaboral'] ?? [];

    if (!in_array($tipo, TIPOS_TRABAJO, true)) {
        $errores['tipoTrabajo'] = 'Elegí una opción.';
    } elseif (!is_array($horario)) {
        $errores['tipoTrabajo'] = 'El horario laboral no es válido.';
    } elseif ($tipo !== 'no' && count($horario) === 0) {
        $errores['tipoTrabajo'] = 'Marcá en el horario los bloques en los que trabajás.';
    }

    foreach (is_array($horario) ? $horario : [] as $bloque) {
        if (!in_array($bloque['dia'] ?? null, DIAS, true) || !in_array($bloque['bloque'] ?? null, BLOQUES, true)) {
            $errores['tipoTrabajo'] = 'El horario laboral tiene un bloque no válido.';
            break;
        }
    }

    $horas = filter_var($datos['horasDisponibles'] ?? null, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => 60],
    ]);
    if ($horas === false) {
        $errores['horasDisponibles'] = 'Usá un número entero entre 1 y 60.';
    }

    $presupuesto = filter_var($datos['presupuesto'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($presupuesto === false || $presupuesto <= 0 || $presupuesto >= 100000000) {
        $errores['presupuesto'] = 'El presupuesto tiene que ser mayor que cero.';
    }

    $materias = filter_var($datos['maxMaterias'] ?? null, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => 6],
    ]);
    if ($materias === false) {
        $errores['maxMaterias'] = 'Elegí cuántas materias como máximo.';
    }

    $meta = $datos['fechaMeta'] ?? null;
    if ($meta !== null && $meta !== '') {
        // "2027-3" se puede comparar como texto porque el año siempre tiene 4 dígitos
        if (!is_string($meta) || !preg_match('/^\d{4}-[1-3]$/', $meta) || $meta <= periodoActual()) {
            $errores['fechaMeta'] = 'Elegí un cuatrimestre futuro.';
        }
    }

    return $errores;
}

function guardarSituacion(PDO $pdo, int $usuarioId, array $datos): void
{
    $valores = [
        $datos['tipoTrabajo'],
        (int) $datos['horasDisponibles'],
        (float) $datos['presupuesto'],
        (int) $datos['maxMaterias'],
        ($datos['fechaMeta'] ?? '') ?: null,
    ];

    // Todo o nada: si falla el horario, tampoco se guarda la situación
    $pdo->beginTransaction();

    try {
        $consulta = $pdo->prepare(
            'INSERT INTO situacion_personal
                (usuario_id, tipo_trabajo, horas_disponibles, presupuesto, max_materias, periodo_meta)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                tipo_trabajo = ?, horas_disponibles = ?, presupuesto = ?, max_materias = ?, periodo_meta = ?'
        );
        $consulta->execute([$usuarioId, ...$valores, ...$valores]);

        // El horario se reemplaza completo en cada guardado
        $pdo->prepare('DELETE FROM horario_laboral WHERE usuario_id = ?')->execute([$usuarioId]);

        $consulta = $pdo->prepare('INSERT IGNORE INTO horario_laboral (usuario_id, dia, bloque) VALUES (?, ?, ?)');
        foreach ($datos['horarioLaboral'] ?? [] as $bloque) {
            $consulta->execute([$usuarioId, $bloque['dia'], $bloque['bloque']]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

$pdo = obtenerConexion();
$usuarioId = usuarioActualId();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        responderJson(200, ['situacion' => obtenerSituacion($pdo, $usuarioId)]);

    case 'POST':
        $datos = leerJson();
        $errores = validarSituacion($datos);

        if ($errores) {
            responderJson(422, ['errores' => $errores]);
        }

        guardarSituacion($pdo, $usuarioId, $datos);
        responderJson(200, ['situacion' => obtenerSituacion($pdo, $usuarioId)]);

    default:
        header('Allow: GET, POST');
        responderJson(405, ['error' => 'Método no permitido.']);
}
