<?php

declare(strict_types=1);

require_once __DIR__ . '/comun.php';

// Límites de cada variante como fracción de horas/presupuesto; ligera además resta una materia al máximo
const LIMITES_VARIANTE = [
    'rapida'      => ['horas' => 1.0, 'presupuesto' => 1.0, 'materiasMenos' => 0],
    'equilibrada' => ['horas' => 0.8, 'presupuesto' => 0.8, 'materiasMenos' => 0],
    'ligera'      => ['horas' => 0.6, 'presupuesto' => 0.6, 'materiasMenos' => 1],
];

function siguientePeriodo(string $periodo): string
{
    [$anio, $numero] = array_map('intval', explode('-', $periodo));
    return $numero >= 3 ? ($anio + 1) . '-1' : $anio . '-' . ($numero + 1);
}

function valorPeriodo(string $periodo): int
{
    [$anio, $numero] = array_map('intval', explode('-', $periodo));
    return $anio * 3 + $numero;
}

function obtenerPlan(PDO $pdo, int $carreraId): array
{
    $consulta = $pdo->prepare(
        "SELECT id, codigo, nombre, cuatrimestre_sugerido, creditos, horas_semanales, costo
         FROM asignaturas WHERE carrera_id = ? AND estado = 'activa'"
    );
    $consulta->execute([$carreraId]);

    $plan = [];
    foreach ($consulta->fetchAll() as $fila) {
        $plan[(int) $fila['id']] = [
            'id'                  => (int) $fila['id'],
            'codigo'              => $fila['codigo'],
            'nombre'              => $fila['nombre'],
            'cuatrimestreSugerido' => (int) $fila['cuatrimestre_sugerido'],
            'creditos'            => (int) $fila['creditos'],
            'horasSemanales'      => (int) $fila['horas_semanales'],
            'costo'               => (float) $fila['costo'],
        ];
    }

    return $plan;
}

function obtenerPrerrequisitos(PDO $pdo, int $carreraId): array
{
    $consulta = $pdo->prepare(
        'SELECT p.asignatura_id, p.requisito_id
         FROM prerrequisitos p
         JOIN asignaturas a ON a.id = p.asignatura_id
         WHERE a.carrera_id = ?'
    );
    $consulta->execute([$carreraId]);

    $prerrequisitos = [];
    foreach ($consulta->fetchAll() as $fila) {
        $prerrequisitos[(int) $fila['asignatura_id']][] = (int) $fila['requisito_id'];
    }

    return $prerrequisitos;
}

function obtenerHorarios(PDO $pdo, int $carreraId): array
{
    $consulta = $pdo->prepare(
        'SELECT h.id, h.asignatura_id, h.dia, h.bloque, h.modalidad
         FROM horarios_asignatura h
         JOIN asignaturas a ON a.id = h.asignatura_id
         WHERE a.carrera_id = ?'
    );
    $consulta->execute([$carreraId]);

    $horarios = [];
    foreach ($consulta->fetchAll() as $fila) {
        $horarios[(int) $fila['asignatura_id']][] = [
            'id'     => (int) $fila['id'],
            'dia'    => $fila['dia'],
            'bloque' => $fila['bloque'],
        ];
    }

    return $horarios;
}

function obtenerAvance(PDO $pdo, int $usuarioId): array
{
    $consulta = $pdo->prepare('SELECT asignatura_id, estado FROM estudiante_asignatura WHERE usuario_id = ?');
    $consulta->execute([$usuarioId]);

    $avance = ['aprobada' => [], 'en_curso' => []];
    foreach ($consulta->fetchAll() as $fila) {
        $avance[$fila['estado']][] = (int) $fila['asignatura_id'];
    }

    return $avance;
}

// Cuenta, entre los pendientes, cuántos tienen a $id como prerrequisito (camino crítico)
function contarDesbloqueos(int $id, array $pendientes, array $prerrequisitos): int
{
    $total = 0;
    foreach ($pendientes as $otroId) {
        if (in_array($id, $prerrequisitos[$otroId] ?? [], true)) {
            $total++;
        }
    }
    return $total;
}

function todosPrerrequisitosCumplidos(int $id, array $prerrequisitos, array $asignadas): bool
{
    foreach ($prerrequisitos[$id] ?? [] as $requisito) {
        if (!isset($asignadas[$requisito])) {
            return false;
        }
    }
    return true;
}

// Primer horario de la materia que no choca con el trabajo ni con lo ya elegido este período.
// Una materia sin horarios registrados se considera sin restricción de horario.
function elegirHorarioLibre(array $horarios, array $horarioLaboral, array $slotsUsados): ?array
{
    foreach ($horarios as $horario) {
        $clave = $horario['dia'] . '-' . $horario['bloque'];
        if (!isset($horarioLaboral[$clave]) && !isset($slotsUsados[$clave])) {
            return $horario;
        }
    }
    return null;
}

function formatearMateria(array $materia): array
{
    return [
        'codigo'         => $materia['codigo'],
        'nombre'         => $materia['nombre'],
        'creditos'       => $materia['creditos'],
        'horasSemanales' => $materia['horasSemanales'],
        'costo'          => $materia['costo'],
    ];
}

function explicacionIa(string $tipo, array $metricas): string
{
    return match ($tipo) {
        'rapida' => sprintf(
            'Termina en %d cuatrimestres usando el 100%% de tus horas y presupuesto: carga más alta por período.',
            $metricas['cuatrimestres']
        ),
        'ligera' => sprintf(
            'Reparte las materias en %d cuatrimestres con una menos por período: más tiempo libre, graduación más lejana.',
            $metricas['cuatrimestres']
        ),
        default => sprintf(
            'Se gradúa en %d cuatrimestres usando cerca del 80%% de tus horas y presupuesto disponibles.',
            $metricas['cuatrimestres']
        ),
    };
}

/**
 * Genera una variante de ruta. Las materias en_curso se tratan como completadas desde
 * el inicio: se asume que terminan antes del primer período generado.
 */
function generarRuta(
    string $tipo,
    array $plan,
    array $prerrequisitos,
    array $horariosPorMateria,
    array $avance,
    array $situacion,
    array $horarioLaboral,
    string $periodoInicio
): array {
    $limites = LIMITES_VARIANTE[$tipo];
    $horasLimite = $situacion['horasDisponibles'] * $limites['horas'];
    $presupuestoLimite = $situacion['presupuesto'] * $limites['presupuesto'];
    $maxMaterias = max(1, $situacion['maxMaterias'] - $limites['materiasMenos']);

    $completadas = array_fill_keys(array_merge($avance['aprobada'], $avance['en_curso']), true);
    $pendientes = array_values(array_diff(array_keys($plan), array_keys($completadas)));

    // Conflictos permanentes: la materia nunca cabría en esta variante, sin importar el período
    $conflictos = [];
    $pendientesValidas = [];
    foreach ($pendientes as $id) {
        $materia = $plan[$id];
        $horarios = $horariosPorMateria[$id] ?? [];
        $sinHorarioLibre = $horarios !== [] && elegirHorarioLibre($horarios, $horarioLaboral, []) === null;

        if ($sinHorarioLibre || $materia['horasSemanales'] > $horasLimite || $materia['costo'] > $presupuestoLimite) {
            $conflictos[] = $materia['codigo'];
            continue;
        }
        $pendientesValidas[] = $id;
    }

    $asignadas = $completadas;
    $pendientesRestantes = $pendientesValidas;
    $periodos = [];
    $periodo = $periodoInicio;

    // Tope defensivo: nunca debería hacer tantas vueltas como pendientes + margen
    $limiteIteraciones = count($pendientesValidas) + 10;
    $iteraciones = 0;

    while ($pendientesRestantes !== [] && $iteraciones < $limiteIteraciones) {
        $iteraciones++;

        $disponibles = array_values(array_filter(
            $pendientesRestantes,
            fn ($id) => todosPrerrequisitosCumplidos($id, $prerrequisitos, $asignadas)
        ));

        if ($disponibles === []) {
            // Nada puede avanzar (no debería pasar con un plan bien formado); se corta para no ciclar
            break;
        }

        usort($disponibles, function (int $a, int $b) use ($pendientesRestantes, $prerrequisitos, $plan) {
            $desbloqueaA = contarDesbloqueos($a, $pendientesRestantes, $prerrequisitos);
            $desbloqueaB = contarDesbloqueos($b, $pendientesRestantes, $prerrequisitos);
            return $desbloqueaA !== $desbloqueaB
                ? $desbloqueaB - $desbloqueaA
                : $plan[$a]['cuatrimestreSugerido'] <=> $plan[$b]['cuatrimestreSugerido'];
        });

        $elegidas = [];
        $horasAcum = 0;
        $costoAcum = 0.0;
        $creditosAcum = 0;
        $slotsUsados = [];

        foreach ($disponibles as $id) {
            if (count($elegidas) >= $maxMaterias) {
                break;
            }

            $materia = $plan[$id];
            if ($horasAcum + $materia['horasSemanales'] > $horasLimite) {
                continue;
            }
            if ($costoAcum + $materia['costo'] > $presupuestoLimite) {
                continue;
            }

            $horarios = $horariosPorMateria[$id] ?? [];
            $horarioElegido = elegirHorarioLibre($horarios, $horarioLaboral, $slotsUsados);
            if ($horarioElegido === null && $horarios !== []) {
                continue; // todos sus horarios ya los ocupa otra materia de este período
            }

            $elegidas[] = $id;
            $horasAcum += $materia['horasSemanales'];
            $costoAcum += $materia['costo'];
            $creditosAcum += $materia['creditos'];
            if ($horarioElegido !== null) {
                $slotsUsados[$horarioElegido['dia'] . '-' . $horarioElegido['bloque']] = true;
            }
        }

        if ($elegidas === []) {
            // Nada cupo este período (choque entre disponibles); se intenta en el siguiente con el acumulado en cero
            $periodo = siguientePeriodo($periodo);
            continue;
        }

        foreach ($elegidas as $id) {
            $asignadas[$id] = true;
        }
        $pendientesRestantes = array_values(array_diff($pendientesRestantes, $elegidas));

        $periodos[] = [
            'periodo'   => $periodo,
            'horas'     => $horasAcum,
            'costo'     => $costoAcum,
            'creditos'  => $creditosAcum,
            'materias'  => array_map(fn ($id) => formatearMateria($plan[$id]), $elegidas),
        ];

        $periodo = siguientePeriodo($periodo);
    }

    foreach ($pendientesRestantes as $id) {
        $conflictos[] = $plan[$id]['codigo'];
    }

    $cuatrimestres = count($periodos);
    $horasPorPeriodo = array_column($periodos, 'horas');
    $costoPorPeriodo = array_column($periodos, 'costo');
    $materiasPorPeriodo = array_map(fn ($p) => count($p['materias']), $periodos);
    $costoTotal = array_sum($costoPorPeriodo);

    $metricas = [
        'cuatrimestres'     => $cuatrimestres,
        'periodoGraduacion' => $cuatrimestres ? $periodos[$cuatrimestres - 1]['periodo'] : null,
        'horasPromedio'     => $cuatrimestres ? round(array_sum($horasPorPeriodo) / $cuatrimestres, 1) : 0.0,
        'costoTotal'        => $costoTotal,
        'costoPromedio'     => $cuatrimestres ? round($costoTotal / $cuatrimestres) : 0.0,
        'materiasMin'       => $materiasPorPeriodo === [] ? 0 : min($materiasPorPeriodo),
        'materiasMax'       => $materiasPorPeriodo === [] ? 0 : max($materiasPorPeriodo),
    ];

    return [
        'tipo'        => $tipo,
        'metricas'    => $metricas,
        'periodos'    => $periodos,
        'conflictos'  => $conflictos,
    ];
}

// Entre las que cumplen la fecha meta, la de menor carga (horas promedio); si ninguna fecha meta, la equilibrada
function elegirRecomendada(array $rutasPorTipo, ?string $fechaMeta): string
{
    if ($fechaMeta !== null) {
        $queCumplen = array_filter(
            $rutasPorTipo,
            fn ($r) => $r['metricas']['periodoGraduacion'] !== null
                && valorPeriodo($r['metricas']['periodoGraduacion']) <= valorPeriodo($fechaMeta)
        );

        if ($queCumplen !== []) {
            uasort($queCumplen, fn ($a, $b) => $a['metricas']['horasPromedio'] <=> $b['metricas']['horasPromedio']);
            return array_key_first($queCumplen);
        }
    }

    return 'equilibrada';
}

$pdo = obtenerConexion();
$usuarioId = usuarioActualId();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    responderJson(405, ['error' => 'Método no permitido.']);
}

$consulta = $pdo->prepare('SELECT carrera_id FROM usuarios WHERE id = ?');
$consulta->execute([$usuarioId]);
$carreraId = $consulta->fetchColumn();

if (!$carreraId) {
    responderJson(422, ['error' => 'Tu usuario no tiene una carrera asignada.']);
}
$carreraId = (int) $carreraId;

$consulta = $pdo->prepare(
    'SELECT tipo_trabajo, horas_disponibles, presupuesto, max_materias, periodo_meta
     FROM situacion_personal WHERE usuario_id = ?'
);
$consulta->execute([$usuarioId]);
$situacionFila = $consulta->fetch();

if (!$situacionFila) {
    responderJson(422, ['error' => 'Completá tu situación personal antes de generar rutas.']);
}

$situacion = [
    'horasDisponibles' => (int) $situacionFila['horas_disponibles'],
    'presupuesto'      => (float) $situacionFila['presupuesto'],
    'maxMaterias'      => (int) $situacionFila['max_materias'],
    'fechaMeta'        => $situacionFila['periodo_meta'],
];

$consulta = $pdo->prepare('SELECT dia, bloque FROM horario_laboral WHERE usuario_id = ?');
$consulta->execute([$usuarioId]);
$horarioLaboral = [];
foreach ($consulta->fetchAll() as $fila) {
    $horarioLaboral[$fila['dia'] . '-' . $fila['bloque']] = true;
}

$plan = obtenerPlan($pdo, $carreraId);
$prerrequisitos = obtenerPrerrequisitos($pdo, $carreraId);
$horariosPorMateria = obtenerHorarios($pdo, $carreraId);
$avance = obtenerAvance($pdo, $usuarioId);

$periodoInicio = siguientePeriodo(periodoActual());

$rutasPorTipo = [];
foreach (['equilibrada', 'rapida', 'ligera'] as $tipo) {
    $rutasPorTipo[$tipo] = generarRuta(
        $tipo,
        $plan,
        $prerrequisitos,
        $horariosPorMateria,
        $avance,
        $situacion,
        $horarioLaboral,
        $periodoInicio
    );
}

$tipoRecomendado = elegirRecomendada($rutasPorTipo, $situacion['fechaMeta']);

$nombres = ['equilibrada' => 'Ruta equilibrada', 'rapida' => 'Ruta rápida', 'ligera' => 'Ruta ligera'];
$idsPorTipo = ['equilibrada' => 1, 'rapida' => 2, 'ligera' => 3];
$hoy = date('Y-m-d');

$rutas = [];
foreach (['equilibrada', 'rapida', 'ligera'] as $tipo) {
    $ruta = $rutasPorTipo[$tipo];
    $rutas[] = [
        'id'            => $idsPorTipo[$tipo],
        'nombre'        => $nombres[$tipo],
        'tipo'          => $tipo,
        'recomendadaIa' => $tipo === $tipoRecomendado,
        'explicacionIa' => explicacionIa($tipo, $ruta['metricas']),
        'fechaCreacion' => $hoy,
        'metricas'      => $ruta['metricas'],
        'periodos'      => $ruta['periodos'],
        'conflictos'    => $ruta['conflictos'],
    ];
}

responderJson(200, ['rutas' => $rutas]);
