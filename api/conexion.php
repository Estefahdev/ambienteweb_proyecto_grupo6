<?php

declare(strict_types=1);

function obtenerConfig(): array
{
    static $config = null;

    if ($config === null) {
        $ruta = __DIR__ . '/../config/config.php';

        if (!is_file($ruta)) {
            throw new RuntimeException(
                'Falta el archivo config/config.php.'
            );
        }

        $config = require $ruta;
    }

    return $config;
}

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

        $opciones = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        // Configurar SSL según la versión de PHP.
        if (class_exists('Pdo\Mysql')) {
            $opciones[\Pdo\Mysql::ATTR_SSL_CA] =
                $config['db_ssl_ca'];

            $opciones[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] =
                true;
        } else {
            $opciones[PDO::MYSQL_ATTR_SSL_CA] =
                $config['db_ssl_ca'];

            $opciones[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] =
                true;
        }

        $pdo = new PDO(
            $dsn,
            $config['db_user'],
            $config['db_pass'],
            $opciones
        );
    }

    return $pdo;
}