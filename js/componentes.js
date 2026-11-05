"use strict";

window.UniPathUI = (() => {
    let numeroModal = 0;

    function elemento(tipo, clase = "", texto = "") {
        const nodo = document.createElement(tipo);

        nodo.className = clase;
        nodo.textContent = texto;

        return nodo;
    }

    function boton(texto, accion, clase = "") {
        const nodo = elemento(
            "button",
            "up-boton " + clase,
            texto
        );

        nodo.type = "button";
        nodo.addEventListener("click", accion);

        return nodo;
    }

    // Cada tabla conserva sus datos, búsqueda y página.
    function crearTabla({
        contenedor,
        columnas,
        datos = [],
        porPagina = 5,
        titulo = "Listado"
    }) {
        let registros = [...datos];
        let pagina = 1;

        porPagina = Math.max(
            1,
            Math.floor(Number(porPagina)) || 5
        );

        const zona = elemento("section");

        const etiqueta = elemento("label", "up-buscador");
        const buscador = elemento("input", "up-campo");

        buscador.type = "search";
        buscador.placeholder = "Escribí para buscar...";

        etiqueta.append(
            elemento("span", "", "Buscar"),
            buscador
        );

        const marco = elemento("div", "up-tabla-contenedor");
        const tabla = elemento("table", "up-tabla");

        tabla.append(
            elemento("caption", "up-lector", titulo)
        );

        const cabecera = tabla.createTHead().insertRow();

        columnas.forEach((columna) => {
            const celda = elemento(
                "th",
                "",
                columna.titulo
            );

            celda.scope = "col";
            cabecera.append(celda);
        });

        const cuerpo = tabla.createTBody();
        const pie = elemento("div", "up-paginacion");
        const resumen = elemento("p", "up-resumen");

        resumen.setAttribute("role", "status");

        const controles = elemento("div", "up-acciones");

        const anterior = boton("Anterior", () => {
            pagina--;
            pintar();
        });

        const siguiente = boton("Siguiente", () => {
            pagina++;
            pintar();
        });

        controles.append(anterior, siguiente);
        pie.append(resumen, controles);
        marco.append(tabla);

        zona.append(etiqueta, marco, pie);
        contenedor.replaceChildren(zona);

        function pintar() {
            const texto = buscador.value
                .trim()
                .toLocaleLowerCase("es");

            const filtrados = registros.filter((fila) =>
                columnas.some((columna) =>
                    columna.clave &&
                    String(fila[columna.clave] ?? "")
                        .toLocaleLowerCase("es")
                        .includes(texto)
                )
            );

            const paginas = Math.max(
                1,
                Math.ceil(filtrados.length / porPagina)
            );

            pagina = Math.max(
                1,
                Math.min(pagina, paginas)
            );

            const inicio = (pagina - 1) * porPagina;

            cuerpo.replaceChildren();

            filtrados
                .slice(inicio, inicio + porPagina)
                .forEach((fila) => {
                    const renglon = cuerpo.insertRow();

                    columnas.forEach((columna) => {
                        const celda = renglon.insertCell();

                        const valor = columna.renderizar
                            ? columna.renderizar(fila)
                            : fila[columna.clave];

                        if (valor instanceof Node) {
                            celda.append(valor);
                        } else {
                            celda.textContent = String(
                                valor ?? ""
                            );
                        }
                    });
                });

            if (filtrados.length === 0) {
                const celda = cuerpo
                    .insertRow()
                    .insertCell();

                celda.colSpan = columnas.length;
                celda.className = "up-vacio";
                celda.textContent =
                    "No hay resultados para mostrar.";
            }

            const fin = Math.min(
                inicio + porPagina,
                filtrados.length
            );

            resumen.textContent = filtrados.length
                ? `${inicio + 1}-${fin} de ${filtrados.length} · Página ${pagina} de ${paginas}`
                : "0 resultados";

            anterior.disabled = pagina === 1;
            siguiente.disabled = pagina === paginas;
        }

        buscador.addEventListener("input", () => {
            pagina = 1;
            pintar();
        });

        pintar();

        return {
            actualizarDatos(nuevosDatos) {
                registros = [...nuevosDatos];
                pagina = 1;
                pintar();
            }
        };
    }

    // El contenido es un nodo con los campos del formulario.
    function abrirModal({
        titulo,
        contenido,
        alGuardar,
        textoGuardar = "Guardar cambios"
    }) {
        const activador = document.activeElement;
        let guardando = false;

        const dialogo = elemento("dialog", "up-modal");
        const formulario = elemento("form");

        const cabecera = elemento(
            "div",
            "up-modal-cabecera"
        );

        const encabezado = elemento("h2", "", titulo);

        encabezado.id = `up-modal-${++numeroModal}`;

        dialogo.setAttribute(
            "aria-labelledby",
            encabezado.id
        );

        function cerrar() {
            if (!guardando) {
                dialogo.close();
            }
        }

        const salir = boton("×", cerrar);

        salir.setAttribute(
            "aria-label",
            "Cerrar ventana"
        );

        cabecera.append(encabezado, salir);

        const cuerpo = elemento(
            "div",
            "up-modal-cuerpo"
        );

        const error = elemento("p", "up-error");

        error.setAttribute("role", "alert");
        error.hidden = true;

        cuerpo.append(contenido, error);

        const pie = elemento("div", "up-modal-pie");
        const cancelar = boton("Cancelar", cerrar);

        const guardar = elemento(
            "button",
            "up-boton up-boton-primario",
            textoGuardar
        );

        guardar.type = "submit";

        pie.append(cancelar, guardar);
        formulario.append(cabecera, cuerpo, pie);

        dialogo.append(formulario);
        document.body.append(dialogo);

        formulario.addEventListener(
            "submit",
            async (evento) => {
                evento.preventDefault();

                if (
                    guardando ||
                    !formulario.reportValidity()
                ) {
                    return;
                }

                guardando = true;
                guardar.disabled = true;
                cancelar.disabled = true;
                salir.disabled = true;

                error.hidden = true;

                try {
                    const resultado = await alGuardar(
                        new FormData(formulario),
                        formulario
                    );

                    if (resultado !== false) {
                        dialogo.close("guardado");
                    }
                } catch (problema) {
                    error.textContent =
                        problema instanceof Error
                            ? problema.message
                            : "No se pudieron guardar los cambios.";

                    error.hidden = false;
                } finally {
                    guardando = false;
                    guardar.disabled = false;
                    cancelar.disabled = false;
                    salir.disabled = false;
                }
            }
        );

        dialogo.addEventListener("cancel", (evento) => {
            if (guardando) {
                evento.preventDefault();
            }
        });

        dialogo.addEventListener("close", () => {
            dialogo.remove();

            if (activador?.isConnected) {
                activador.focus();
            }
        });

        dialogo.showModal();

        return {
            cerrar,
            formulario
        };
    }

    return {
        crearTabla,
        abrirModal,
        elemento,
        boton
    };
})();