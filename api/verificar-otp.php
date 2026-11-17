<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

session_start();

require_once __DIR__ . '/conexion.php';

function responder(int $estado, array $datos): never
{
    http_response_code($estado);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Comprobar que se solicitó previamente un código.
    $usuarioId = (int) ($_SESSION['activacion_usuario_id'] ?? 0);

    if ($usuarioId <= 0) {
        responder(401, [
            'error' => 'La sesión de activación expiró. Solicitá un nuevo código.'
        ]);
    }

    // Leer el código enviado desde JavaScript.
    $datos = json_decode(file_get_contents('php://input'), true);

    if (!is_array($datos)) {
        responder(400, ['error' => 'Solicitud inválida.']);
    }

    $codigo = trim((string) ($datos['codigo'] ?? ''));

    if (!preg_match('/^\d{6}$/', $codigo)) {
        responder(400, [
            'error' => 'Ingresá un código válido de seis dígitos.'
        ]);
    }

    $pdo = obtenerConexion();

    $pdo->beginTransaction();

    // Bloquear el registro mientras se valida.
    $consulta = $pdo->prepare(
        "SELECT codigo_hash,
                fecha_expiracion,
                fecha_verificacion,
                intentos
         FROM codigos_activacion
         WHERE usuario_id = :usuario_id
         LIMIT 1
         FOR UPDATE"
    );

    $consulta->execute(['usuario_id' => $usuarioId]);

    $registro = $consulta->fetch();

    if (!$registro) {
        $pdo->rollBack();

        responder(400, [
            'error' => 'No existe un código pendiente de verificación.'
        ]);
    }

    // Comprobar si ya fue utilizado.
    if ($registro['fecha_verificacion'] !== null) {
        $pdo->rollBack();

        responder(400, [
            'error' => 'Este código ya fue verificado. Continuá con la activación.'
        ]);
    }

    // Comprobar vencimiento.
    if (strtotime($registro['fecha_expiracion']) <= time()) {
        $pdo->rollBack();

        responder(400, [
            'error' => 'El código venció. Solicitá uno nuevo.'
        ]);
    }

    // Limitar intentos a cinco.
    if ((int) $registro['intentos'] >= 5) {
        $pdo->rollBack();

        responder(429, [
            'error' => 'Superaste los cinco intentos. Solicitá un nuevo código.'
        ]);
    }

    // Registrar cada intento.
    $actualizarIntentos = $pdo->prepare(
        "UPDATE codigos_activacion
         SET intentos = intentos + 1
         WHERE usuario_id = :usuario_id"
    );

    $actualizarIntentos->execute([
        'usuario_id' => $usuarioId
    ]);

    // Verificar el hash del código.
    if (!password_verify($codigo, $registro['codigo_hash'])) {
        $pdo->commit();

        $intentosRestantes = 4 - (int) $registro['intentos'];

        responder(400, [
            'error' => 'El código ingresado es incorrecto.',
            'intentos_restantes' => max(0, $intentosRestantes)
        ]);
    }

    // Marcar el código como verificado.
    $validar = $pdo->prepare(
        "UPDATE codigos_activacion
         SET fecha_verificacion = NOW()
         WHERE usuario_id = :usuario_id"
    );

    $validar->execute([
        'usuario_id' => $usuarioId
    ]);

    $pdo->commit();

    // Autorizar la siguiente etapa.
    $_SESSION['otp_verificado'] = true;

    responder(200, [
        'success' => true,
        'message' => 'Código verificado correctamente.',
        'continuar' => true
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Error al verificar OTP UniPath: ' . $e->getMessage());

    responder(500, [
        'error' => 'Ocurrió un error al verificar el código.'
    ]);
}
