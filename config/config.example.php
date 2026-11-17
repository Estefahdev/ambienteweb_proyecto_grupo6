<?php
// Copiá este archivo como config.php y llenalo con los datos de Aiven.
// config.php y ca.pem no se suben a GitHub.
return [
    'db_host'   => 'xxxx.aivencloud.com',
    'db_port'   => 12345,
    'db_name'   => 'unipath',
    'db_user'   => 'avnadmin',
    'db_pass'   => '',
    'db_ssl_ca' => __DIR__ . '/ca.pem',

    // Temporal hasta que exista el login: estudiante de prueba del seed
    'usuario_prueba_id' => 1,
];