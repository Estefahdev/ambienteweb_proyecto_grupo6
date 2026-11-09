"use strict";

export const labels = { aprobada: "Aprobada", en_curso: "En curso", pendiente: "Pendiente", disponible: "Disponible", bloqueada: "Bloqueada" };
export const classes = { aprobada: "approved", en_curso: "current", pendiente: "pending", disponible: "available", bloqueada: "blocked" };
export const storageKey = "unipath.academic.v1";
export const money = value => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
export const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const icon = (name, group = "1-6612") => `<img class="academic-icon" src="assets/academic/${group}-${name}.svg" alt="">`;

export function readStorage(storage, key, fallback) {
    try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function notify(message, error = false) {
    const notice = document.getElementById("notice");
    notice.textContent = message;
    notice.hidden = false;
    notice.classList.toggle("error", error);
}

export async function loadAcademic() {
    const response = await fetch("data/academic-example.json");
    if (!response.ok) throw new Error("No se pudieron cargar las materias. Recargá la página.");
    const data = await response.json();
    const user = readStorage(sessionStorage, "unipathUsuario", null);
    const userId = user?.id ?? user?.correo_institucional ?? user?.correo ?? "demo";
    data.storageKey = `${storageKey}.${userId}`;
    const saved = readStorage(localStorage, data.storageKey, {});
    data.states = Object.fromEntries(data.courses.map(course => [course.code, ["aprobada", "en_curso", "pendiente"].includes(saved?.[course.code]) ? saved[course.code] : data.states[course.code]]));
    data.userName = typeof user?.nombre === "string" ? user.nombre : "Estudiante de prueba";
    document.getElementById("accountName").textContent = data.userName;
    return data;
}

export function courseState(course, states) {
    const recorded = states[course.code] ?? "pendiente";
    if (recorded !== "pendiente") return recorded;
    return course.requirements.every(code => states[code] === "aprobada") ? "disponible" : "bloqueada";
}

export function statistics(data) {
    const approved = data.courses.filter(course => data.states[course.code] === "aprobada");
    const current = data.courses.filter(course => data.states[course.code] === "en_curso");
    const credits = courses => courses.reduce((sum, course) => sum + course.credits, 0);
    return { approved, current, total: data.courses.length, credits: credits(data.courses), approvedCredits: credits(approved), currentCredits: credits(current), progress: Math.round(credits(approved) / credits(data.courses) * 100) };
}

export function initializeShell() {
    const button = document.getElementById("menuButton");
    const sidebar = document.getElementById("sidebar");
    function setMenu(open) {
        sidebar.classList.toggle("open", open);
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    }
    button.addEventListener("click", () => setMenu(!sidebar.classList.contains("open")));
    document.addEventListener("keydown", event => { if (event.key === "Escape") setMenu(false); });
    document.addEventListener("click", event => { if (!sidebar.contains(event.target) && !button.contains(event.target)) setMenu(false); });
    document.getElementById("logout").addEventListener("click", () => {
        try { sessionStorage.removeItem("unipathUsuario"); } catch { /* Navigation remains available without storage. */ }
    });
}

export function showLoadError(error) {
    const content = document.getElementById("academicContent");
    content.replaceChildren();
    const heading = document.createElement("h1");
    heading.textContent = "No pudimos cargar esta pantalla";
    content.append(heading);
    notify(error.message || "Recargá la página e intentá de nuevo.", true);
}
