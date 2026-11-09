<?php
declare(strict_types=1);
require_once __DIR__ . '/comun.php';

$pdo = obtenerConexion();

// Traemos las asignaturas de la carrera 
$stmt = $pdo->query('SELECT cuatrimestre_sugerido, codigo, nombre, creditos FROM asignaturas WHERE carrera_id = 1 ORDER BY cuatrimestre_sugerido ASC');
$materias = $stmt->fetchAll();

responderJson(200, ['plan' => $materias]);