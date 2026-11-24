"use strict";

window.AdminCSV = (() => {
    // Parser simple de CSV: soporta campos entre comillas con comas o saltos de línea adentro.
    function parsear(texto) {
        const filas = [];
        let fila = [];
        let campo = "";
        let entreComillas = false;

        for (let i = 0; i < texto.length; i++) {
            const caracter = texto[i];

            if (entreComillas) {
                if (caracter === '"') {
                    if (texto[i + 1] === '"') {
                        campo += '"';
                        i++;
                    } else {
                        entreComillas = false;
                    }
                } else {
                    campo += caracter;
                }
                continue;
            }

            if (caracter === '"') {
                entreComillas = true;
            } else if (caracter === ",") {
                fila.push(campo);
                campo = "";
            } else if (caracter === "\n" || caracter === "\r") {
                if (caracter === "\r" && texto[i + 1] === "\n") {
                    i++;
                }
                fila.push(campo);
                filas.push(fila);
                fila = [];
                campo = "";
            } else {
                campo += caracter;
            }
        }

        if (campo !== "" || fila.length) {
            fila.push(campo);
            filas.push(fila);
        }

        return filas.filter((fila) => fila.some((valor) => valor.trim() !== ""));
    }

    // Convierte las filas (con encabezado en la primera línea) a objetos según las columnas esperadas.
    function aObjetos(texto, columnas) {
        const filas = parsear(texto);
        if (filas.length === 0) {
            return [];
        }

        const encabezado = filas[0].map((valor) => valor.trim().toLowerCase());

        return filas.slice(1).map((fila) => {
            const objeto = {};

            columnas.forEach((clave) => {
                const indice = encabezado.indexOf(clave);
                objeto[clave] = indice === -1 ? "" : (fila[indice] ?? "").trim();
            });

            return objeto;
        });
    }

    return { parsear, aObjetos };
})();
