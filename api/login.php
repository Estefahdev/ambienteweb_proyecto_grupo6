<?php

declare(strict_types=1);

require_once __DIR__ . '/conexion.php';

header('Content-Type: application/json; charset=utf-8');

ini_set('session.use_strict_mode', '1');

$https = (
    !empty($_SERVER['HTTPS']) &&
    $_SERVER['HTTPS'] !== 'off'
);

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

function responder(int $codigo, array $datos): void
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// Permitir únicamente solicitudes POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, [
        'success' => false,
        'message' => 'Método no permitido.'
    ]);
}

// Recibir credenciales.
$correo = trim($_POST['email'] ?? '');
$contrasena = $_POST['password'] ?? '';

if (
    $correo === '' ||
    $contrasena === '' ||
    !filter_var($correo, FILTER_VALIDATE_EMAIL)
) {
    responder(400, [
        'success' => false,
        'message' => 'Ingresá un correo y una contraseña válidos.'
    ]);
}

try {
    $pdo = obtenerConexion();

    // Buscar usuario por correo institucional.
    $consulta = $pdo->prepare(
        "SELECT
            id,
            nombre,
            correo_institucional,
            contrasena_hash,
            rol,
            carrera_id,
            estado
        FROM usuarios
        WHERE correo_institucional = :correo
        LIMIT 1"
    );

    $consulta->execute([
        'correo' => $correo
    ]);

    $usuario = $consulta->fetch(PDO::FETCH_ASSOC);

    // Validar credenciales y estado de la cuenta.
    if (
        !$usuario ||
        $usuario['estado'] !== 'activo' ||
        empty($usuario['contrasena_hash']) ||
        !password_verify(
            $contrasena,
            $usuario['contrasena_hash']
        )
    ) {
        responder(401, [
            'success' => false,
            'message' => 'Correo o contraseña incorrectos.'
        ]);
    }

    // Validar que el rol sea reconocido.
    $rolesPermitidos = [
        'estudiante',
        'administrador'
    ];

    if (!in_array($usuario['rol'], $rolesPermitidos, true)) {
        responder(403, [
            'success' => false,
            'message' => 'El rol de usuario no está autorizado.'
        ]);
    }

    // Evitar la fijación de sesión.
    session_regenerate_id(true);

    // Guardar los datos del usuario en la sesión.
    $_SESSION['usuario'] = [
        'id' => (int) $usuario['id'],
        'nombre' => $usuario['nombre'],
        'correo' => $usuario['correo_institucional'],
        'rol' => $usuario['rol'],
        'carrera_id' => $usuario['carrera_id']
    ];

    // Devolver los datos necesarios al frontend.
    responder(200, [
        'success' => true,
        'message' => 'Inicio de sesión exitoso.',
        'usuario' => [
            'id' => (int) $usuario['id'],
            'nombre' => $usuario['nombre'],
            'email' => $usuario['correo_institucional'],
            'rol' => $usuario['rol'],
            'carrera_id' => $usuario['carrera_id']
        ]
    ]);

} catch (Throwable $e) {

    error_log('Error en login: ' . $e->getMessage());

    responder(500, [
        'success' => false,
        'message' => 'No fue posible iniciar sesión. Intentá nuevamente.'
    ]);
}
