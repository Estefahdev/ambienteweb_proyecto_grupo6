
"use strict";


export async function obtenerDatos(endpoint) {
    try {
        const respuesta = await fetch(endpoint);
        if (!respuesta.ok) throw new Error("Error al obtener datos");
        return await respuesta.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Formatear monedas (colones)
export function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(valor);
}


export function inicializarMenuMovil() {
    const menuButton = document.getElementById("menuButton");
    const sidebar = document.getElementById("sidebar");
    if (menuButton && sidebar) {
        menuButton.addEventListener("click", () => {
            const abierto = sidebar.classList.toggle("abierto");
            menuButton.setAttribute("aria-expanded", abierto);
        });
    }
}