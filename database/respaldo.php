<?php

declare(strict_types=1);

// Genera un respaldo local completo de la base (estructura + datos).
// Uso: php database/respaldo.php

require __DIR__ . '/../api/conexion.php';

$pdo = obtenerConexion();
$tablas = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);

$carpeta = __DIR__ . '/respaldos';
if (!is_dir($carpeta)) {
    mkdir($carpeta, 0777, true);
}

$archivo = $carpeta . '/respaldo-' . date('Y-m-d_His') . '.sql';
$sql = "SET FOREIGN_KEY_CHECKS=0;\n\n";

foreach ($tablas as $tabla) {
    $crear = $pdo->query("SHOW CREATE TABLE `$tabla`")->fetch();
    $sql .= "DROP TABLE IF EXISTS `$tabla`;\n" . $crear['Create Table'] . ";\n\n";

    $filas = $pdo->query("SELECT * FROM `$tabla`")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($filas as $fila) {
        $columnas = array_map(fn ($c) => "`$c`", array_keys($fila));
        // pdo->quote() escapa cada valor; evita depender del cliente mysql por línea de comandos.
        $valores = array_map(
            fn ($v) => $v === null ? 'NULL' : $pdo->quote((string) $v),
            array_values($fila)
        );
        $sql .= 'INSERT INTO `' . $tabla . '` (' . implode(', ', $columnas) . ') VALUES (' . implode(', ', $valores) . ");\n";
    }
    $sql .= "\n";
}

$sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

file_put_contents($archivo, $sql);

echo "Respaldo guardado en: $archivo\n";
echo 'Tamano: ' . round(filesize($archivo) / 1024, 1) . " KB\n";
