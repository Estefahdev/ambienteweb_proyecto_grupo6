"use strict";

const formAcceso = document.getElementById("formAcceso");
const sesionActiva = document.getElementById("sesionActiva");
const mensaje = document.getElementById("mensaje");
const ingresar = document.getElementById("ingresar");
const salir = document.getElementById("salir");

let csrf = "";

function mostrarError(error) {
    mensaje.textContent = error.message;
    mensaje.hidden = false;
}

function mostrarSesion(usuario) {
    const autenticado = Boolean(usuario);

    formAcceso.hidden = autenticado;
    sesionActiva.hidden = !autenticado;
    mensaje.hidden = true;

    if (autenticado) {
        document.getElementById(
            "bienvenida"
        ).textContent = `Bienvenido, ${usuario.nombre}.`;

        formAcceso.reset();
    }
}

async function peticionSesion(datos = null) {
    const opciones = {
        credentials: "same-origin",
        cache: "no-store"
    };

    if (datos !== null) {
        opciones.method = "POST";

        opciones.headers = {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf
        };

        opciones.body = JSON.stringify(datos);
    }

    const respuesta = await fetch(
        "api/admin-sesion.php",
        opciones
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            resultado.error ||
            "No se pudo completar la solicitud."
        );
    }

    return resultado;
}

async function cargarSesion() {
    ingresar.disabled = true;
    csrf = "";

    try {
        const resultado = await peticionSesion();

        csrf = resultado.csrf;

        mostrarSesion(resultado.usuario);

        ingresar.disabled = false;
    } catch (error) {
        mostrarError(error);
    }
}

formAcceso.addEventListener(
    "submit",
    async (evento) => {
        evento.preventDefault();

        if (
            ingresar.disabled ||
            !formAcceso.reportValidity()
        ) {
            return;
        }

        ingresar.disabled = true;
        mensaje.hidden = true;

        try {
            const datos = new FormData(formAcceso);

            const resultado = await peticionSesion({
                accion: "ingresar",

                correo: String(
                    datos.get("correo")
                ).trim(),

                contrasena: String(
                    datos.get("contrasena")
                )
            });

            csrf = resultado.csrf;

            mostrarSesion(resultado.usuario);

        } catch (error) {
            mostrarError(error);

        } finally {
            ingresar.disabled = false;
        }
    }
);

salir.addEventListener("click", async () => {
    salir.disabled = true;
    mensaje.hidden = true;

    try {
        await peticionSesion({
            accion: "salir"
        });

        await cargarSesion();

    } catch (error) {
        mostrarError(error);

    } finally {
        salir.disabled = false;
    }
});

cargarSesion();