"use strict";

const API_URL = "api/situacion-personal.php";

// Errores del servidor → id del mensaje junto a cada campo
const ERRORES_SERVIDOR = {
    tipoTrabajo: ["trabajoError", null],
    horasDisponibles: ["horasError", "horasDisponibles"],
    presupuesto: ["presupuestoError", "presupuesto"],
    maxMaterias: ["maxMateriasError", "maxMaterias"],
    fechaMeta: ["fechaMetaError", "fechaMeta"]
};

const DIAS = [
    { id: "lun", nombre: "Lunes" },
    { id: "mar", nombre: "Martes" },
    { id: "mie", nombre: "Miércoles" },
    { id: "jue", nombre: "Jueves" },
    { id: "vie", nombre: "Viernes" },
    { id: "sab", nombre: "Sábado" }
];

const BLOQUES = [
    { id: "manana", nombre: "Mañana", horario: "8:00 a 12:00" },
    { id: "tarde", nombre: "Tarde", horario: "13:00 a 17:00" },
    { id: "noche", nombre: "Noche", horario: "18:00 a 22:00" }
];

const TRABAJO_TEXTO = {
    no: "No trabaja",
    medio_tiempo: "Medio tiempo",
    tiempo_completo: "Tiempo completo"
};

// Regla de UniPath para avisar de sobrecarga
const HORAS_MINIMAS_POR_MATERIA = 3;

const form = document.getElementById("situacionForm");
const scheduleBody = document.getElementById("scheduleBody");
const fechaMetaSelect = document.getElementById("fechaMeta");
const saveStatus = document.getElementById("saveStatus");

const colones = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 });

/* ==========================================
   MENÚ EN TELÉFONOS
========================================== */

const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");

menuButton.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Abrir menú");
    }
});

/* ==========================================
   CONSTRUCCIÓN DE LA CUADRÍCULA Y LAS METAS
========================================== */

function crearCuadricula() {
    BLOQUES.forEach((bloque) => {
        const fila = document.createElement("tr");

        const encabezado = document.createElement("th");
        encabezado.scope = "row";
        encabezado.innerHTML = `<strong>${bloque.nombre}</strong><span>${bloque.horario}</span>`;
        fila.appendChild(encabezado);

        DIAS.forEach((dia) => {
            const celda = document.createElement("td");
            celda.innerHTML = `
                <label class="slot">
                    <input type="checkbox" name="horario" value="${dia.id}-${bloque.id}"
                        aria-label="${dia.nombre}, ${bloque.nombre.toLowerCase()}">
                    <span class="slot-text"></span>
                </label>`;
            fila.appendChild(celda);
        });

        scheduleBody.appendChild(fila);
    });
}

// Cuatrimestres: I (ene-abr), II (may-ago), III (sep-dic)
function cuatrimestreActual(fecha = new Date()) {
    return { anio: fecha.getFullYear(), numero: Math.floor(fecha.getMonth() / 4) + 1 };
}

function crearOpcionesMeta() {
    const romanos = ["I", "II", "III"];
    const meses = ["enero a abril", "mayo a agosto", "setiembre a diciembre"];
    let { anio, numero } = cuatrimestreActual();

    // Solo cuatrimestres futuros, cinco años hacia adelante
    for (let i = 0; i < 15; i++) {
        numero++;
        if (numero > 3) {
            numero = 1;
            anio++;
        }

        const opcion = document.createElement("option");
        opcion.value = `${anio}-${numero}`;
        opcion.textContent = `${romanos[numero - 1]} cuatrimestre ${anio} (${meses[numero - 1]})`;
        fechaMetaSelect.appendChild(opcion);
    }
}

/* ==========================================
   LEER Y CARGAR LOS DATOS
========================================== */

function leerFormulario() {
    const datos = new FormData(form);

    return {
        tipoTrabajo: datos.get("tipoTrabajo"),
        horarioLaboral: datos.getAll("horario").map((valor) => {
            const [dia, bloque] = valor.split("-");
            return { dia, bloque };
        }),
        horasDisponibles: datos.get("horasDisponibles").trim(),
        presupuesto: datos.get("presupuesto").trim(),
        maxMaterias: datos.get("maxMaterias"),
        fechaMeta: datos.get("fechaMeta")
    };
}

async function cargarGuardado() {
    let guardado = null;

    try {
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }
        guardado = (await respuesta.json()).situacion;
    } catch {
        saveStatus.textContent = "No se pudieron cargar tus datos guardados.";
        return;
    }

    if (!guardado) {
        return;
    }

    const radio = form.querySelector(`input[name="tipoTrabajo"][value="${guardado.tipoTrabajo}"]`);
    if (radio) {
        radio.checked = true;
    }

    guardado.horarioLaboral.forEach(({ dia, bloque }) => {
        const casilla = form.querySelector(`input[name="horario"][value="${dia}-${bloque}"]`);
        if (casilla) {
            casilla.checked = true;
        }
    });

    form.horasDisponibles.value = guardado.horasDisponibles;
    form.presupuesto.value = guardado.presupuesto;
    form.maxMaterias.value = String(guardado.maxMaterias);
    form.fechaMeta.value = guardado.fechaMeta ?? "";

    if (guardado.actualizado) {
        saveStatus.textContent = `Guardado el ${formatearFecha(guardado.actualizado)}`;
    }
}

function formatearFecha(iso) {
    return new Date(iso).toLocaleString("es-CR", {
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit"
    });
}

/* ==========================================
   RESUMEN LATERAL
========================================== */

function actualizarResumen() {
    const datos = leerFormulario();
    const horas = Number(datos.horasDisponibles);
    const materias = Number(datos.maxMaterias);
    const totalBloques = DIAS.length * BLOQUES.length;

    // Texto de cada bloque de la cuadrícula
    form.querySelectorAll(".slot").forEach((slot) => {
        const marcado = slot.querySelector("input").checked;
        slot.querySelector(".slot-text").textContent = marcado ? "Trabajo" : "";
    });

    const bloques = datos.horarioLaboral.length;
    document.getElementById("horarioResumen").textContent = bloques === 0
        ? "Ningún bloque marcado."
        : `${bloques} ${bloques === 1 ? "bloque marcado" : "bloques marcados"}, unas ${bloques * 4} horas de trabajo por semana.`;

    document.getElementById("resTrabajo").textContent = TRABAJO_TEXTO[datos.tipoTrabajo] ?? "—";
    document.getElementById("resBloques").textContent = `${bloques} de ${totalBloques}`;
    document.getElementById("resHoras").textContent = horas > 0 ? `${horas} h por semana` : "—";
    document.getElementById("resPresupuesto").textContent =
        Number(datos.presupuesto) > 0 ? `₡${colones.format(Number(datos.presupuesto))}` : "—";
    document.getElementById("resMaterias").textContent =
        materias > 0 ? `Hasta ${materias}` : "—";
    document.getElementById("resMeta").textContent = datos.fechaMeta
        ? fechaMetaSelect.selectedOptions[0].textContent.replace(/ \(.*\)$/, "")
        : "Sin fecha meta";

    // Aviso cuando las horas no alcanzan para las materias elegidas
    const hallazgo = document.getElementById("resHallazgo");
    if (horas > 0 && materias > 0) {
        const porMateria = horas / materias;
        const redondeado = porMateria.toLocaleString("es-CR", { maximumFractionDigits: 1 });
        const alcanza = porMateria >= HORAS_MINIMAS_POR_MATERIA;

        hallazgo.textContent = alcanza
            ? `Te quedan ${redondeado} h de estudio por materia cada semana.`
            : `Solo ${redondeado} h por materia. Recomendamos al menos ${HORAS_MINIMAS_POR_MATERIA}; probá con menos materias o más horas.`;
        hallazgo.classList.toggle("is-warning", !alcanza);
        hallazgo.hidden = false;
    } else {
        hallazgo.hidden = true;
    }
}

/* ==========================================
   VALIDACIÓN
========================================== */

function mostrarError(idError, campo, mensaje) {
    const error = document.getElementById(idError);
    error.textContent = mensaje;
    error.hidden = !mensaje;

    if (campo) {
        campo.setAttribute("aria-invalid", mensaje ? "true" : "false");
    }
}

function validar(datos) {
    const errores = [];
    const horas = Number(datos.horasDisponibles);
    const presupuesto = Number(datos.presupuesto);

    // Tipo de trabajo
    let mensaje = "";
    if (!datos.tipoTrabajo) {
        mensaje = "Elegí una opción.";
    } else if (datos.tipoTrabajo !== "no" && datos.horarioLaboral.length === 0) {
        mensaje = "Marcá en el horario los bloques en los que trabajás.";
    }
    mostrarError("trabajoError", null, mensaje);
    if (mensaje) errores.push(form.querySelector('input[name="tipoTrabajo"]'));

    // Horas disponibles
    mensaje = "";
    if (datos.horasDisponibles === "") {
        mensaje = "Ingresá tus horas de estudio por semana.";
    } else if (!Number.isInteger(horas) || horas < 1 || horas > 60) {
        mensaje = "Usá un número entero entre 1 y 60.";
    }
    mostrarError("horasError", form.horasDisponibles, mensaje);
    if (mensaje) errores.push(form.horasDisponibles);

    // Presupuesto
    mensaje = "";
    if (datos.presupuesto === "") {
        mensaje = "Ingresá tu presupuesto por cuatrimestre.";
    } else if (!Number.isFinite(presupuesto) || presupuesto <= 0) {
        mensaje = "El presupuesto tiene que ser mayor que cero.";
    }
    mostrarError("presupuestoError", form.presupuesto, mensaje);
    if (mensaje) errores.push(form.presupuesto);

    // Máximo de materias
    mensaje = datos.maxMaterias ? "" : "Elegí cuántas materias como máximo.";
    mostrarError("maxMateriasError", form.maxMaterias, mensaje);
    if (mensaje) errores.push(form.maxMaterias);

    // Fecha meta: opcional, pero tiene que ser futura
    mensaje = "";
    if (datos.fechaMeta) {
        const [anio, numero] = datos.fechaMeta.split("-").map(Number);
        const actual = cuatrimestreActual();
        if (anio * 10 + numero <= actual.anio * 10 + actual.numero) {
            mensaje = "Elegí un cuatrimestre futuro.";
        }
    }
    mostrarError("fechaMetaError", form.fechaMeta, mensaje);
    if (mensaje) errores.push(form.fechaMeta);

    return errores;
}

/* ==========================================
   EVENTOS
========================================== */

form.addEventListener("input", actualizarResumen);
form.addEventListener("change", actualizarResumen);

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const datos = leerFormulario();
    const errores = validar(datos);

    if (errores.length > 0) {
        saveStatus.textContent = "Revisá los campos marcados.";
        errores[0].focus();
        return;
    }

    const situacion = {
        ...datos,
        horasDisponibles: Number(datos.horasDisponibles),
        presupuesto: Number(datos.presupuesto),
        maxMaterias: Number(datos.maxMaterias),
        fechaMeta: datos.fechaMeta || null
    };

    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    saveStatus.textContent = "Guardando…";

    try {
        const respuesta = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(situacion)
        });
        const resultado = await respuesta.json();

        if (respuesta.status === 422) {
            mostrarErroresServidor(resultado.errores);
            return;
        }
        if (!respuesta.ok) {
            throw new Error(resultado.error);
        }

        saveStatus.textContent = `Guardado el ${formatearFecha(resultado.situacion.actualizado)}`;
    } catch {
        saveStatus.textContent = "No se pudo guardar. Revisá tu conexión e intentá de nuevo.";
    } finally {
        boton.disabled = false;
    }
});

function mostrarErroresServidor(errores) {
    let primerCampo = null;

    Object.entries(errores).forEach(([clave, mensaje]) => {
        const [idError, nombreCampo] = ERRORES_SERVIDOR[clave] ?? [];
        if (!idError) return;

        const campo = nombreCampo ? form[nombreCampo] : null;
        mostrarError(idError, campo, mensaje);
        primerCampo ??= campo ?? form.querySelector('input[name="tipoTrabajo"]');
    });

    saveStatus.textContent = "Revisá los campos marcados.";
    primerCampo?.focus();
}

crearCuadricula();
crearOpcionesMeta();
actualizarResumen();
cargarGuardado().then(actualizarResumen);