<?php

declare(strict_types=1);

// Ejecutar solo desde la terminal.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../api/conexion.php';

try {
    $config = obtenerConfig();

    if (!is_file($config['db_ssl_ca'])) {
        throw new RuntimeException(
            'Falta el certificado en config/ca.pem.'
        );
    }

    $conexion = obtenerConexion();

    $consulta = $conexion->query('SELECT DATABASE()');
    $base = $consulta->fetchColumn();

    echo "Conexión correcta.\n";
    echo "Base de datos: {$base}\n\n";

    $consulta = $conexion->query('SHOW TABLES');
    $tablas = $consulta->fetchAll(PDO::FETCH_COLUMN);

    echo "Tablas encontradas: " . count($tablas) . "\n";

    foreach ($tablas as $tabla) {
        echo "- {$tabla}\n";
    }

    echo "\nPrueba terminada.\n";
} catch (Throwable $error) {
    fwrite(
        STDERR,
        "Error: " . $error->getMessage() . PHP_EOL
    );

    exit(1);
}