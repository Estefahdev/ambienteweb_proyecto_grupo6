"use strict";
import { loadAcademic, initializeShell, showLoadError, statistics, escapeHtml, normalize, notify } from "./academic-core.js";

initializeShell();
try {
    const data = await loadAcademic();
    const search = document.getElementById("courseSearch");
    const filters = document.getElementById("profileFilters");
    let activeFilter = "all";
    let dirty = false;
    const statusLabels = { aprobada: "Aprobada", en_curso: "En curso", pendiente: "Pendiente" };

    function render() {
        const stats = statistics(data);
        document.getElementById("totalCredits").textContent = `${stats.credits} créditos totales`;
        document.getElementById("profileProgress").innerHTML = `<div><span class="eyebrow">Avance total</span><strong>${stats.progress}%</strong><progress max="100" value="${stats.progress}" aria-label="Avance de créditos aprobados"></progress></div><span><strong>${stats.approved.length} de ${stats.total}</strong><small>Materias aprobadas</small></span>`;
        const counts = { all: stats.total, aprobada: stats.approved.length, en_curso: stats.current.length, pendiente: stats.total - stats.approved.length - stats.current.length };
        filters.innerHTML = Object.entries({ all: "Todas", aprobada: "Aprobadas", en_curso: "En curso", pendiente: "Pendientes" }).map(([key, label]) => `<button type="button" data-filter="${key}" aria-pressed="${activeFilter === key}">${label} (${counts[key]})</button>`).join("");
        const query = normalize(search.value.trim());
        const visible = data.courses.filter(course => (activeFilter === "all" || data.states[course.code] === activeFilter) && normalize(`${course.code} ${course.name}`).includes(query));
        const terms = [...new Set(visible.map(course => course.term))];
        document.getElementById("profileCourses").innerHTML = terms.length ? terms.map(term => {
            const courses = visible.filter(course => course.term === term);
            const termCourses = data.courses.filter(course => course.term === term);
            const approved = termCourses.filter(course => data.states[course.code] === "aprobada").length;
            return `<section class="academic-card term-section"><div class="section-heading"><h2><span class="status-dot"></span>Cuatrimestre ${term}</h2><span class="tag ${approved === termCourses.length ? "green" : ""}">${approved} de ${termCourses.length} aprobadas</span></div>${courses.map(course => `<div class="profile-course"><span class="course-code">${course.code}</span><div class="course-name"><strong>${escapeHtml(course.name)}</strong><small>${course.credits} créditos${course.requirements.length ? ` · Req.: ${course.requirements.join(", ")}` : " · Sin prerrequisitos"}</small></div><div class="status-switch" role="group" aria-label="Estado de ${escapeHtml(course.name)}">${Object.entries(statusLabels).map(([key,label]) => `<button type="button" data-course="${course.code}" data-state="${key}" class="${key}" aria-pressed="${data.states[course.code] === key}">${label}</button>`).join("")}</div></div>`).join("")}</section>`;
        }).join("") : '<div class="academic-card empty-state">No hay materias que coincidan con tu búsqueda.</div>';
        document.getElementById("saveProfile").disabled = !dirty;
    }
    search.addEventListener("input", render);
    filters.addEventListener("click", event => {
        const button = event.target.closest("button[data-filter]");
        if (button) { activeFilter = button.dataset.filter; render(); filters.querySelector(`[data-filter="${activeFilter}"]`).focus(); }
    });
    document.getElementById("profileCourses").addEventListener("click", event => {
        const button = event.target.closest("button[data-course]");
        if (!button) return;
        const { course, state } = button.dataset;
        if (data.states[course] === state) return;
        data.states[course] = state;
        dirty = true;
        document.getElementById("saveStatus").textContent = "Tenés cambios sin guardar.";
        render();
        document.querySelector(`[data-course="${course}"][data-state="${state}"]`)?.focus();
    });
    document.getElementById("saveProfile").addEventListener("click", () => {
        try {
            localStorage.setItem(data.storageKey, JSON.stringify(data.states));
            dirty = false;
            document.getElementById("saveStatus").textContent = `Último guardado: ${new Intl.DateTimeFormat("es-CR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
            notify("Guardaste tu avance académico.");
            render();
        } catch { notify("No se pudo guardar en este navegador. Tus cambios siguen en pantalla; intentá de nuevo.", true); }
    });
    window.addEventListener("beforeunload", event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
    render();
} catch (error) { showLoadError(error); }
