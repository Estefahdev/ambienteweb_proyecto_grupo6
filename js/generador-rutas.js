"use strict";

const SITUACION_URL = "api/situacion-personal.php";

// Escala de la barra de carga cuando no hay horas disponibles guardadas
const HORAS_REFERENCIA = 25;

// Hasta aquí una ruta se considera dentro de tus horas (el promedio redondea)
const CARGA_ALTA = 110;

const generarBoton = document.getElementById("generarBoton");
const rutasGrid = document.getElementById("rutasGrid");
const detalleSeccion = document.getElementById("detalleSeccion");

let condiciones = null;
let rutas = [];

/* ==========================================
   CONDICIONES ACTUALES
========================================== */

async function cargarCondiciones() {
    const aviso = document.getElementById("condicionesAviso");

    try {
        const respuesta = await fetch(SITUACION_URL);
        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }
        condiciones = (await respuesta.json()).situacion;
    } catch {
        aviso.textContent = "No pudimos cargar tu situación personal. Podés ver las rutas de ejemplo igual.";
        aviso.hidden = false;
        return;
    }

    if (!condiciones) {
        aviso.textContent = "Completá tu situación personal para generar rutas a tu medida.";
        aviso.hidden = false;
        generarBoton.disabled = true;
        return;
    }

    document.getElementById("condHoras").textContent = `${condiciones.horasDisponibles} h por semana`;
    document.getElementById("condPresupuesto").textContent = colones(condiciones.presupuesto);
    document.getElementById("condMaterias").textContent = `Hasta ${condiciones.maxMaterias}`;
    document.getElementById("condMeta").textContent = condiciones.fechaMeta
        ? etiquetaCuatrimestre(condiciones.fechaMeta)
        : "Sin fecha meta";
}

/* ==========================================
   TARJETAS DE RUTAS
========================================== */

function porcentajeCarga(ruta) {
    const referencia = condiciones?.horasDisponibles ?? HORAS_REFERENCIA;
    return Math.round((ruta.metricas.horasPromedio / referencia) * 100);
}

function htmlTarjeta(ruta) {
    const { metricas } = ruta;
    const etiqueta = ETIQUETAS_RUTA[ruta.tipo];
    const carga = porcentajeCarga(ruta);
    const guardada = leerEstadoRutas().guardadas.includes(ruta.id);

    return `
        <article class="ruta-card ${ruta.recomendadaIa ? "is-recomendada" : ""}">
            <span class="badge ${etiqueta.clase}">${etiqueta.texto}</span>
            <h3>${escaparHtml(ruta.nombre)}</h3>

            <dl class="ruta-metricas">
                <div><dt>Cuatrimestres</dt><dd>${metricas.cuatrimestres}</dd></div>
                <div><dt>Graduación</dt><dd>${finCuatrimestre(metricas.periodoGraduacion)}</dd></div>
                <div><dt>Horas por semana</dt><dd>${horas(metricas.horasPromedio)}</dd></div>
                <div><dt>Costo por cuatrimestre</dt><dd>${colones(metricas.costoPromedio)}</dd></div>
            </dl>

            <div class="carga">
                <p>Carga <strong>${carga} %</strong> de tus horas</p>
                <div class="carga-barra" aria-hidden="true">
                    <span class="${carga > CARGA_ALTA ? "is-alta" : ""}" style="width: ${Math.min(carga, 100)}%"></span>
                </div>
            </div>

            <p class="ruta-explicacion">${escaparHtml(ruta.explicacionIa)}</p>

            <div class="ruta-acciones">
                <button class="button-secondary" type="button" data-accion="detalle" data-id="${ruta.id}">Ver detalle</button>
                <button class="button-primary" type="button" data-accion="guardar" data-id="${ruta.id}" ${guardada ? "disabled" : ""}>
                    ${guardada ? "Guardada" : "Guardar ruta"}
                </button>
            </div>
        </article>`;
}

function mostrarDetalle(ruta) {
    document.getElementById("detalleTitulo").textContent = `Detalle de la ${ruta.nombre.toLowerCase()}`;
    document.getElementById("detalleResumen").textContent =
        `${ruta.metricas.cuatrimestres} cuatrimestres · Costo total ${colones(ruta.metricas.costoTotal)}`;
    document.getElementById("detallePeriodos").innerHTML = htmlDesglose(ruta);

    detalleSeccion.hidden = false;
    detalleSeccion.focus({ preventScroll: true });
    detalleSeccion.scrollIntoView({ behavior: "smooth", block: "start" });
}

function guardarRuta(id, boton) {
    const estado = leerEstadoRutas();

    if (!estado.guardadas.includes(id)) {
        estado.guardadas.push(id);
        estado.activa ??= id;
        guardarEstadoRutas(estado);
    }

    boton.disabled = true;
    boton.textContent = "Guardada";
}

/* ==========================================
   EVENTOS
========================================== */

generarBoton.addEventListener("click", async () => {
    const vacio = document.getElementById("rutasVacio");
    generarBoton.disabled = true;
    vacio.textContent = "Generando rutas…";

    try {
        rutas = await cargarRutas();
        rutasGrid.innerHTML = rutas.map(htmlTarjeta).join("");
        rutasGrid.hidden = false;
        document.getElementById("rutasNota").hidden = false;
        vacio.hidden = true;
        generarBoton.textContent = "Volver a generar";
    } catch {
        vacio.textContent = "No se pudieron generar las rutas. Intentá de nuevo.";
    } finally {
        generarBoton.disabled = false;
    }
});

rutasGrid.addEventListener("click", (event) => {
    const boton = event.target.closest("button[data-accion]");
    if (!boton) return;

    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === "detalle") {
        mostrarDetalle(rutas.find((ruta) => ruta.id === id));
    } else {
        guardarRuta(id, boton);
    }
});

inicializarMenu();
cargarCondiciones();