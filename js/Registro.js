"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // ELEMENTOS
    // =========================================

    const verificationForm = document.getElementById("verificationForm");
    const otpForm = document.getElementById("otpForm");
    const passwordForm = document.getElementById("passwordForm");

    const emailInput = document.getElementById("institutionalEmail");
    const studentIdInput = document.getElementById("studentId");
    const otpInput = document.getElementById("otpCode");

    const passwordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    const message = document.getElementById("registerMessage");

    const backButton = document.getElementById("backToVerify");
    const resendButton = document.getElementById("resendOtp");

    const stages = {
        1: document.getElementById("stageVerify"),
        2: document.getElementById("stageOtp"),
        3: document.getElementById("stagePassword"),
        4: document.getElementById("stageComplete")
    };

    const progressSteps = document.querySelectorAll("[data-progress-step]");
    const brandSteps = document.querySelectorAll("[data-brand-step]");
    const progressLines = document.querySelectorAll(".progress-line");

    let solicitandoCodigo = false;
    let verificandoCodigo = false;
    let activandoCuenta = false;
    let reenviandoCodigo = false;

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
    // COMUNICACIÓN CON LA API
    // =========================================

    async function enviarSolicitud(endpoint, datos) {

        const respuesta = await fetch(endpoint, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        let resultado;

        try {
            resultado = await respuesta.json();
        } catch {
            throw new Error("El servidor devolvió una respuesta inválida.");
        }

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje ||
                resultado.message ||
                "No fue posible completar la solicitud."
            );
        }

        return resultado;
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
    // ETAPA 1: SOLICITAR CÓDIGO OTP
    // =========================================

    verificationForm.addEventListener("submit", async (event) => {

        event.preventDefault();
        limpiarMensaje();

        const email = emailInput.value.trim();
        const studentId = studentIdInput.value.trim();

        if (!email || !studentId) {
            mostrarMensaje("Ingresá tu correo institucional y tu carné.");
            return;
        }

        if (!emailInput.validity.valid) {
            mostrarMensaje("Ingresá un correo electrónico válido.");
            emailInput.focus();
            return;
        }

        if (studentId.length < 3) {
            mostrarMensaje("Verificá que el número de carné esté completo.");
            studentIdInput.focus();
            return;
        }

        if (solicitandoCodigo) return;

        solicitandoCodigo = true;

        const boton = verificationForm.querySelector('[type="submit"]');
        boton.disabled = true;
        boton.textContent = "Enviando código...";

        try {

            await enviarSolicitud("api/solicitar-otp.php", {
                email: email,
                studentId: studentId
            });

            otpInput.value = "";
            mostrarEtapa(2);
            otpInput.focus();

            mostrarMensaje(
                "Si tus datos coinciden con un registro pendiente, recibirás un código en tu correo institucional.",
                "success"
            );

        } catch (error) {

            mostrarMensaje(error.message);

        } finally {

            solicitandoCodigo = false;
            boton.disabled = false;
            boton.innerHTML = 'Verificar <span aria-hidden="true">→</span>';

        }

    });

    // =========================================
    // ETAPA 2: VERIFICAR CÓDIGO OTP
    // =========================================

    otpForm.addEventListener("submit", async (event) => {

        event.preventDefault();
        limpiarMensaje();

        const codigo = otpInput.value.trim();

        if (!/^[0-9]{6}$/.test(codigo)) {
            mostrarMensaje("Ingresá el código de seis dígitos.");
            otpInput.focus();
            return;
        }

        if (verificandoCodigo) return;

        verificandoCodigo = true;

        const boton = otpForm.querySelector('[type="submit"]');
        boton.disabled = true;
        boton.textContent = "Verificando...";

        try {

            await enviarSolicitud("api/verificar-otp.php", {
                codigo: codigo
            });

            mostrarEtapa(3);
            passwordInput.focus();

            mostrarMensaje(
                "Correo verificado correctamente. Ahora creá tu contraseña.",
                "success"
            );

        } catch (error) {

            mostrarMensaje(error.message);

        } finally {

            verificandoCodigo = false;
            boton.disabled = false;
            boton.innerHTML = 'Verificar código →';

        }

    });

    // =========================================
    // REENVIAR CÓDIGO OTP
    // =========================================

    resendButton.addEventListener("click", async () => {

        if (reenviandoCodigo) return;

        reenviandoCodigo = true;
        resendButton.disabled = true;
        limpiarMensaje();

        try {

            await enviarSolicitud("api/solicitar-otp.php", {
                email: emailInput.value.trim(),
                studentId: studentIdInput.value.trim()
            });

            mostrarMensaje(
                "Se procesó la solicitud. Revisá tu correo institucional.",
                "success"
            );

        } catch (error) {

            mostrarMensaje(error.message);

        } finally {

            reenviandoCodigo = false;
            resendButton.disabled = false;

        }

    });

    // =========================================
    // VOLVER A VERIFICACIÓN
    // =========================================

    backButton.addEventListener("click", () => {

        mostrarEtapa(1);
        emailInput.focus();

    });

    // =========================================
    // ETAPA 3: ACTIVAR CUENTA
    // =========================================

    passwordForm.addEventListener("submit", async (event) => {

        event.preventDefault();
        limpiarMensaje();

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 8) {
            mostrarMensaje("La contraseña debe tener al menos 8 caracteres.");
            passwordInput.focus();
            return;
        }

        if (new TextEncoder().encode(password).length > 72) {
            mostrarMensaje("La contraseña es demasiado larga.");
            passwordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            mostrarMensaje("Las contraseñas no coinciden.");
            confirmPasswordInput.focus();
            return;
        }

        if (activandoCuenta) return;

        activandoCuenta = true;

        const boton = passwordForm.querySelector('[type="submit"]');
        boton.disabled = true;
        boton.textContent = "Activando cuenta...";

        try {

            await enviarSolicitud("api/activar-cuenta.php", {
                password: password,
                confirmPassword: confirmPassword
            });

            passwordForm.reset();

            mostrarEtapa(4);

        } catch (error) {

            mostrarMensaje(error.message);

        } finally {

            activandoCuenta = false;
            boton.disabled = false;
            boton.innerHTML = 'Activar cuenta <span aria-hidden="true">→</span>';

        }

    });

    // =========================================
    // LIMPIAR MENSAJES AL ESCRIBIR
    // =========================================

    [
        emailInput,
        studentIdInput,
        otpInput,
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
