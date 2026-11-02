<?php
declare(strict_types=1);
require_once __DIR__ . '/comun.php';

$pdo = obtenerConexion();

// Se asume que el plan de estudios es general, no por estudiante
$stmt = $pdo->query('SELECT semestre, codigo, nombre_materia, creditos FROM plan_estudios ORDER BY semestre ASC');
$materias = $stmt->fetchAll();

responderJson(200, ['plan' => $materias]);