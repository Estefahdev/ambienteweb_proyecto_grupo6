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

$pdo = null;

try {
    // Comprobar que el OTP fue verificado.
    $usuarioId = (int) ($_SESSION['activacion_usuario_id'] ?? 0);
    $otpVerificado = $_SESSION['otp_verificado'] ?? false;

    if ($usuarioId <= 0 || $otpVerificado !== true) {
        responder(401, [
            'error' => 'Primero debés verificar tu código de activación.'
        ]);
    }

    // Recibir las contraseñas.
    $datos = json_decode(file_get_contents('php://input'), true);

    if (!is_array($datos)) {
        responder(400, ['error' => 'Solicitud inválida.']);
    }

    $contrasena = $datos['password'] ?? '';
    $confirmacion = $datos['confirmPassword'] ?? '';

    if (!is_string($contrasena) || !is_string($confirmacion)) {
        responder(400, ['error' => 'Las contraseñas no son válidas.']);
    }

    if (strlen($contrasena) < 8) {
        responder(400, [
            'error' => 'La contraseña debe tener al menos 8 caracteres.'
        ]);
    }

    if (strlen($contrasena) > 72) {
        responder(400, [
            'error' => 'La contraseña es demasiado larga.'
        ]);
    }

    if ($contrasena !== $confirmacion) {
        responder(400, [
            'error' => 'Las contraseñas no coinciden.'
        ]);
    }

    // Obtener conexión.
    $pdo = obtenerConexion();

    // Generar hash seguro de contraseña.
    $contrasenaHash = password_hash(
        $contrasena,
        PASSWORD_DEFAULT
    );

    $pdo->beginTransaction();

    // Bloquear usuario durante la activación.
    $consulta = $pdo->prepare(
        "SELECT id, estado
         FROM usuarios
         WHERE id = :usuario_id
         LIMIT 1
         FOR UPDATE"
    );

    $consulta->execute([
        'usuario_id' => $usuarioId
    ]);

    $usuario = $consulta->fetch();

    if (!$usuario || $usuario['estado'] !== 'pendiente') {
        $pdo->rollBack();

        responder(400, [
            'error' => 'La cuenta no está disponible para activación.'
        ]);
    }

    // Confirmar que el código fue verificado y no venció.
    $consultaOtp = $pdo->prepare(
        "SELECT id
         FROM codigos_activacion
         WHERE usuario_id = :usuario_id
           AND fecha_verificacion IS NOT NULL
           AND fecha_expiracion > NOW()
         LIMIT 1
         FOR UPDATE"
    );

    $consultaOtp->execute([
        'usuario_id' => $usuarioId
    ]);

    $otp = $consultaOtp->fetch();

    if (!$otp) {
        $pdo->rollBack();

        unset($_SESSION['otp_verificado']);

        responder(400, [
            'error' => 'La verificación venció. Solicitá un nuevo código.'
        ]);
    }

    // Activar la cuenta y guardar la contraseña.
    $actualizar = $pdo->prepare(
        "UPDATE usuarios
         SET contrasena_hash = :contrasena_hash,
             estado = 'activo'
         WHERE id = :usuario_id
           AND estado = 'pendiente'"
    );

    $actualizar->execute([
        'contrasena_hash' => $contrasenaHash,
        'usuario_id' => $usuarioId
    ]);

    if ($actualizar->rowCount() !== 1) {
        throw new RuntimeException(
            'No fue posible actualizar el estado de la cuenta.'
        );
    }

    // Eliminar el OTP utilizado.
    $eliminar = $pdo->prepare(
        "DELETE FROM codigos_activacion
         WHERE usuario_id = :usuario_id"
    );

    $eliminar->execute([
        'usuario_id' => $usuarioId
    ]);

    $pdo->commit();

    // Limpiar los datos temporales de activación.
    unset(
        $_SESSION['activacion_usuario_id'],
        $_SESSION['otp_verificado']
    );

    responder(200, [
        'success' => true,
        'message' => 'Tu cuenta UniPath fue activada correctamente.'
    ]);

} catch (Throwable $e) {

    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        'Error al activar cuenta UniPath: ' . $e->getMessage()
    );

    responder(500, [
        'error' => 'No fue posible activar la cuenta. Intentá nuevamente.'
    ]);
}
