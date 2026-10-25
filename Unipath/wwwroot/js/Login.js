
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberInput = document.getElementById("remember");
    const forgotLink = document.getElementById("forgotLink");
    const loginMessage = document.getElementById("loginMessage");

    // Mostrar mensajes del formulario.
    function showMessage(message, type = "") {
        loginMessage.textContent = message;
        loginMessage.className = "form-message";

        if (type) {
            loginMessage.classList.add(type);
        }

        loginMessage.hidden = false;
    }

    // Ocultar el mensaje cuando el usuario modifica los datos.
    function clearMessage() {
        loginMessage.textContent = "";
        loginMessage.className = "form-message";
        loginMessage.hidden = true;
    }

    emailInput.addEventListener("input", clearMessage);
    passwordInput.addEventListener("input", clearMessage);

    // Validar el formulario sin conectarse a una base de datos.
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();

        clearMessage();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage(
                "Completa todos los campos para continuar.",
                "error"
            );
            return;
        }

        if (!emailInput.validity.valid) {
            showMessage(
                "Ingresa una dirección de correo electrónico válida.",
                "error"
            );
            emailInput.focus();
            return;
        }

        if (password.length < 6) {
            showMessage(
                "La contraseña debe tener al menos 6 caracteres.",
                "error"
            );
            passwordInput.focus();
            return;
        }

        // Todavía no existe autenticación real.
        showMessage(
            "El formulario está funcionando correctamente. " +
            "Para iniciar sesión, primero debes conectar el sistema " +
            "con la base de datos y verificar las credenciales.",
            "success"
        );
    });

    // Recuperación de contraseña pendiente de implementar.
    forgotLink.addEventListener("click", (event) => {
        event.preventDefault();

        showMessage(
            "La recuperación de contraseña estará disponible " +
            "cuando se implemente el sistema de usuarios."
        );
    });

    // El navegador gestiona el estado del campo Recordarme.
    // No se guardan contraseñas ni datos personales.
    rememberInput.addEventListener("change", clearMessage);
});
