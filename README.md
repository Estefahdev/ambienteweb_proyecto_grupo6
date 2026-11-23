# UniPath

Aplicación web de planificación académica. El estudiante registra sus materias aprobadas y su situación personal, y el sistema genera rutas posibles hacia la graduación que respetan los prerrequisitos del plan de estudios y no sobrecargan al estudiante.

Proyecto del curso SC-502 Ambiente Web Cliente Servidor, Universidad Fidélitas, cuatrimestre 2026-3.

## Stack

HTML5, CSS3, JavaScript (vanilla) y PHP con PDO sobre MySQL. Bootstrap para componentes de interfaz.

## Estructura del proyecto

```
├── api/                  Endpoints PHP (uno por recurso, responden JSON)
├── js/                   Lógica de cada pantalla y helpers compartidos
├── css/                  Estilos
├── database/             Esquema, datos de ejemplo y scripts de respaldo
├── config/               Configuración local (credenciales), no se sube a GitHub
├── libs/                 Dependencias de terceros (PHPMailer)
└── *.html                Pantallas de la aplicación
```

## Poner el proyecto a correr localmente

1. Copiá `config/config.example.php` como `config/config.php` y llenalo con los datos de conexión a la base (Aiven) y del correo SMTP para los códigos de activación de cuenta. Pedí las credenciales al resto del equipo.
2. Poné el certificado SSL de la base (`ca.pem`) en `config/ca.pem`.
3. Desde la raíz del proyecto:
   ```bash
   php -S localhost:8000
   ```
4. Abrí `http://localhost:8000/login.html` en el navegador.

`config/config.php` y `config/ca.pem` están en `.gitignore` a propósito — cada quien usa su propia copia local, nunca se suben al repositorio.

## Base de datos

- `database/schema.sql` — estructura de todas las tablas.
- `database/seed.sql` — datos de ejemplo para desarrollo y pruebas.
- `database/respaldo.php` / `database/restaurar.php` — generan y restauran un respaldo local completo de la base (útil para la defensa, por si falla la conexión a Aiven ese día).

## Módulos

- **Área pública** — inicio de sesión y activación de cuenta (con código de verificación por correo).
- **Área del estudiante** — panel principal, perfil académico, plan de estudios, situación personal, generador de rutas y mis rutas.
- **Área de administración** — gestión de carreras, asignaturas y usuarios por parte del personal de la universidad.

## Equipo

Proyecto desarrollado en grupo para el curso SC-502, cada integrante trabajó en su propia rama (`Abraham`, `Estefania`, `Joan`, `Yazmin`), integradas a `main` mediante Pull Request.
