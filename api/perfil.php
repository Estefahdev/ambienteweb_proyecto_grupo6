<?php

declare(strict_types=1);

require_once __DIR__ . '/comun.php';

$pdo = obtenerConexion();
$usuarioId = usuarioActualId();

// Datos personales
$stmt = $pdo->prepare('SELECT nombre, correo, carrera, universidad FROM estudiantes WHERE id = ?');
$stmt->execute([$usuarioId]);
$perfil = $stmt->fetch();

// Historial de materias
$stmt = $pdo->prepare('SELECT codigo, nombre_materia, creditos, nota FROM historial_academico WHERE estudiante_id = ?');
$stmt->execute([$usuarioId]);
$historial = $stmt->fetchAll();

responderJson(200, [
    'perfil' => $perfil,
    'historial' => $historial
]);