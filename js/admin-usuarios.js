"use strict";

const UI = window.UniPathUI;
const API = window.AdminAPI;
const CSV = window.AdminCSV;

const filtroRol = document.getElementById("filtroRol");
const filtroEstado = document.getElementById("filtroEstado");
const nuevoAdmin = document.getElementById("nuevoAdmin");
const importarCsv = document.getElementById("importarCsv");
const actualizar = document.getElementById("actualizar");
const cerrarSesion = document.getElementById("cerrarSesion");
const mensaje = document.getElementById("mensajeUsuarios");

let usuarios = [];
let numeroCarga = 0;

const COLUMNAS_ESTUDIANTES_CSV = ["carne", "nombre", "correo_institucional", "carrera_codigo"];

const tabla = UI.crearTabla({
    contenedor: document.getElementById("tablaUsuarios"),
    titulo: "Usuarios registrados",
    porPagina: 10,

    columnas: [
        { clave: "nombre", titulo: "Nombre" },
        { clave: "carne", titulo: "Carné" },
        { clave: "correo_institucional", titulo: "Correo" },
        { clave: "carrera", titulo: "Carrera" },

        {
            clave: "rol",
            titulo: "Rol",
            renderizar: (fila) => fila.rol === "administrador" ? "Administrador" : "Estudiante"
        },

        {
            clave: "estado",
            titulo: "Estado",
            renderizar: (fila) => UI.elemento("span", "up-etiqueta up-etiqueta-" + fila.estado, fila.estado)
        },

        {
            titulo: "Acciones",
            renderizar(fila) {
                if (fila.estado === "pendiente") {
                    return UI.elemento("span", "up-nota", "Pendiente de activar su cuenta");
                }

                const acciones = UI.elemento("div", "up-acciones");

                acciones.append(
                    UI.boton(
                        fila.estado === "activo" ? "Inactivar" : "Activar",
                        () => cambiarEstado(fila),
                        fila.estado === "activo" ? "up-boton-peligro" : ""
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

function filtrar() {
    const seleccion = usuarios.filter((fila) =>
        (!filtroRol.value || fila.rol === filtroRol.value) &&
        (!filtroEstado.value || fila.estado === filtroEstado.value)
    );

    tabla.actualizarDatos(seleccion);
}

async function cargarDatos() {
    const estaCarga = ++numeroCarga;
    actualizar.disabled = true;

    anunciar("Cargando usuarios...");

    try {
        const resultado = await API.consultar("admin-usuarios.php");

        if (estaCarga !== numeroCarga) {
            return false;
        }

        usuarios = resultado.usuarios;

        document.getElementById("totalUsuarios").textContent = usuarios.length;

        document.getElementById("totalEstudiantes").textContent =
            usuarios.filter((fila) => fila.rol === "estudiante").length;

        document.getElementById("totalAdmins").textContent =
            usuarios.filter((fila) => fila.rol === "administrador").length;

        filtrar();
        mensaje.hidden = true;

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

function abrirNuevoAdmin() {
    const contenido = UI.elemento("div", "up-campos");

    contenido.innerHTML = `
        <label>
            Nombre completo
            <input class="up-campo" name="nombre" minlength="3" maxlength="150" required>
        </label>

        <label>
            Correo institucional
            <input class="up-campo" name="correo_institucional" type="email" maxlength="150" required>
        </label>

        <label>
            Contraseña inicial
            <input class="up-campo" name="contrasena" type="password" minlength="8" maxlength="1024" required>
        </label>
    `;

    UI.abrirModal({
        titulo: "Agregar administrador",
        contenido,
        textoGuardar: "Agregar",

        async alGuardar(datos) {
            const resultado = await API.guardar("admin-usuarios.php", {
                ...Object.fromEntries(datos.entries()),
                accion: "agregar_admin"
            });

            if (await cargarDatos()) {
                anunciar(resultado.mensaje);
            }
        }
    });
}

function cambiarEstado(usuario) {
    const estado = usuario.estado === "activo" ? "inactivo" : "activo";
    const verbo = estado === "activo" ? "Activar" : "Inactivar";

    const contenido = UI.elemento("p", "", `¿${verbo} a ${usuario.nombre}?`);

    UI.abrirModal({
        titulo: verbo + " usuario",
        contenido,
        textoGuardar: verbo,

        async alGuardar() {
            const resultado = await API.guardar("admin-usuarios.php", {
                accion: "estado",
                id: usuario.id,
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
            <code>carne, nombre, correo_institucional, carrera_codigo</code>.
            Los estudiantes quedan con estado "pendiente" hasta que activen su cuenta.
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
        filas = CSV.aObjetos(texto, COLUMNAS_ESTUDIANTES_CSV);

        previsualizacion.innerHTML = filas.length
            ? `<p class="up-nota">${filas.length} filas leídas. Se van a importar al confirmar.</p>`
            : '<p class="up-nota up-error">No se encontraron filas válidas. Revisá el encabezado del archivo.</p>';
    });

    UI.abrirModal({
        titulo: "Importar estudiantes (CSV)",
        contenido,
        textoGuardar: "Importar",

        async alGuardar() {
            if (filas.length === 0) {
                throw new Error("Seleccioná un archivo CSV con al menos una fila.");
            }

            const resultado = await API.guardar("admin-importar-estudiantes.php", { filas });

            await cargarDatos();

            const resumen = `Importación lista: ${resultado.insertados} estudiantes agregados.`;

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

filtroRol.addEventListener("change", filtrar);
filtroEstado.addEventListener("change", filtrar);
nuevoAdmin.addEventListener("click", abrirNuevoAdmin);
importarCsv.addEventListener("click", abrirImportarCsv);
actualizar.addEventListener("click", cargarDatos);

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
    try {
        const usuario = await API.iniciar();

        if (!usuario) {
            document.getElementById("textoAcceso").textContent =
                "Iniciá sesión con una cuenta administradora para gestionar usuarios.";
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
