
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");

    const fullNameInput = document.getElementById("fullName");
    const universityInput = document.getElementById("university");
    const emailInput = document.getElementById("registerEmail");
    const careerInput = document.getElementById("career");
    const passwordInput = document.getElementById("registerPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const termsInput = document.getElementById("terms");
    const registerMessage = document.getElementById("registerMessage");

    // Mostrar mensajes al usuario.
    function showMessage(message, type = "") {
        registerMessage.textContent = message;
        registerMessage.className = "form-message";

        if (type) {
            registerMessage.classList.add(type);
        }

        registerMessage.hidden = false;
    }

    // Limpiar mensajes anteriores.
    function clearMessage() {
        registerMessage.textContent = "";
        registerMessage.className = "form-message";
        registerMessage.hidden = true;
    }

    // Limpiar el mensaje al modificar los campos.
    const fields = [
        fullNameInput,
        universityInput,
        emailInput,
        careerInput,
        passwordInput,
        confirmPasswordInput
    ];

    fields.forEach((field) => {
        field.addEventListener("input", clearMessage);
    });

    termsInput.addEventListener("change", clearMessage);

    // Validar el formulario.
    registerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearMessage();

        const fullName = fullNameInput.value.trim();
        const university = universityInput.value.trim();
        const email = emailInput.value.trim();
        const career = careerInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Comprobar que no haya campos vacíos.
        if (
            !fullName ||
            !university ||
            !email ||
            !career ||
            !password ||
            !confirmPassword
        ) {
            showMessage(
                "Completa todos los campos para continuar.",
                "error"
            );
            return;
        }

        // Validar el nombre.
        if (fullName.length < 3) {
            showMessage(
                "El nombre completo debe tener al menos 3 caracteres.",
                "error"
            );
            fullNameInput.focus();
            return;
        }

        // Validar el correo.
        if (!emailInput.validity.valid) {
            showMessage(
                "Ingresa una dirección de correo electrónico válida.",
                "error"
            );
            emailInput.focus();
            return;
        }

        // Validar la longitud de la contraseña.
        if (password.length < 6) {
            showMessage(
                "La contraseña debe tener al menos 6 caracteres.",
                "error"
            );
            passwordInput.focus();
            return;
        }

        // Verificar que las contraseñas coincidan.
        if (password !== confirmPassword) {
            showMessage(
                "Las contraseñas no coinciden. Inténtalo nuevamente.",
                "error"
            );
            confirmPasswordInput.focus();
            return;
        }

        // Exigir aceptación de las condiciones.
        if (!termsInput.checked) {
            showMessage(
                "Debes aceptar las condiciones de la demostración.",
                "error"
            );
            termsInput.focus();
            return;
        }

        // No se registra ni se almacena la contraseña.
        showMessage(
            "La validación del formulario se completó correctamente. " +
            "Para crear tu cuenta, falta conectar el registro con " +
            "la base de datos y un servicio seguro de autenticación.",
            "success"
        );
    });
});
