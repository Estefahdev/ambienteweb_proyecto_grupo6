<?php

declare(strict_types=1);

require_once __DIR__ . '/comun.php';

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    session_name('unipath_admin');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS'])
            && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    if (!session_start()) {
        throw new RuntimeException(
            'No se pudo iniciar la sesión.'
        );
    }
}

function tokenAdmin(): string
{
    if (empty($_SESSION['csrf_admin'])) {
        $_SESSION['csrf_admin'] = bin2hex(
            random_bytes(32)
        );
    }

    return $_SESSION['csrf_admin'];
}

function validarTokenAdmin(): void
{
    $recibido = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    if (!hash_equals(tokenAdmin(), $recibido)) {
        responderJson(403, [
            'error' => 'La solicitud venció. Recargá la página.',
        ]);
    }
}

function administradorActual(): ?array
{
    if (empty($_SESSION['admin_id'])) {
        return null;
    }

    // Cerrar la sesión tras 30 minutos sin actividad.
    $ultimaActividad = (int) (
        $_SESSION['admin_actividad'] ?? 0
    );

    if (time() - $ultimaActividad > 1800) {
        $_SESSION = [];
        session_regenerate_id(true);

        return null;
    }

    $consulta = obtenerConexion()->prepare(
        "SELECT
            id,
            nombre,
            correo_institucional,
            universidad_id
         FROM usuarios
         WHERE id = ?
           AND rol = 'administrador'
           AND estado = 'activo'"
    );

    $consulta->execute([
        $_SESSION['admin_id'],
    ]);

    $usuario = $consulta->fetch();

    if (!$usuario) {
        $_SESSION = [];
        session_regenerate_id(true);

        return null;
    }

    $_SESSION['admin_actividad'] = time();

    return $usuario;
}

function exigirAdministrador(): array
{
    $usuario = administradorActual();

    if (!$usuario) {
        responderJson(401, [
            'error' => 'Iniciá sesión con una cuenta administradora activa.',
        ]);
    }

    return $usuario;
}