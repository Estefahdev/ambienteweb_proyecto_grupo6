<?php

declare(strict_types=1);

require_once __DIR__ . '/seguridad-admin.php';

$administrador = exigirAdministrador();

$conexion = obtenerConexion();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $usuarios = $conexion->query(
        "SELECT
            us.id,
            us.nombre,
            us.carne,
            us.correo_institucional,
            us.rol,
            us.estado,
            us.fecha_registro,
            ca.nombre AS carrera
         FROM usuarios us
         LEFT JOIN carreras ca ON ca.id = us.carrera_id
         ORDER BY us.fecha_registro DESC, us.id DESC"
    )->fetchAll();

    responderJson(200, [
        'usuarios' => $usuarios,
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

if (!in_array($accion, ['agregar_admin', 'estado'], true)) {
    responderJson(400, [
        'error' => 'Acción no válida.',
    ]);
}

if ($accion === 'estado') {
    $id = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $estado = $datos['estado'] ?? '';

    if ($id === false || !in_array($estado, ['activo', 'inactivo'], true)) {
        responderJson(400, [
            'error' => 'Seleccioná un usuario y un estado válido.',
        ]);
    }

    if ($id === (int) $administrador['id']) {
        responderJson(400, [
            'error' => 'No podés cambiar el estado de tu propia cuenta.',
        ]);
    }

    $consulta = $conexion->prepare('UPDATE usuarios SET estado = ? WHERE id = ?');
    $consulta->execute([$estado, $id]);

    if ($consulta->rowCount() === 0) {
        responderJson(404, ['error' => 'El usuario ya no existe.']);
    }

    responderJson(200, [
        'mensaje' => $estado === 'activo' ? 'Usuario activado.' : 'Usuario inactivado.',
    ]);
}

// accion === 'agregar_admin'
$nombre = trim((string) ($datos['nombre'] ?? ''));
$correo = trim((string) ($datos['correo_institucional'] ?? ''));
$contrasena = (string) ($datos['contrasena'] ?? '');

if (!preg_match('/^[^\r\n]{3,150}$/u', $nombre)) {
    responderJson(400, [
        'error' => 'El nombre debe tener de 3 a 150 caracteres.',
    ]);
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 150) {
    responderJson(400, [
        'error' => 'Revisá el correo institucional.',
    ]);
}

if (strlen($contrasena) < 8 || strlen($contrasena) > 1024) {
    responderJson(400, [
        'error' => 'La contraseña debe tener al menos 8 caracteres.',
    ]);
}

try {
    $conexion->prepare(
        'INSERT INTO usuarios (universidad_id, nombre, correo_institucional, contrasena_hash, rol, estado)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([
        $administrador['universidad_id'],
        $nombre,
        $correo,
        password_hash($contrasena, PASSWORD_DEFAULT),
        'administrador',
        'activo',
    ]);
} catch (PDOException $error) {
    if ((int) ($error->errorInfo[1] ?? 0) === 1062) {
        responderJson(409, ['error' => 'Ya existe un usuario con ese correo institucional.']);
    }

    throw $error;
}

responderJson(201, [
    'id' => (int) $conexion->lastInsertId(),
    'mensaje' => 'Administrador agregado.',
]);
