"use strict";

const UI = window.UniPathUI;

let carreras = [
    {
        id: 1,
        codigo: "ISC",
        nombre: "Ingeniería en Sistemas",
        cuatrimestres: 10,
        estado: "activa"
    },
    {
        id: 2,
        codigo: "IND",
        nombre: "Ingeniería Industrial",
        cuatrimestres: 10,
        estado: "activa"
    },
    {
        id: 3,
        codigo: "ADM",
        nombre: "Administración de Empresas",
        cuatrimestres: 9,
        estado: "activa"
    },
    {
        id: 4,
        codigo: "DER",
        nombre: "Derecho",
        cuatrimestres: 12,
        estado: "activa"
    },
    {
        id: 5,
        codigo: "CON",
        nombre: "Contaduría",
        cuatrimestres: 9,
        estado: "inactiva"
    },
    {
        id: 6,
        codigo: "ELE",
        nombre: "Ingeniería Eléctrica",
        cuatrimestres: 10,
        estado: "activa"
    },
    {
        id: 7,
        codigo: "CIV",
        nombre: "Ingeniería Civil",
        cuatrimestres: 11,
        estado: "activa"
    }
];

const tabla = UI.crearTabla({
    contenedor: document.getElementById("tablaPrueba"),
    titulo: "Carreras de prueba",
    datos: carreras,
    porPagina: 5,

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
            clave: "cuatrimestres",
            titulo: "Cuatrimestres"
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
                        "Eliminar",
                        () => eliminarCarrera(fila),
                        "up-boton-peligro"
                    )
                );

                return acciones;
            }
        }
    ]
});

function abrirCarrera(carrera = null) {
    const contenido = UI.elemento(
        "div",
        "up-campos"
    );

    contenido.innerHTML = `
        <label>
            Código

            <input
                class="up-campo"
                name="codigo"
                required
                maxlength="20"
            >
        </label>

        <label>
            Nombre

            <input
                class="up-campo"
                name="nombre"
                required
                minlength="3"
                maxlength="150"
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

    if (carrera) {
        const campos = [
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

        alGuardar(datos) {
            const codigo = String(
                datos.get("codigo")
            ).trim().toUpperCase();

            const nombre = String(
                datos.get("nombre")
            ).trim();

            if (!codigo || nombre.length < 3) {
                throw new Error(
                    "Indicá un código y un nombre de al menos 3 caracteres."
                );
            }

            const duplicado = carreras.some(
                (fila) =>
                    fila.codigo === codigo &&
                    fila.id !== carrera?.id
            );

            if (duplicado) {
                throw new Error(
                    "Ya existe una carrera con ese código."
                );
            }

            const nuevoId = Math.max(
                0,
                ...carreras.map((fila) => fila.id)
            ) + 1;

            const registro = {
                id: carrera?.id ?? nuevoId,
                codigo,
                nombre,

                cuatrimestres: Number(
                    datos.get("cuatrimestres")
                ),

                estado: String(
                    datos.get("estado")
                )
            };

            carreras = carrera
                ? carreras.map((fila) =>
                    fila.id === carrera.id
                        ? registro
                        : fila
                )
                : [...carreras, registro];

            tabla.actualizarDatos(carreras);
        }
    });
}

function eliminarCarrera(carrera) {
    const contenido = UI.elemento(
        "p",
        "",
        `¿Eliminar ${carrera.nombre} de esta prueba?`
    );

    UI.abrirModal({
        titulo: "Eliminar carrera de prueba",
        contenido,
        textoGuardar: "Eliminar",

        alGuardar() {
            carreras = carreras.filter(
                (fila) => fila.id !== carrera.id
            );

            tabla.actualizarDatos(carreras);
        }
    });
}

document.getElementById("agregar").addEventListener(
    "click",
    () => abrirCarrera()
);