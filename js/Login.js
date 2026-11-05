
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginMessage = document.getElementById("loginMessage");
    const forgotLink = document.getElementById("forgotLink");

    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );

    function showMessage(message, type = "") {
        loginMessage.textContent = message;
        loginMessage.className = "form-message";

        if (type) {
            loginMessage.classList.add(type);
        }

        loginMessage.hidden = false;
    }

    function clearMessage() {
        loginMessage.textContent = "";
        loginMessage.className = "form-message";
        loginMessage.hidden = true;
    }

    emailInput.addEventListener("input", clearMessage);
    passwordInput.addEventListener("input", clearMessage);

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage(
                "Completá todos los campos para continuar.",
                "error"
            );
            return;
        }

        if (!emailInput.validity.valid) {
            showMessage(
                "Ingresá un correo electrónico válido.",
                "error"
            );
            emailInput.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Verificando...";

        try {
            const datos = new URLSearchParams();

            datos.append("email", email);
            datos.append("password", password);

            const respuesta = await fetch("api/login.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: datos,
                credentials: "same-origin"
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok || !resultado.success) {
                showMessage(
                    resultado.message ||
                    "No fue posible iniciar sesión.",
                    "error"
                );
                return;
            }

            // Obtener los datos del usuario devueltos por el servidor.
            const usuario =
                resultado.usuario ||
                resultado.user ||
                resultado.data?.usuario ||
                resultado.data?.user ||
                {};

            // Obtener el nombre del usuario.
            const nombre =
                usuario.nombre ||
                usuario.name ||
                resultado.nombre ||
                resultado.name ||
                email.split("@")[0];

            // Guardar el usuario autenticado.
            sessionStorage.setItem(
                "unipathUsuario",
                JSON.stringify({
                    nombre: nombre,
                    email: email
                })
            );

            showMessage(
                "¡Bienvenido a UniPath! Redirigiendo...",
                "success"
            );

            // Enviar al panel principal.
            window.location.replace("index.html");

        } catch (error) {
            console.error("Error de inicio de sesión:", error);

            showMessage(
                "No se pudo conectar con el servidor. "
                + "Verificá que el servicio de autenticación esté funcionando.",
                "error"
            );

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Ingresar a UniPath";
        }
    });

    forgotLink.addEventListener("click", (event) => {
        event.preventDefault();

        showMessage(
            "La recuperación de contraseña todavía no está disponible."
        );
    });
});
