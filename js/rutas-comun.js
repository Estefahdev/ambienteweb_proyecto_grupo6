"use strict";

// Para la entrega final se cambia esta URL por api/generar-rutas.php (misma forma de datos)
const RUTAS_URL = "data/rutas-ejemplo.json";
const ESTADO_RUTAS_KEY = "unipath.estadoRutas";

const ETIQUETAS_RUTA = {
    equilibrada: { texto: "Recomendada por IA", clase: "badge-teal" },
    rapida: { texto: "Carga alta", clase: "badge-ambar" },
    ligera: { texto: "Más tiempo", clase: "badge-azul" }
};

const formatoColones = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 });
const formatoHoras = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 });

function colones(valor) {
    return `₡${formatoColones.format(valor)}`;
}

function horas(valor) {
    return `${formatoHoras.format(valor)} h`;
}

// "2027-1" → "I cuatrimestre 2027"
function etiquetaCuatrimestre(periodo) {
    const [anio, numero] = periodo.split("-");
    return `${["I", "II", "III"][numero - 1]} cuatrimestre ${anio}`;
}

// "2027-3" → "diciembre de 2027"
function finCuatrimestre(periodo) {
    const [anio, numero] = periodo.split("-");
    return `${["abril", "agosto", "diciembre"][numero - 1]} de ${anio}`;
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

async function cargarRutas() {
    const respuesta = await fetch(RUTAS_URL);
    if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status}`);
    }
    return (await respuesta.json()).rutas;
}

// Temporal para el Avance 2: en la entrega final esto vive en la tabla rutas
function leerEstadoRutas() {
    try {
        const guardado = JSON.parse(localStorage.getItem(ESTADO_RUTAS_KEY));
        if (guardado) {
            return guardado;
        }
    } catch {
        // Sin acceso a localStorage se usa el estado inicial
    }
    return { guardadas: [1, 2], activa: 1 };
}

function guardarEstadoRutas(estado) {
    try {
        localStorage.setItem(ESTADO_RUTAS_KEY, JSON.stringify(estado));
    } catch {
        // La página sigue funcionando; el cambio dura hasta recargar
    }
}

function htmlDesglose(ruta) {
    return ruta.periodos.map((periodo) => `
        <article class="periodo">
            <h3>${etiquetaCuatrimestre(periodo.periodo)}</h3>
            <ul class="periodo-materias">
                ${periodo.materias.map((materia) => `
                    <li>
                        <span class="materia-codigo">${escaparHtml(materia.codigo)}</span>
                        <span>${escaparHtml(materia.nombre)}</span>
                    </li>`).join("")}
            </ul>
            <p class="periodo-resumen">
                ${periodo.materias.length} materias · ${horas(periodo.horas)} · ${colones(periodo.costo)}
            </p>
        </article>`).join("");
}

function inicializarMenu() {
    const sidebar = document.getElementById("sidebar");
    const menuButton = document.getElementById("menuButton");

    menuButton.addEventListener("click", () => {
        const abierto = sidebar.classList.toggle("open");
        menuButton.setAttribute("aria-expanded", String(abierto));
        menuButton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && sidebar.classList.contains("open")) {
            sidebar.classList.remove("open");
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Abrir menú");
        }
    });
}