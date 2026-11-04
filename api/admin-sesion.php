<?php

declare(strict_types=1);

require_once __DIR__ . '/seguridad-admin.php';

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $usuario = administradorActual();

    responderJson(200, [
        'usuario' => $usuario,
        'csrf' => tokenAdmin(),
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

if ($accion === 'salir') {
    $_SESSION = [];

    $cookie = session_get_cookie_params();

    setcookie(session_name(), '', [
        'expires' => time() - 3600,
        'path' => $cookie['path'],
        'secure' => $cookie['secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_destroy();

    responderJson(200, [
        'mensaje' => 'Sesión cerrada.',
    ]);
}

if ($accion !== 'ingresar') {
    responderJson(400, [
        'error' => 'Acción no válida.',
    ]);
}

$correo = $datos['correo'] ?? '';
$contrasena = $datos['contrasena'] ?? '';

if (
    !is_string($correo) ||
    !is_string($contrasena)
) {
    responderJson(400, [
        'error' => 'Revisá el correo y la contraseña.',
    ]);
}

$correo = trim($correo);

if (
    !filter_var($correo, FILTER_VALIDATE_EMAIL) ||
    strlen($correo) > 150 ||
    $contrasena === '' ||
    strlen($contrasena) > 1024
) {
    responderJson(400, [
        'error' => 'Revisá el correo y la contraseña.',
    ]);
}

$consulta = obtenerConexion()->prepare(
    'SELECT
        id,
        nombre,
        correo_institucional,
        universidad_id,
        contrasena_hash,
        rol,
        estado
     FROM usuarios
     WHERE correo_institucional = ?'
);

$consulta->execute([$correo]);
$usuario = $consulta->fetch();

if (
    !$usuario ||
    !password_verify(
        $contrasena,
        $usuario['contrasena_hash'] ?? ''
    )
) {
    responderJson(401, [
        'error' => 'Correo o contraseña incorrectos.',
    ]);
}

if (
    $usuario['rol'] !== 'administrador' ||
    $usuario['estado'] !== 'activo'
) {
    responderJson(403, [
        'error' => 'Esta cuenta no tiene acceso a la administración.',
    ]);
}

session_regenerate_id(true);

$_SESSION = [
    'admin_id' => (int) $usuario['id'],
    'admin_actividad' => time(),
    'csrf_admin' => bin2hex(random_bytes(32)),
];

unset(
    $usuario['contrasena_hash'],
    $usuario['rol'],
    $usuario['estado']
);

responderJson(200, [
    'usuario' => $usuario,
    'csrf' => tokenAdmin(),
]);