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

    // Correo SMTP para los codigos de activacion de cuenta (PHPMailer)
    'mail_host'      => 'smtp.gmail.com',
    'mail_port'      => 587,
    'mail_username'  => '',
    'mail_password'  => '',
    'mail_from'      => '',
    'mail_from_name' => 'UniPath',
];