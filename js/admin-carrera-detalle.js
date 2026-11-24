"use strict";

const UI = window.UniPathUI;
const API = window.AdminAPI;
const CSV = window.AdminCSV;

const carreraId = Number(
    new URLSearchParams(window.location.search).get("id")
);

const actualizar = document.getElementById("actualizar");
const nuevaAsignatura = document.getElementById("nuevaAsignatura");
const importarCsv = document.getElementById("importarCsv");
const cerrarSesion = document.getElementById("cerrarSesion");
const mensaje = document.getElementById("mensajeAsignaturas");

let carrera = null;
let asignaturas = [];
let numeroCarga = 0;

const COLUMNAS_PLAN_CSV = [
    "codigo",
    "nombre",
    "cuatrimestre_sugerido",
    "creditos",
    "horas_semanales",
    "costo"
];

const tabla = UI.crearTabla({
    contenedor: document.getElementById("tablaAsignaturas"),
    titulo: "Asignaturas",
    porPagina: 10,

    columnas: [
        { clave: "codigo", titulo: "Código" },
        { clave: "nombre", titulo: "Asignatura" },
        { clave: "cuatrimestre_sugerido", titulo: "Cuatrimestre" },
        { clave: "creditos", titulo: "Créditos" },
        { clave: "horas_semanales", titulo: "Horas / sem" },

        {
            clave: "costo",
            titulo: "Costo",
            renderizar: (fila) => `₡${Number(fila.costo).toLocaleString("es-CR")}`
        },

        {
            clave: "estado",
            titulo: "Estado",
            renderizar: (fila) => UI.elemento("span", "up-etiqueta up-etiqueta-" + fila.estado, fila.estado)
        },

        {
            titulo: "Acciones",
            renderizar(fila) {
                const acciones = UI.elemento("div", "up-acciones");

                acciones.append(
                    UI.boton("Editar", () => abrirAsignatura(fila)),

                    UI.boton(
                        fila.estado === "activa" ? "Desactivar" : "Activar",
                        () => cambiarEstado(fila),
                        fila.estado === "activa" ? "up-boton-peligro" : ""
                    )
                );

                return acciones;
            }
        }
    ]
});

function anunciar(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.className = "up-admin-aviso" + (esError ? " up-error" : "");
    mensaje.setAttribute("role", esError ? "alert" : "status");
    mensaje.hidden = false;
}

async function cargarDatos() {
    const estaCarga = ++numeroCarga;
    actualizar.disabled = true;

    try {
        const resultado = await API.consultar(`admin-asignaturas.php?carrera_id=${carreraId}`);

        if (estaCarga !== numeroCarga) {
            return false;
        }

        carrera = resultado.carrera;
        asignaturas = resultado.asignaturas;

        document.getElementById("migaCarrera").textContent = carrera.nombre;
        document.getElementById("tituloCarrera").textContent = `Asignaturas de ${carrera.nombre}`;
        document.getElementById("notaCarrera").textContent =
            `${carrera.universidad} · ${carrera.cuatrimestres} cuatrimestres`;

        tabla.actualizarDatos(asignaturas);

        return true;
    } catch (error) {
        if (estaCarga === numeroCarga) {
            anunciar(error.message, true);
        }

        return false;
    } finally {
        if (estaCarga === numeroCarga) {
            actualizar.disabled = false;
        }
    }
}

function abrirAsignatura(asignatura = null) {
    const contenido = UI.elemento("div", "up-campos");

    const opcionesPrerequisito = asignaturas
        .filter((fila) => fila.id !== asignatura?.id)
        .map((fila) => `
            <label class="up-opcion-linea">
                <input type="checkbox" name="prerequisitos" value="${fila.id}">
                ${fila.codigo} — ${fila.nombre}
            </label>
        `)
        .join("");

    contenido.innerHTML = `
        <label>
            Código
            <input class="up-campo" name="codigo" minlength="2" maxlength="20" required>
        </label>

        <label>
            Nombre de la asignatura
            <input class="up-campo" name="nombre" minlength="3" maxlength="150" required>
        </label>

        <label>
            Cuatrimestre sugerido
            <input class="up-campo" name="cuatrimestre_sugerido" type="number" min="1" max="${carrera.cuatrimestres}" required>
        </label>

        <label>
            Créditos
            <input class="up-campo" name="creditos" type="number" min="1" max="20" required>
        </label>

        <label>
            Horas de estudio semanales
            <input class="up-campo" name="horas_semanales" type="number" min="1" max="60" required>
        </label>

        <label>
            Costo (₡)
            <input class="up-campo" name="costo" type="number" min="0" step="1" required>
        </label>

        <label>
            Estado

            <select class="up-campo" name="estado">
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
            </select>
        </label>

        <fieldset class="up-opcion-grupo">
            <legend>Prerrequisitos</legend>
            ${opcionesPrerequisito || "<p class=\"up-nota\">No hay otras asignaturas en esta carrera todavía.</p>"}
        </fieldset>
    `;

    if (asignatura) {
        const campos = ["codigo", "nombre", "cuatrimestre_sugerido", "creditos", "horas_semanales", "costo", "estado"];

        for (const clave of campos) {
            contenido.querySelector(`[name="${clave}"]`).value = asignatura[clave];
        }

        asignatura.prerequisitos.forEach((idRequisito) => {
            const casilla = contenido.querySelector(`input[value="${idRequisito}"]`);
            if (casilla) {
                casilla.checked = true;
            }
        });
    }

    UI.abrirModal({
        titulo: asignatura ? "Editar asignatura" : "Agregar asignatura",
        contenido,

        async alGuardar(datos) {
            const campos = Object.fromEntries(datos.entries());
            delete campos.prerequisitos;

            const resultado = await API.guardar("admin-asignaturas.php", {
                ...campos,
                prerequisitos: datos.getAll("prerequisitos"),
                accion: "guardar",
                id: asignatura?.id ?? 0,
                carrera_id: carreraId
            });

            if (await cargarDatos()) {
                anunciar(resultado.mensaje);
            }
        }
    });
}

function cambiarEstado(asignatura) {
    const estado = asignatura.estado === "activa" ? "inactiva" : "activa";
    const verbo = estado === "activa" ? "Activar" : "Desactivar";

    const contenido = UI.elemento(
        "p",
        "",
        `¿${verbo} la asignatura ${asignatura.nombre}?`
    );

    UI.abrirModal({
        titulo: verbo + " asignatura",
        contenido,
        textoGuardar: verbo,

        async alGuardar() {
            const resultado = await API.guardar("admin-asignaturas.php", {
                accion: "estado",
                id: asignatura.id,
                carrera_id: carreraId,
                estado
            });

            if (await cargarDatos()) {
                anunciar(resultado.mensaje);
            }
        }
    });
}

function abrirImportarCsv() {
    const contenido = UI.elemento("div", "up-campos");

    contenido.innerHTML = `
        <p class="up-nota">
            El archivo debe tener encabezado con las columnas:
            <code>codigo, nombre, cuatrimestre_sugerido, creditos, horas_semanales, costo</code>.
            Si el código ya existe en esta carrera, se actualiza.
        </p>

        <label>
            Archivo CSV
            <input class="up-campo" type="file" name="archivo" accept=".csv,text/csv" required>
        </label>

        <div id="previsualizacionCsv"></div>
    `;

    const entradaArchivo = contenido.querySelector('[name="archivo"]');
    const previsualizacion = contenido.querySelector("#previsualizacionCsv");

    let filas = [];

    entradaArchivo.addEventListener("change", async () => {
        const archivo = entradaArchivo.files[0];
        filas = [];
        previsualizacion.textContent = "";

        if (!archivo) {
            return;
        }

        const texto = await archivo.text();
        filas = CSV.aObjetos(texto, COLUMNAS_PLAN_CSV);

        previsualizacion.innerHTML = filas.length
            ? `<p class="up-nota">${filas.length} filas leídas. Se van a importar al confirmar.</p>`
            : '<p class="up-nota up-error">No se encontraron filas válidas. Revisá el encabezado del archivo.</p>';
    });

    UI.abrirModal({
        titulo: "Importar plan de estudios (CSV)",
        contenido,
        textoGuardar: "Importar",

        async alGuardar() {
            if (filas.length === 0) {
                throw new Error("Seleccioná un archivo CSV con al menos una fila.");
            }

            const resultado = await API.guardar("admin-importar-plan.php", {
                carrera_id: carreraId,
                filas
            });

            await cargarDatos();

            const resumen = `Importación lista: ${resultado.insertadas} agregadas, ${resultado.actualizadas} actualizadas.`;

            if (resultado.errores.length === 0) {
                anunciar(resumen);
            } else {
                const detalle = resultado.errores
                    .map((item) => `Fila ${item.fila}: ${item.mensaje}`)
                    .join(" · ");

                anunciar(`${resumen} ${resultado.errores.length} con error — ${detalle}`, true);
            }
        }
    });
}

actualizar.addEventListener("click", cargarDatos);
nuevaAsignatura.addEventListener("click", () => abrirAsignatura());
importarCsv.addEventListener("click", abrirImportarCsv);

cerrarSesion.addEventListener("click", async () => {
    cerrarSesion.disabled = true;

    try {
        await API.salir();
    } catch (error) {
        anunciar(error.message, true);
        cerrarSesion.disabled = false;
    }
});

async function iniciarPagina() {
    if (!Number.isInteger(carreraId) || carreraId <= 0) {
        document.getElementById("textoAcceso").textContent = "Falta indicar qué carrera querés ver.";
        return;
    }

    try {
        const usuario = await API.iniciar();

        if (!usuario) {
            document.getElementById("textoAcceso").textContent =
                "Iniciá sesión con una cuenta administradora para gestionar asignaturas.";
            return;
        }

        document.getElementById("nombreAdmin").textContent = usuario.nombre;
        document.getElementById("avisoAcceso").hidden = true;
        document.getElementById("contenidoAdmin").hidden = false;
        cerrarSesion.disabled = false;

        await cargarDatos();
    } catch (error) {
        document.getElementById("textoAcceso").textContent = error.message;
    }
}

iniciarPagina();
