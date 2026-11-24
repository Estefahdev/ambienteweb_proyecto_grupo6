<?php

declare(strict_types=1);

require_once __DIR__ . '/seguridad-admin.php';

$administrador = exigirAdministrador();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');

    responderJson(405, [
        'error' => 'Método no permitido.',
    ]);
}

validarTokenAdmin();

$conexion = obtenerConexion();
$datos = leerJson();
$filas = $datos['filas'] ?? null;

if (!is_array($filas) || $filas === []) {
    responderJson(400, [
        'error' => 'No hay filas para importar.',
    ]);
}

$universidadId = (int) $administrador['universidad_id'];

$carrerasPorCodigo = [];

$consulta = $conexion->prepare('SELECT id, codigo FROM carreras WHERE universidad_id = ?');
$consulta->execute([$universidadId]);

foreach ($consulta->fetchAll() as $fila) {
    $carrerasPorCodigo[strtoupper($fila['codigo'])] = (int) $fila['id'];
}

// Valida una fila del CSV de estudiantes. Devuelve el mensaje de error, o null si está bien.
function validarFilaEstudiante(array $fila, array $carrerasPorCodigo): ?string
{
    $carne = trim((string) ($fila['carne'] ?? ''));
    $nombre = trim((string) ($fila['nombre'] ?? ''));
    $correo = trim((string) ($fila['correo_institucional'] ?? ''));
    $carreraCodigo = strtoupper(trim((string) ($fila['carrera_codigo'] ?? '')));

    if ($carne === '' || strlen($carne) > 20) {
        return 'El carné es obligatorio y debe tener máximo 20 caracteres.';
    }

    if (!preg_match('/^[^\r\n]{3,150}$/u', $nombre)) {
        return 'El nombre debe tener de 3 a 150 caracteres.';
    }

    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 150) {
        return 'El correo institucional no es válido.';
    }

    if (!isset($carrerasPorCodigo[$carreraCodigo])) {
        return "No existe una carrera con el código \"{$carreraCodigo}\".";
    }

    return null;
}

$resultado = ['insertados' => 0, 'errores' => []];

$insertar = $conexion->prepare(
    'INSERT INTO usuarios (universidad_id, nombre, carne, correo_institucional, rol, carrera_id, estado)
     VALUES (?, ?, ?, ?, \'estudiante\', ?, \'pendiente\')'
);

foreach ($filas as $indice => $fila) {
    $numeroFila = $indice + 1;

    if (!is_array($fila)) {
        $resultado['errores'][] = ['fila' => $numeroFila, 'mensaje' => 'La fila no tiene el formato esperado.'];
        continue;
    }

    $error = validarFilaEstudiante($fila, $carrerasPorCodigo);

    if ($error !== null) {
        $resultado['errores'][] = ['fila' => $numeroFila, 'mensaje' => $error];
        continue;
    }

    $carne = trim((string) $fila['carne']);
    $nombre = trim((string) $fila['nombre']);
    $correo = trim((string) $fila['correo_institucional']);
    $carreraId = $carrerasPorCodigo[strtoupper(trim((string) $fila['carrera_codigo']))];

    try {
        $insertar->execute([$universidadId, $nombre, $carne, $correo, $carreraId]);
        $resultado['insertados']++;
    } catch (PDOException $error) {
        $mensaje = (int) ($error->errorInfo[1] ?? 0) === 1062
            ? 'Ya existe un estudiante con ese carné o correo institucional.'
            : 'No se pudo guardar esta fila.';

        $resultado['errores'][] = ['fila' => $numeroFila, 'mensaje' => $mensaje];
    }
}

responderJson(200, $resultado);
