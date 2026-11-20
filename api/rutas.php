<?php

declare(strict_types=1);

require_once __DIR__ . '/comun.php';

const TIPOS_RUTA = ['equilibrada', 'rapida', 'ligera'];
const NOMBRES_RUTA = ['equilibrada' => 'Ruta equilibrada', 'rapida' => 'Ruta rápida', 'ligera' => 'Ruta ligera'];

function obtenerCarreraUsuario(PDO $pdo, int $usuarioId): ?int
{
    $consulta = $pdo->prepare('SELECT carrera_id FROM usuarios WHERE id = ?');
    $consulta->execute([$usuarioId]);
    $carreraId = $consulta->fetchColumn();

    return $carreraId ? (int) $carreraId : null;
}

function validarRutaEntrante(array $datos): array
{
    $errores = [];

    if (!in_array($datos['tipo'] ?? null, TIPOS_RUTA, true)) {
        $errores['tipo'] = 'El tipo de ruta no es válido.';
    }

    $periodos = $datos['periodos'] ?? null;
    if (!is_array($periodos) || $periodos === []) {
        $errores['periodos'] = 'La ruta no tiene períodos.';
        return $errores;
    }

    foreach ($periodos as $periodo) {
        if (!is_array($periodo) || !preg_match('/^\d{4}-[1-3]$/', $periodo['periodo'] ?? '')) {
            $errores['periodos'] = 'Hay un período con formato inválido.';
            break;
        }
        $materias = $periodo['materias'] ?? null;
        if (!is_array($materias) || $materias === []) {
            $errores['periodos'] = 'Hay un período sin materias.';
            break;
        }
        foreach ($materias as $materia) {
            if (!is_array($materia) || !is_string($materia['codigo'] ?? null) || $materia['codigo'] === '') {
                $errores['periodos'] = 'Hay una materia sin código.';
                break 2;
            }
        }
    }

    return $errores;
}

/**
 * Guarda la ruta completa en una transacción. No se guarda un horario_id específico:
 * el payload del generador solo trae el código de cada materia, no la franja elegida.
 */
function guardarRutaCompleta(PDO $pdo, int $usuarioId, int $carreraId, array $datos): int
{
    $tipo = $datos['tipo'];

    $pdo->beginTransaction();

    try {
        $consulta = $pdo->prepare(
            'INSERT INTO rutas (usuario_id, nombre, tipo, recomendada_ia, explicacion_ia)
             VALUES (?, ?, ?, ?, ?)'
        );
        $consulta->execute([
            $usuarioId,
            is_string($datos['nombre'] ?? null) && $datos['nombre'] !== '' ? $datos['nombre'] : NOMBRES_RUTA[$tipo],
            $tipo,
            !empty($datos['recomendadaIa']) ? 1 : 0,
            is_string($datos['explicacionIa'] ?? null) ? $datos['explicacionIa'] : null,
        ]);
        $rutaId = (int) $pdo->lastInsertId();

        $buscarAsignatura = $pdo->prepare(
            "SELECT id FROM asignaturas WHERE carrera_id = ? AND codigo = ? AND estado = 'activa'"
        );
        $insertarDetalle = $pdo->prepare(
            'INSERT INTO ruta_detalle (ruta_id, periodo, asignatura_id) VALUES (?, ?, ?)'
        );

        foreach ($datos['periodos'] as $periodo) {
            foreach ($periodo['materias'] as $materia) {
                $buscarAsignatura->execute([$carreraId, $materia['codigo']]);
                $asignaturaId = $buscarAsignatura->fetchColumn();

                if (!$asignaturaId) {
                    throw new RuntimeException("La materia {$materia['codigo']} no existe en tu plan de estudios.");
                }

                $insertarDetalle->execute([$rutaId, $periodo['periodo'], (int) $asignaturaId]);
            }
        }

        $pdo->commit();
        return $rutaId;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function obtenerRutasGuardadas(PDO $pdo, int $usuarioId): array
{
    $consulta = $pdo->prepare(
        'SELECT id, nombre, tipo, recomendada_ia, explicacion_ia, activa, fecha_creacion
         FROM rutas WHERE usuario_id = ? ORDER BY id ASC'
    );
    $consulta->execute([$usuarioId]);
    $filas = $consulta->fetchAll();

    if ($filas === []) {
        return [];
    }

    $idsRutas = array_map(fn ($f) => (int) $f['id'], $filas);
    $marcadores = implode(',', array_fill(0, count($idsRutas), '?'));

    $consulta = $pdo->prepare(
        "SELECT rd.ruta_id, rd.periodo, a.codigo, a.nombre, a.creditos, a.horas_semanales, a.costo
         FROM ruta_detalle rd
         JOIN asignaturas a ON a.id = rd.asignatura_id
         WHERE rd.ruta_id IN ($marcadores)
         ORDER BY rd.ruta_id, rd.periodo, a.cuatrimestre_sugerido"
    );
    $consulta->execute($idsRutas);

    $detallePorRuta = [];
    foreach ($consulta->fetchAll() as $fila) {
        $detallePorRuta[(int) $fila['ruta_id']][$fila['periodo']][] = [
            'codigo'         => $fila['codigo'],
            'nombre'         => $fila['nombre'],
            'creditos'       => (int) $fila['creditos'],
            'horasSemanales' => (int) $fila['horas_semanales'],
            'costo'          => (float) $fila['costo'],
        ];
    }

    $rutas = [];
    foreach ($filas as $fila) {
        $rutaId = (int) $fila['id'];
        $periodosMaterias = $detallePorRuta[$rutaId] ?? [];

        $periodos = [];
        foreach ($periodosMaterias as $periodo => $materias) {
            $periodos[] = [
                'periodo'  => $periodo,
                'horas'    => array_sum(array_column($materias, 'horasSemanales')),
                'costo'    => array_sum(array_column($materias, 'costo')),
                'creditos' => array_sum(array_column($materias, 'creditos')),
                'materias' => $materias,
            ];
        }

        $cuatrimestres = count($periodos);
        $costoTotal = array_sum(array_column($periodos, 'costo'));
        $materiasPorPeriodo = array_map(fn ($p) => count($p['materias']), $periodos);

        $rutas[] = [
            'id'            => $rutaId,
            'nombre'        => $fila['nombre'],
            'tipo'          => $fila['tipo'],
            'recomendadaIa' => (bool) $fila['recomendada_ia'],
            'explicacionIa' => $fila['explicacion_ia'],
            'activa'        => (bool) $fila['activa'],
            'fechaCreacion' => substr($fila['fecha_creacion'], 0, 10),
            'metricas' => [
                'cuatrimestres'     => $cuatrimestres,
                'periodoGraduacion' => $cuatrimestres ? $periodos[$cuatrimestres - 1]['periodo'] : null,
                'horasPromedio'     => $cuatrimestres ? round(array_sum(array_column($periodos, 'horas')) / $cuatrimestres, 1) : 0.0,
                'costoTotal'        => $costoTotal,
                'costoPromedio'     => $cuatrimestres ? round($costoTotal / $cuatrimestres) : 0.0,
                'materiasMin'       => $materiasPorPeriodo === [] ? 0 : min($materiasPorPeriodo),
                'materiasMax'       => $materiasPorPeriodo === [] ? 0 : max($materiasPorPeriodo),
            ],
            'periodos' => $periodos,
        ];
    }

    return $rutas;
}

function activarRuta(PDO $pdo, int $usuarioId, int $rutaId): bool
{
    $pdo->beginTransaction();

    try {
        $consulta = $pdo->prepare('SELECT id FROM rutas WHERE id = ? AND usuario_id = ?');
        $consulta->execute([$rutaId, $usuarioId]);
        if (!$consulta->fetchColumn()) {
            $pdo->rollBack();
            return false;
        }

        $pdo->prepare('UPDATE rutas SET activa = FALSE WHERE usuario_id = ?')->execute([$usuarioId]);
        $pdo->prepare('UPDATE rutas SET activa = TRUE WHERE id = ?')->execute([$rutaId]);

        $pdo->commit();
        return true;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function eliminarRuta(PDO $pdo, int $usuarioId, int $rutaId): bool
{
    $consulta = $pdo->prepare('DELETE FROM rutas WHERE id = ? AND usuario_id = ?');
    $consulta->execute([$rutaId, $usuarioId]);
    return $consulta->rowCount() > 0;
}

$pdo = obtenerConexion();
$usuarioId = usuarioActualId();
$carreraId = obtenerCarreraUsuario($pdo, $usuarioId);

if (!$carreraId) {
    responderJson(422, ['error' => 'Tu usuario no tiene una carrera asignada.']);
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        responderJson(200, ['rutas' => obtenerRutasGuardadas($pdo, $usuarioId)]);

    case 'POST':
        $datos = leerJson();
        $errores = validarRutaEntrante($datos);

        if ($errores) {
            responderJson(422, ['errores' => $errores]);
        }

        try {
            $rutaId = guardarRutaCompleta($pdo, $usuarioId, $carreraId, $datos);
        } catch (RuntimeException $e) {
            responderJson(422, ['error' => $e->getMessage()]);
        }

        responderJson(201, ['rutaId' => $rutaId, 'rutas' => obtenerRutasGuardadas($pdo, $usuarioId)]);

    case 'PATCH':
        $datos = leerJson();
        $rutaId = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);

        if ($rutaId === false || ($datos['accion'] ?? null) !== 'activar') {
            responderJson(422, ['error' => 'Falta el id de la ruta o la acción no es válida.']);
        }

        if (!activarRuta($pdo, $usuarioId, $rutaId)) {
            responderJson(404, ['error' => 'No se encontró esa ruta.']);
        }

        responderJson(200, ['rutas' => obtenerRutasGuardadas($pdo, $usuarioId)]);

    case 'DELETE':
        $rutaId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);

        if ($rutaId === false) {
            responderJson(422, ['error' => 'Falta el id de la ruta.']);
        }

        if (!eliminarRuta($pdo, $usuarioId, $rutaId)) {
            responderJson(404, ['error' => 'No se encontró esa ruta.']);
        }

        responderJson(200, ['rutas' => obtenerRutasGuardadas($pdo, $usuarioId)]);

    default:
        header('Allow: GET, POST, PATCH, DELETE');
        responderJson(405, ['error' => 'Método no permitido.']);
}
