<?php

declare(strict_types=1);

// Restaura la base desde un respaldo generado por respaldo.php. Sobrescribe las tablas actuales.
// Uso: php database/restaurar.php database/respaldos/respaldo-2026-11-19_120000.sql

require __DIR__ . '/../api/conexion.php';

$archivo = $argv[1] ?? null;

if ($archivo === null || !is_file($archivo)) {
    fwrite(STDERR, "Uso: php database/restaurar.php <ruta-al-respaldo.sql>\n");
    exit(1);
}

$pdo = obtenerConexion();
$pdo->exec((string) file_get_contents($archivo));

echo "Base restaurada desde: $archivo\n";
