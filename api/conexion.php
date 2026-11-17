<?php

declare(strict_types=1);

/**
 * Carga la configuración de la base de datos.
 */
function obtenerConfig(): array
{
    $rutaConfig = __DIR__ . '/../config/config.php';

    if (!file_exists($rutaConfig)) {
        throw new RuntimeException(
            'No se encontró el archivo de configuración de la base de datos.'
        );
    }

    $config = require $rutaConfig;

    if (!is_array($config)) {
        throw new RuntimeException(
            'La configuración de la base de datos no es válida.'
        );
    }

    return $config;
}

/**
 * Obtiene una conexión PDO con MySQL en Aiven.
 */
function obtenerConexion(): PDO
{
    static $pdo = null;

    // Reutilizar la conexión si ya existe.
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = obtenerConfig();

    // Verificar que estén configurados los datos necesarios.
    $camposRequeridos = [
        'db_host',
        'db_port',
        'db_name',
        'db_user',
        'db_pass',
        'db_ssl_ca'
    ];

    foreach ($camposRequeridos as $campo) {
        if (!isset($config[$campo]) || $config[$campo] === '') {
            throw new RuntimeException(
                "Falta configurar el parámetro: {$campo}"
            );
        }
    }

    // Verificar que exista el certificado SSL.
    if (!is_file($config['db_ssl_ca'])) {
        throw new RuntimeException(
            'No se encontró el certificado SSL de la base de datos.'
        );
    }

    // Construir el DSN de MySQL.
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_port'],
        $config['db_name']
    );

    // Opciones de PDO.
    $opciones = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
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

    // Crear la conexión.
    $pdo = new PDO(
        $dsn,
        $config['db_user'],
        $config['db_pass'],
        $opciones
    );

    return $pdo;
}