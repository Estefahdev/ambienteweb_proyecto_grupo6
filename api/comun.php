<?php
// Utilidades compartidas por todos los endpoints de api/
declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

date_default_timezone_set('America/Costa_Rica');

function responderJson(int $estado, array $datos): never
{
    http_response_code($estado);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function leerJson(): array
{
    $datos = json_decode(file_get_contents('php://input') ?: '', true);

    if (!is_array($datos)) {
        responderJson(400, ['error' => 'El cuerpo de la petición no es JSON válido.']);
    }

    return $datos;
}

// Temporal: cuando exista el login, esto sale de $_SESSION
function usuarioActualId(): int
{
    return (int) obtenerConfig()['usuario_prueba_id'];
}

// Cuatrimestres: 1 (ene-abr), 2 (may-ago), 3 (sep-dic); igual que en el JS
function periodoActual(): string
{
    $mes = (int) date('n');
    return date('Y') . '-' . (intdiv($mes - 1, 4) + 1);
}

// Cualquier error no previsto responde 500 sin mostrar detalles de la base
set_exception_handler(function (Throwable $e): void {
    error_log((string) $e);
    responderJson(500, ['error' => 'Ocurrió un error en el servidor. Intentá de nuevo.']);
});
