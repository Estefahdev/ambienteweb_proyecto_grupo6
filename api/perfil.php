<?php
declare(strict_types=1);
require_once __DIR__ . '/comun.php';

$pdo = obtenerConexion();
$usuarioId = usuarioActualId();

// 1. Datos del estudiante 
$stmt = $pdo->prepare('
    SELECT u.nombre, u.correo_institucional, c.nombre as carrera 
    FROM usuarios u
    LEFT JOIN carreras c ON u.carrera_id = c.id
    WHERE u.id = ?
');
$stmt->execute([$usuarioId]);
$perfil = $stmt->fetch();

// 2. Materias del estudiante (en curso y aprobadas)
$stmt2 = $pdo->prepare('
    SELECT a.codigo, a.nombre, a.creditos, ea.estado
    FROM asignaturas a
    INNER JOIN estudiante_asignatura ea ON a.id = ea.asignatura_id
    WHERE ea.usuario_id = ?
    ORDER BY ea.estado DESC, a.codigo ASC
');
$stmt2->execute([$usuarioId]);
$historial = $stmt2->fetchAll();

responderJson(200, [
    'perfil' => $perfil,
    'historial' => $historial
]);