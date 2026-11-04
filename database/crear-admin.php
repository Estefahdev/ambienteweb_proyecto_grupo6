<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../api/conexion.php';

function pedirDato(string $pregunta): string
{
    echo $pregunta;

    return trim((string) fgets(STDIN));
}

try {
    $conexion = obtenerConexion();

    $consulta = $conexion->query(
        'SELECT id, nombre
         FROM universidades
         ORDER BY nombre'
    );

    $universidades = $consulta->fetchAll();

    if (!$universidades) {
        throw new RuntimeException(
            'Primero debe existir una universidad en la base de datos.'
        );
    }

    echo "Universidades disponibles:\n";

    foreach ($universidades as $universidad) {
        echo $universidad['id']
            . ' - '
            . $universidad['nombre']
            . PHP_EOL;
    }

    $universidadId = filter_var(
        pedirDato('ID de universidad: '),
        FILTER_VALIDATE_INT
    );

    $nombre = pedirDato(
        'Nombre del administrador: '
    );

    $correo = pedirDato(
        'Correo de acceso: '
    );

    $idsPermitidos = array_map(
        'intval',
        array_column($universidades, 'id')
    );

    if (
        !$universidadId ||
        !in_array($universidadId, $idsPermitidos, true)
    ) {
        throw new RuntimeException(
            'El ID de universidad no es válido.'
        );
    }

    if (!preg_match('/^.{3,150}$/us', $nombre)) {
        throw new RuntimeException(
            'El nombre debe tener de 3 a 150 caracteres.'
        );
    }

    if (
        !filter_var($correo, FILTER_VALIDATE_EMAIL) ||
        strlen($correo) > 150
    ) {
        throw new RuntimeException(
            'El correo no es válido.'
        );
    }

    $consulta = $conexion->prepare(
        'SELECT id
         FROM usuarios
         WHERE correo_institucional = ?'
    );

    $consulta->execute([$correo]);

    if ($consulta->fetch()) {
        throw new RuntimeException(
            'Ese correo ya está registrado. Usá otro para la cuenta nueva.'
        );
    }

    // Generar la contraseña de la cuenta nueva.
    $contrasena = bin2hex(random_bytes(10));

    $hash = password_hash(
        $contrasena,
        PASSWORD_DEFAULT
    );

    $consulta = $conexion->prepare(
        "INSERT INTO usuarios (
            universidad_id,
            nombre,
            correo_institucional,
            contrasena_hash,
            rol,
            estado
         )
         VALUES (
            ?, ?, ?, ?, 'administrador', 'activo'
         )"
    );

    $consulta->execute([
        $universidadId,
        $nombre,
        $correo,
        $hash,
    ]);

    echo "\nAdministrador creado.\n";
    echo "Correo: {$correo}\n";
    echo "Contraseña generada: {$contrasena}\n";
    echo "Guardá la contraseña en tu gestor de contraseñas.\n";

} catch (Throwable $error) {
    fwrite(
        STDERR,
        'Error: '
        . $error->getMessage()
        . PHP_EOL
    );

    exit(1);
}