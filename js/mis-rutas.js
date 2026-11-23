"use strict";

const MAX_COMPARAR = 2;
const RUTAS_URL = "api/rutas.php";

const rutasLista = document.getElementById("rutasLista");
const comparativa = document.getElementById("comparativa");
const confirmarDialogo = document.getElementById("confirmarDialogo");
const activarBoton = document.getElementById("activarBoton");

let rutas = [];
let comparando = [];
let seleccionadaId = null;

// Todas las rutas que trae la API ya están guardadas; no hace falta filtrar
function rutasGuardadas() {
    return rutas;
}

function rutaSeleccionada() {
    return rutas.find((ruta) => ruta.id === seleccionadaId);
}

/* ==========================================
   LISTA
========================================== */

function htmlFilaLista(ruta) {
    const { metricas } = ruta;
    const activa = ruta.activa;
    const marcada = comparando.includes(ruta.id);
    const bloqueada = !marcada && comparando.length >= MAX_COMPARAR;

    return `
        <li class="ruta-fila ${ruta.id === seleccionadaId ? "is-seleccionada" : ""}">
            <input type="checkbox" data-id="${ruta.id}"
                aria-label="Comparar ${escaparHtml(ruta.nombre)}"
                ${marcada ? "checked" : ""} ${bloqueada ? "disabled" : ""}>
            <button class="ruta-fila-boton" type="button" data-id="${ruta.id}">
                <span class="ruta-fila-titulo">
                    ${escaparHtml(ruta.nombre)}
                    ${activa ? '<span class="badge badge-teal">Activa</span>' : ""}
                </span>
                <span class="ruta-fila-datos">
                    ${metricas.cuatrimestres} cuatrimestres · ${horas(metricas.horasPromedio)} · ${finCuatrimestre(metricas.periodoGraduacion)}
                </span>
            </button>
        </li>`;
}

/* ==========================================
   COMPARATIVA
========================================== */

const FILAS_COMPARATIVA = [
    { titulo: "Cuatrimestres", valor: (m) => m.cuatrimestres, texto: (m) => String(m.cuatrimestres) },
    {
        titulo: "Fecha de graduación",
        // "2027-3" → 20273: número que se ordena igual que el tiempo
        valor: (m) => Number(m.periodoGraduacion.replace("-", "")),
        texto: (m) => finCuatrimestre(m.periodoGraduacion)
    },
    { titulo: "Horas promedio", valor: (m) => m.horasPromedio, texto: (m) => horas(m.horasPromedio) },
    { titulo: "Costo total", valor: (m) => m.costoTotal, texto: (m) => colones(m.costoTotal) },
    {
        titulo: "Materias por cuatrimestre",
        valor: (m) => m.materiasMax,
        texto: (m) => (m.materiasMin === m.materiasMax ? String(m.materiasMax) : `${m.materiasMin} a ${m.materiasMax}`)
    }
];

function htmlComparativa(a, b) {
    const filas = FILAS_COMPARATIVA.map((fila) => {
        const valorA = fila.valor(a.metricas);
        const valorB = fila.valor(b.metricas);
        // En todas las filas gana el valor menor; si empatan no se resalta ninguno
        const claseA = valorA < valorB ? "mejor" : "";
        const claseB = valorB < valorA ? "mejor" : "";

        return `
            <tr>
                <th scope="row">${fila.titulo}</th>
                <td><span class="${claseA}">${fila.texto(a.metricas)}</span></td>
                <td><span class="${claseB}">${fila.texto(b.metricas)}</span></td>
            </tr>`;
    }).join("");

    return `
        <table class="comparativa">
            <thead>
                <tr>
                    <th scope="col"><span class="sr-only">Métrica</span></th>
                    <th scope="col">${escaparHtml(a.nombre)}</th>
                    <th scope="col">${escaparHtml(b.nombre)}</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>`;
}

/* ==========================================
   PINTAR LA PANTALLA
========================================== */

function pintar() {
    const guardadas = rutasGuardadas();
    const hayRutas = guardadas.length > 0;

    document.getElementById("misRutasVacio").hidden = hayRutas;
    document.getElementById("misRutasContenido").hidden = !hayRutas;
    if (!hayRutas) return;

    rutasLista.innerHTML = guardadas.map(htmlFilaLista).join("");

    const aviso = document.getElementById("comparativaAviso");
    if (comparando.length === MAX_COMPARAR) {
        const [a, b] = comparando.map((id) => rutas.find((ruta) => ruta.id === id));
        comparativa.innerHTML = htmlComparativa(a, b);
        aviso.textContent = "El mejor valor de cada fila aparece resaltado.";
    } else {
        comparativa.innerHTML = "";
        aviso.textContent = "Marcá 2 rutas en la lista para compararlas.";
    }

    const ruta = rutaSeleccionada();
    document.getElementById("desgloseTitulo").textContent = `Desglose de la ${ruta.nombre.toLowerCase()}`;
    document.getElementById("desgloseResumen").textContent =
        `${ruta.metricas.cuatrimestres} cuatrimestres · Costo total ${colones(ruta.metricas.costoTotal)}`;
    document.getElementById("desglosePeriodos").innerHTML = htmlDesglose(ruta);

    activarBoton.disabled = ruta.activa;
    activarBoton.textContent = ruta.activa ? "Ruta activa" : "Marcar como activa";
}

/* ==========================================
   EVENTOS
========================================== */

rutasLista.addEventListener("change", (event) => {
    const id = Number(event.target.dataset.id);

    comparando = event.target.checked
        ? [...comparando, id]
        : comparando.filter((otra) => otra !== id);

    pintar();
    rutasLista.querySelector(`input[data-id="${id}"]`).focus();
});

rutasLista.addEventListener("click", (event) => {
    const boton = event.target.closest(".ruta-fila-boton");
    if (!boton) return;

    seleccionadaId = Number(boton.dataset.id);
    pintar();
    rutasLista.querySelector(`.ruta-fila-boton[data-id="${seleccionadaId}"]`).focus();
});

activarBoton.addEventListener("click", async () => {
    activarBoton.disabled = true;

    try {
        const respuesta = await pedirJson(RUTAS_URL, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: seleccionadaId, accion: "activar" }),
        });
        rutas = respuesta.rutas;
    } catch {
        // Si falla, pintar() vuelve a mostrar el botón habilitado con el estado anterior
    }
    pintar();
});

document.getElementById("eliminarBoton").addEventListener("click", () => {
    document.getElementById("confirmarTexto").textContent =
        `La ${rutaSeleccionada().nombre.toLowerCase()} va a salir de tus rutas guardadas.`;
    confirmarDialogo.showModal();
});

confirmarDialogo.addEventListener("close", async () => {
    if (confirmarDialogo.returnValue !== "eliminar") return;

    try {
        await pedirJson(`${RUTAS_URL}?id=${seleccionadaId}`, { method: "DELETE" });
    } catch {
        return; // la ruta sigue guardada; no se actualiza el estado local
    }

    rutas = rutas.filter((ruta) => ruta.id !== seleccionadaId);
    comparando = comparando.filter((id) => id !== seleccionadaId);
    seleccionadaId = rutas[0]?.id ?? null;
    pintar();
});

async function iniciar() {
    try {
        rutas = (await pedirJson(RUTAS_URL)).rutas;
    } catch (error) {
        const vacio = document.getElementById("misRutasVacio");
        vacio.textContent = error.message || "No se pudieron cargar tus rutas. Recargá la página.";
        vacio.hidden = false;
        document.getElementById("misRutasContenido").hidden = true;
        return;
    }

    const guardadas = rutasGuardadas();
    comparando = guardadas.slice(0, MAX_COMPARAR).map((ruta) => ruta.id);
    seleccionadaId = guardadas.find((ruta) => ruta.activa)?.id ?? guardadas[0]?.id ?? null;
    pintar();
}

inicializarMenu();
iniciar();