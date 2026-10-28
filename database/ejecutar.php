<?php
// Ejecuta un archivo .sql contra la base de config.php.
// Uso: php database/ejecutar.php database/schema.sql
declare(strict_types=1);

// Solo desde la terminal, nunca desde el navegador
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../api/conexion.php';

$archivo = $argv[1] ?? '';
if (!is_file($archivo)) {
    fwrite(STDERR, "Uso: php database/ejecutar.php <archivo.sql>\n");
    exit(1);
}

// Se quitan los comentarios y se separa por ";" al final de línea
// (los scripts no usan ";" dentro de textos)
$sql = preg_replace('/^\s*--.*$/m', '', file_get_contents($archivo));
$sentencias = array_filter(array_map('trim', preg_split('/;\s*$/m', $sql)));

$pdo = obtenerConexion();
$numero = 0;

try {
    foreach ($sentencias as $sql) {
        $numero++;
        $pdo->exec($sql);
    }
} catch (PDOException $e) {
    fwrite(STDERR, "Error en la sentencia {$numero}: {$e->getMessage()}\n");
    exit(1);
}

echo "Listo: {$numero} sentencias de " . basename($archivo) . " en la base " . obtenerConfig()['db_name'] . ".\n";