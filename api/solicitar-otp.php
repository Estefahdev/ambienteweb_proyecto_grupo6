<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

session_start();

require_once __DIR__ . '/conexion.php';

require_once __DIR__ . '/../libs/PHPMailer-master/src/Exception.php';
require_once __DIR__ . '/../libs/PHPMailer-master/src/PHPMailer.php';
require_once __DIR__ . '/../libs/PHPMailer-master/src/SMTP.php';

date_default_timezone_set('America/Costa_Rica');

function responder(int $estado, array $datos): never
{
    http_response_code($estado);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 1. Leer los datos recibidos.
    $datos = json_decode(file_get_contents('php://input'), true);

    if (!is_array($datos)) {
        responder(400, ['error' => 'Solicitud inválida.']);
    }

    $correo = strtolower(trim($datos['email'] ?? ''));
    $carne = trim($datos['studentId'] ?? '');

    if (
        !filter_var($correo, FILTER_VALIDATE_EMAIL) ||
        $carne === '' ||
        strlen($carne) > 20
    ) {
        responder(400, [
            'error' => 'Ingresá un correo y carné válidos.'
        ]);
    }

    // 2. Obtener configuración y conexión.
    $config = obtenerConfig();
    $pdo = obtenerConexion();

    // 3. Buscar al estudiante pendiente.
    $consulta = $pdo->prepare(
        "SELECT id, nombre, correo_institucional
         FROM usuarios
         WHERE correo_institucional = :correo
           AND carne = :carne
           AND estado = 'pendiente'
           AND rol = 'estudiante'
         LIMIT 1"
    );

    $consulta->execute([
        'correo' => $correo,
        'carne' => $carne
    ]);

    $usuario = $consulta->fetch();

    if (!$usuario) {
        responder(400, [
            'error' => 'No fue posible verificar los datos ingresados.'
        ]);
    }

    // 4. Comprobar el tiempo desde el último envío.
    $consulta = $pdo->prepare(
        "SELECT fecha_creacion
         FROM codigos_activacion
         WHERE usuario_id = :usuario_id
         LIMIT 1"
    );

    $consulta->execute([
        'usuario_id' => $usuario['id']
    ]);

    $codigoAnterior = $consulta->fetch();

    if ($codigoAnterior) {
        $ultimoEnvio = strtotime($codigoAnterior['fecha_creacion']);

        if (
            $ultimoEnvio !== false &&
            (time() - $ultimoEnvio) < 60
        ) {
            responder(429, [
                'error' => 'Esperá un minuto antes de solicitar otro código.'
            ]);
        }
    }

    // 5. Generar un OTP aleatorio de seis dígitos.
    $codigo = str_pad(
        (string) random_int(0, 999999),
        6,
        '0',
        STR_PAD_LEFT
    );

    // Nunca guardar el código en texto plano.
    $codigoHash = password_hash($codigo, PASSWORD_DEFAULT);

    // 6. Guardar el código en la base de datos.
    $guardar = $pdo->prepare(
        "INSERT INTO codigos_activacion (
            usuario_id,
            codigo_hash,
            fecha_expiracion,
            fecha_verificacion,
            intentos,
            fecha_creacion
        )
        VALUES (
            :usuario_id,
            :codigo_hash,
            DATE_ADD(NOW(), INTERVAL 10 MINUTE),
            NULL,
            0,
            NOW()
        )
        ON DUPLICATE KEY UPDATE
            codigo_hash = VALUES(codigo_hash),
            fecha_expiracion = VALUES(fecha_expiracion),
            fecha_verificacion = NULL,
            intentos = 0,
            fecha_creacion = NOW()"
    );

    $guardar->execute([
        'usuario_id' => $usuario['id'],
        'codigo_hash' => $codigoHash
    ]);

    // 7. Configurar PHPMailer.
    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host = $config['mail_host'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['mail_username'];
    $mail->Password = $config['mail_password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = (int) $config['mail_port'];
    $mail->CharSet = 'UTF-8';

    // 8. Configurar remitente y destinatario.
    $mail->setFrom(
        $config['mail_from'],
        $config['mail_from_name']
    );

    // El OTP se envía al correo institucional registrado.
    $mail->addAddress(
        $usuario['correo_institucional'],
        $usuario['nombre']
    );

    // 9. Preparar el mensaje.
    $nombreSeguro = htmlspecialchars(
        $usuario['nombre'],
        ENT_QUOTES,
        'UTF-8'
    );

    $codigoSeguro = htmlspecialchars(
        $codigo,
        ENT_QUOTES,
        'UTF-8'
    );

    $mail->isHTML(true);
    $mail->Subject = 'Código de activación - UniPath';

    $mail->Body = '
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Activación UniPath</title>
    </head>
    <body style="font-family:Arial,sans-serif;background:#f4f6f9;padding:25px;">

        <div style="max-width:550px;margin:auto;background:#ffffff;padding:30px;border-radius:12px;">

            <h2 style="color:#2563eb;">Activación de UniPath</h2>

            <p>Hola ' . $nombreSeguro . ',</p>

            <p>
                Recibimos una solicitud para activar tu cuenta.
                Utilizá el siguiente código para verificar tu identidad:
            </p>

            <div style="background:#f1f5f9;padding:22px;text-align:center;border-radius:10px;">

                <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1e40af;">
                    ' . $codigoSeguro . '
                </span>

            </div>

            <p>
                Este código vence en <strong>10 minutos</strong>.
            </p>

            <p>
                Si no solicitaste esta activación, ignorá este mensaje.
            </p>

            <hr style="border:0;border-top:1px solid #ddd;margin:25px 0;">

            <p style="color:#64748b;font-size:12px;">
                Equipo de desarrollo UniPath
            </p>

        </div>

    </body>
    </html>
    ';

    $mail->AltBody =
        "Hola {$usuario['nombre']}. Tu código de activación UniPath es {$codigo}. Vence en 10 minutos.";

    // 10. Enviar el correo.
    try {
        $mail->send();
    } catch (Throwable $e) {
        // Invalidar el OTP si no se pudo enviar.
        $invalidar = $pdo->prepare(
            "DELETE FROM codigos_activacion
             WHERE usuario_id = :usuario_id"
        );

        $invalidar->execute([
            'usuario_id' => $usuario['id']
        ]);

        throw $e;
    }

    // 11. Guardar el usuario en la sesión de activación.
    session_regenerate_id(true);

    $_SESSION['activacion_usuario_id'] = (int) $usuario['id'];
    $_SESSION['otp_verificado'] = false;

    responder(200, [
        'success' => true,
        'message' => 'Enviamos un código de verificación a tu correo institucional.'
    ]);

} catch (Throwable $e) {

    error_log(
        'Error en solicitar-otp.php: ' . $e->getMessage()
    );

    responder(500, [
        'error' => 'No fue posible enviar el código. Intentá nuevamente.'
    ]);
}
