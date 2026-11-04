"use strict";

window.AdminAPI = (() => {
    let csrf = "";

    async function solicitar(recurso, datos = null) {
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
            "api/" + recurso,
            opciones
        );

        let resultado;

        try {
            resultado = await respuesta.json();
        } catch {
            throw new Error(
                "El servidor no devolvió una respuesta válida. Revisá la terminal de PHP."
            );
        }

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                window.location.assign(
                    "admin-acceso.html"
                );
            }

            throw new Error(
                resultado.error ||
                "No se pudo completar la solicitud."
            );
        }

        return resultado;
    }

    return {
        async iniciar() {
            const resultado = await solicitar(
                "admin-sesion.php"
            );

            csrf = resultado.csrf;

            return resultado.usuario;
        },

        consultar(recurso) {
            return solicitar(recurso);
        },

        guardar(recurso, datos) {
            return solicitar(recurso, datos);
        },

        async salir() {
            await solicitar(
                "admin-sesion.php",
                { accion: "salir" }
            );

            csrf = "";

            window.location.assign(
                "admin-acceso.html"
            );
        }
    };
})();