
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // ELEMENTOS
    // =========================================

    const verificationForm = document.getElementById("verificationForm");
    const passwordForm = document.getElementById("passwordForm");

    const emailInput = document.getElementById("institutionalEmail");
    const studentIdInput = document.getElementById("studentId");

    const passwordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    const message = document.getElementById("registerMessage");

    const backButton = document.getElementById("backToVerify");

    const stages = {
        1: document.getElementById("stageVerify"),
        2: document.getElementById("stagePassword"),
        3: document.getElementById("stageComplete")
    };

    const progressSteps = document.querySelectorAll("[data-progress-step]");
    const brandSteps = document.querySelectorAll("[data-brand-step]");
    const progressLines = document.querySelectorAll(".progress-line");


    // =========================================
    // MENSAJES
    // =========================================

    function mostrarMensaje(texto, tipo = "error") {

        message.textContent = texto;
        message.className = "form-message " + tipo;
        message.hidden = false;

    }

    function limpiarMensaje() {

        message.textContent = "";
        message.className = "form-message";
        message.hidden = true;

    }


    // =========================================
    // CONTROL DE ETAPAS
    // =========================================

    function mostrarEtapa(numero) {

        Object.entries(stages).forEach(([clave, elemento]) => {

            const activa = Number(clave) === numero;

            elemento.hidden = !activa;
            elemento.classList.toggle("active", activa);

        });

        progressSteps.forEach((step) => {

            const numeroPaso = Number(step.dataset.progressStep);

            step.classList.toggle("active", numeroPaso === numero);
            step.classList.toggle("completed", numeroPaso < numero);

        });

        brandSteps.forEach((step) => {

            const numeroPaso = Number(step.dataset.brandStep);

            step.classList.toggle("active", numeroPaso === numero);
            step.classList.toggle("completed", numeroPaso < numero);

            const icono = step.querySelector(".brand-step-icon");

            if (icono) {
                icono.textContent = numeroPaso < numero ? "✓" : numeroPaso;
            }

        });

        progressLines.forEach((linea, indice) => {

            linea.classList.toggle("completed", indice < numero - 1);

        });

        limpiarMensaje();

    }


    // =========================================
    // VALIDAR CORREO Y CARNÉ
    // =========================================

    verificationForm.addEventListener("submit", async (event) => {

        event.preventDefault();
        limpiarMensaje();

        const email = emailInput.value.trim();
        const carne = studentIdInput.value.trim();

        if (!email || !carne) {

            mostrarMensaje(
                "Ingresá tu correo institucional y tu carné."
            );

            return;
        }

        if (!emailInput.validity.valid) {

            mostrarMensaje(
                "Ingresá un correo electrónico válido."
            );

            emailInput.focus();

            return;
        }

        if (carne.length < 3) {

            mostrarMensaje(
                "Verificá que el número de carné esté completo."
            );

            studentIdInput.focus();

            return;
        }

        /*
         * PENDIENTE:
         *
         * Aquí se debe consultar la API institucional para comprobar
         * que el correo y el carné pertenecen a un estudiante registrado
         * y que su cuenta todavía no ha sido activada.
         *
         * No se avanza a la siguiente etapa hasta recibir una
         * respuesta válida de esa API.
         */

        mostrarMensaje(
            "Los datos tienen un formato válido, pero la verificación " +
            "institucional todavía no está conectada. Es necesario " +
            "integrar la API para comprobar tu registro.",
            "info"
        );

    });


    // =========================================
    // VOLVER A VERIFICACIÓN
    // =========================================

    backButton.addEventListener("click", () => {

        mostrarEtapa(1);

        emailInput.focus();

    });


    // =========================================
    // VALIDAR CONTRASEÑA
    // =========================================

    passwordForm.addEventListener("submit", (event) => {

        event.preventDefault();
        limpiarMensaje();

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 6) {

            mostrarMensaje(
                "La contraseña debe tener al menos 6 caracteres."
            );

            passwordInput.focus();

            return;
        }

        if (password !== confirmPassword) {

            mostrarMensaje(
                "Las contraseñas no coinciden. Intentá nuevamente."
            );

            confirmPasswordInput.focus();

            return;
        }

        /*
         * PENDIENTE:
         *
         * En este punto se debe enviar la contraseña a la API
         * de activación, únicamente después de que la etapa 1
         * haya sido verificada correctamente.
         *
         * La contraseña debe enviarse mediante HTTPS y almacenarse
         * en el servidor utilizando un hash seguro.
         */

        mostrarMensaje(
            "La contraseña cumple con las validaciones, pero la " +
            "activación todavía requiere conectar el servicio de registro.",
            "info"
        );

    });


    // =========================================
    // LIMPIAR MENSAJES AL ESCRIBIR
    // =========================================

    [
        emailInput,
        studentIdInput,
        passwordInput,
        confirmPasswordInput
    ].forEach((campo) => {

        campo.addEventListener("input", limpiarMensaje);

    });


    // =========================================
    // INICIALIZAR
    // =========================================

    mostrarEtapa(1);

});
