<?php
declare(strict_types=1);

function obtenerConfig(): array
{
    static $config = null;

    if ($config === null) {
        $ruta = __DIR__ . '/../config/config.php';
        if (!is_file($ruta)) {
            throw new RuntimeException('Falta config/config.php (copiá config.example.php).');
        }
        $config = require $ruta;
    }

    return $config;
}

// Una sola conexión por petición
function obtenerConexion(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $config = obtenerConfig();
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config['db_host'],
            $config['db_port'],
            $config['db_name']
        );

        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            // Aiven exige SSL
            PDO::MYSQL_ATTR_SSL_CA => $config['db_ssl_ca'],
            PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => true,
        ]);
    }

    return $pdo;
}