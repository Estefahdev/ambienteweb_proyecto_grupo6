"use strict";

const UI = window.UniPathUI;
const API = window.AdminAPI;

const filtroUniversidad = document.getElementById(
    "filtroUniversidad"
);

const filtroEstado = document.getElementById(
    "filtroEstado"
);

const nuevaCarrera = document.getElementById(
    "nuevaCarrera"
);

const actualizar = document.getElementById(
    "actualizar"
);

const cerrarSesion = document.getElementById(
    "cerrarSesion"
);

const mensaje = document.getElementById(
    "mensajeCarreras"
);

let carreras = [];
let universidades = [];
let numeroCarga = 0;

const tabla = UI.crearTabla({
    contenedor: document.getElementById(
        "tablaCarreras"
    ),

    titulo: "Carreras registradas",
    porPagina: 8,

    columnas: [
        {
            clave: "codigo",
            titulo: "Código"
        },
        {
            clave: "nombre",
            titulo: "Carrera"
        },
        {
            clave: "universidad",
            titulo: "Universidad"
        },
        {
            clave: "cuatrimestres",
            titulo: "Cuatrimestres"
        },
        {
            clave: "total_asignaturas",
            titulo: "Asignaturas"
        },
        {
            clave: "total_estudiantes",
            titulo: "Estudiantes"
        },
        {
            clave: "estado",
            titulo: "Estado",

            renderizar(fila) {
                return UI.elemento(
                    "span",
                    "up-etiqueta up-etiqueta-" + fila.estado,
                    fila.estado
                );
            }
        },
        {
            titulo: "Acciones",

            renderizar(fila) {
                const acciones = UI.elemento(
                    "div",
                    "up-acciones"
                );

                acciones.append(
                    UI.boton(
                        "Editar",
                        () => abrirCarrera(fila)
                    ),

                    UI.boton(
                        fila.estado === "activa"
                            ? "Desactivar"
                            : "Activar",

                        () => cambiarEstado(fila),

                        fila.estado === "activa"
                            ? "up-boton-peligro"
                            : ""
                    )
                );

                return acciones;
            }
        }
    ]
});

function anunciar(texto, esError = false) {
    mensaje.textContent = texto;

    mensaje.className = "up-admin-aviso" +
        (esError ? " up-error" : "");

    mensaje.setAttribute(
        "role",
        esError ? "alert" : "status"
    );

    mensaje.hidden = false;
}

function filtrar() {
    const seleccion = carreras.filter((fila) =>
        (
            !filtroUniversidad.value ||
            String(fila.universidad_id) ===
                filtroUniversidad.value
        ) &&
        (
            !filtroEstado.value ||
            fila.estado === filtroEstado.value
        )
    );

    tabla.actualizarDatos(seleccion);
}

async function cargarDatos() {
    const estaCarga = ++numeroCarga;

    actualizar.disabled = true;
    nuevaCarrera.disabled = true;

    anunciar("Cargando carreras...");

    try {
        const resultado = await API.consultar(
            "admin-carreras.php"
        );

        if (estaCarga !== numeroCarga) {
            return false;
        }

        carreras = resultado.carreras;
        universidades = resultado.universidades;

        const seleccionAnterior =
            filtroUniversidad.value;

        filtroUniversidad.replaceChildren(
            new Option("Todas las universidades", "")
        );

        universidades.forEach((fila) => {
            filtroUniversidad.add(
                new Option(
                    fila.nombre,
                    String(fila.id)
                )
            );
        });

        const sigueDisponible = universidades.some(
            (fila) =>
                String(fila.id) === seleccionAnterior
        );

        if (sigueDisponible) {
            filtroUniversidad.value =
                seleccionAnterior;
        }

        document.getElementById(
            "totalCarreras"
        ).textContent = carreras.length;

        document.getElementById(
            "totalActivas"
        ).textContent = carreras.filter(
            (fila) => fila.estado === "activa"
        ).length;

        document.getElementById(
            "totalInactivas"
        ).textContent = carreras.filter(
            (fila) => fila.estado === "inactiva"
        ).length;

        filtrar();

        mensaje.hidden = true;

        nuevaCarrera.disabled =
            universidades.length === 0;

        if (!universidades.length) {
            anunciar(
                "No hay universidades disponibles para registrar carreras.",
                true
            );
        }

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

function abrirCarrera(carrera = null) {
    const contenido = UI.elemento(
        "div",
        "up-campos"
    );

    contenido.innerHTML = `
        <label>
            Universidad

            <select
                class="up-campo"
                name="universidad_id"
                required
            ></select>
        </label>

        <label>
            Código

            <input
                class="up-campo"
                name="codigo"
                minlength="2"
                maxlength="20"
                required
            >
        </label>

        <label>
            Nombre de la carrera

            <input
                class="up-campo"
                name="nombre"
                minlength="3"
                maxlength="150"
                required
            >
        </label>

        <label>
            Cuatrimestres

            <input
                class="up-campo"
                name="cuatrimestres"
                type="number"
                min="1"
                max="30"
                step="1"
                value="10"
                required
            >
        </label>

        <label>
            Estado

            <select
                class="up-campo"
                name="estado"
            >
                <option value="activa">
                    Activa
                </option>

                <option value="inactiva">
                    Inactiva
                </option>
            </select>
        </label>
    `;

    const selector = contenido.querySelector(
        '[name="universidad_id"]'
    );

    universidades.forEach((fila) => {
        selector.add(
            new Option(
                fila.nombre,
                String(fila.id)
            )
        );
    });

    if (carrera) {
        const campos = [
            "universidad_id",
            "codigo",
            "nombre",
            "cuatrimestres",
            "estado"
        ];

        for (const clave of campos) {
            contenido.querySelector(
                `[name="${clave}"]`
            ).value = carrera[clave];
        }
    }

    UI.abrirModal({
        titulo: carrera
            ? "Editar carrera"
            : "Agregar carrera",

        contenido,

        async alGuardar(datos) {
            const resultado = await API.guardar(
                "admin-carreras.php",

                {
                    ...Object.fromEntries(
                        datos.entries()
                    ),

                    accion: "guardar",
                    id: carrera?.id ?? 0
                }
            );

            if (await cargarDatos()) {
                anunciar(resultado.mensaje);
            }
        }
    });
}

function cambiarEstado(carrera) {
    const estado = carrera.estado === "activa"
        ? "inactiva"
        : "activa";

    const verbo = estado === "activa"
        ? "Activar"
        : "Desactivar";

    const contenido = UI.elemento(
        "p",
        "",
        `¿${verbo} la carrera ${carrera.nombre}? Se conservarán sus asignaturas y estudiantes.`
    );

    UI.abrirModal({
        titulo: verbo + " carrera",
        contenido,
        textoGuardar: verbo,

        async alGuardar() {
            const resultado = await API.guardar(
                "admin-carreras.php",

                {
                    accion: "estado",
                    id: carrera.id,
                    estado
                }
            );

            if (await cargarDatos()) {
                anunciar(resultado.mensaje);
            }
        }
    });
}

filtroUniversidad.addEventListener(
    "change",
    filtrar
);

filtroEstado.addEventListener(
    "change",
    filtrar
);

nuevaCarrera.addEventListener(
    "click",
    () => abrirCarrera()
);

actualizar.addEventListener(
    "click",
    cargarDatos
);

cerrarSesion.addEventListener(
    "click",
    async () => {
        cerrarSesion.disabled = true;

        try {
            await API.salir();

        } catch (error) {
            anunciar(error.message, true);
            cerrarSesion.disabled = false;
        }
    }
);

async function iniciarPagina() {
    try {
        const usuario = await API.iniciar();

        if (!usuario) {
            document.getElementById(
                "textoAcceso"
            ).textContent =
                "Iniciá sesión con una cuenta administradora para gestionar carreras.";

            return;
        }

        document.getElementById(
            "nombreAdmin"
        ).textContent = usuario.nombre;

        document.getElementById(
            "avisoAcceso"
        ).hidden = true;

        document.getElementById(
            "contenidoAdmin"
        ).hidden = false;

        cerrarSesion.disabled = false;

        await cargarDatos();

    } catch (error) {
        document.getElementById(
            "textoAcceso"
        ).textContent = error.message;
    }
}

iniciarPagina();