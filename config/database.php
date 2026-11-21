
<?php

$config = require __DIR__ . '/config.php';

try {
    $dsn = "mysql:host={$config['db_host']};"
         . "port={$config['db_port']};"
         . "dbname={$config['db_name']};"
         . "charset=utf8mb4";

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_SSL_CA => $config['db_ssl_ca'],
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());

    http_response_code(500);
    die('No se pudo conectar con la base de datos.');
}
