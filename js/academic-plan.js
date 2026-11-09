"use strict";
import { loadAcademic, initializeShell, showLoadError, statistics, courseState, labels, classes, escapeHtml, normalize, money, icon } from "./academic-core.js";

initializeShell();
try {
    const data = await loadAcademic();
    const search = document.getElementById("planSearch");
    const filter = document.getElementById("planFilter");
    const board = document.getElementById("courseBoard");
    const detail = document.getElementById("courseDetail");
    let selected = new URLSearchParams(location.search).get("course") || "SC-502";
    let zoom = 100;
    search.value = new URLSearchParams(location.search).get("q") || "";

    function detailHtml(course) {
        const state = courseState(course, data.states);
        const requirements = course.requirements.map(code => data.courses.find(item => item.code === code));
        const unlocked = data.courses.filter(item => item.requirements.includes(course.code));
        const met = requirements.filter(item => data.states[item.code] === "aprobada").length;
        return `<div class="detail-heading"><span class="eyebrow">Detalle de materia</span><span class="tag">${course.code}</span><button type="button" id="closeDetail" aria-label="Cerrar detalle de materia">×</button></div><h2>${escapeHtml(course.name)}</h2><p class="muted">Ingeniería en Sistemas · Cuatrimestre ${course.term}</p><div class="detail-metrics"><div class="${classes[state]}"><small>Estado</small><strong>${labels[state]}</strong></div><div><small>Créditos</small><strong>${course.credits} créditos</strong></div><div><small>Horas de estudio</small><strong>${course.hours} hrs / sem</strong></div><div><small>Costo estimado</small><strong>${money(course.cost)}</strong></div></div><div class="section-heading"><h3>Prerrequisitos</h3><small>${met} de ${requirements.length} cumplidos</small></div><ul class="detail-list">${requirements.length ? requirements.map(item => `<li><button type="button" data-detail="${item.code}"><span>${data.states[item.code] === "aprobada" ? "✓" : "○"}</span><span><strong>${item.code}</strong> ${escapeHtml(item.name)}<small>${labels[data.states[item.code]]}</small></span></button></li>`).join("") : '<li class="muted">No tiene prerrequisitos.</li>'}</ul><h3>Desbloquea cursos futuros</h3><ul class="detail-list future-list">${unlocked.length ? unlocked.map(item => `<li><button type="button" data-detail="${item.code}">${icon("imgContainer5", "1-4184")}<span><strong>${item.code}</strong> ${escapeHtml(item.name)}<small>Cuatrimestre ${item.term}</small></span></button></li>`).join("") : '<li class="muted">Ninguna materia depende directamente de este curso.</li>'}</ul><div class="rule-note ${state === "bloqueada" ? "warning" : ""}">${state === "bloqueada" ? "Tenés prerrequisitos pendientes. Revisá tu avance antes de planificar esta materia." : "Consultá las rutas para organizar tus próximos cuatrimestres."}</div><a class="academic-button full-width" href="generador-rutas.html">Ir al generador de rutas →</a><a class="detail-profile-link" href="perfil-academico.html">Actualizar estado en mi perfil</a>`;
    }
    function showDetail(code, focus = false) {
        const course = data.courses.find(item => item.code === code);
        if (!course) return;
        selected = code;
        detail.hidden = false;
        document.querySelector(".academic-plan-layout").classList.remove("detail-closed");
        detail.innerHTML = detailHtml(course);
        board.querySelectorAll("[data-course]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.course === selected)));
        if (focus) detail.focus();
    }
    function render() {
        const stats = statistics(data);
        const counts = { aprobada: 0, en_curso: 0, disponible: 0, bloqueada: 0 };
        data.courses.forEach(course => counts[courseState(course, data.states)]++);
        document.getElementById("planStats").innerHTML = `<span class="tag">Total <strong>${stats.total}</strong></span>${Object.entries(counts).map(([state,count]) => `<span class="tag ${classes[state]}">${labels[state]} <strong>${count}</strong></span>`).join("")}`;
        const query = normalize(search.value.trim());
        const visible = data.courses.filter(course => normalize(`${course.code} ${course.name}`).includes(query) && (filter.value === "all" || courseState(course, data.states) === filter.value));
        board.innerHTML = visible.length ? [...new Set(visible.map(course => course.term))].map(term => `<section class="board-term"><div class="term-title"><h3>Cuatri ${term}</h3><small>${data.courses.filter(course => course.term === term).reduce((sum,course) => sum + course.credits,0)} créditos</small></div>${visible.filter(course => course.term === term).map(course => {
            const state = courseState(course, data.states);
            return `<button class="course-node ${classes[state]}" type="button" data-course="${course.code}" aria-pressed="${course.code === selected}"><span class="node-meta"><strong>${course.code}</strong><span>${course.credits} cr</span></span><span class="node-title">${escapeHtml(course.name)}</span><span class="node-footer">${labels[state]} ${state === "bloqueada" ? icon("imgContainer11", "1-3594") : state === "aprobada" ? icon("imgContainer3", "1-3594") : state === "en_curso" ? icon("imgContainer5", "1-3594") : icon("imgContainer8", "1-3594")}</span></button>`;
        }).join("")}</section>`).join("") : '<p class="empty-state">No hay materias que coincidan con estos filtros.</p>';
    }
    board.addEventListener("click", event => { const button = event.target.closest("[data-course]"); if (button) showDetail(button.dataset.course, true); });
    detail.addEventListener("click", event => {
        const button = event.target.closest("[data-detail]");
        if (button) showDetail(button.dataset.detail, true);
        if (event.target.closest("#closeDetail")) {
            detail.hidden = true;
            document.querySelector(".academic-plan-layout").classList.add("detail-closed");
            board.querySelector(`[data-course="${selected}"]`)?.focus();
        }
    });
    search.addEventListener("input", render);
    filter.addEventListener("change", render);
    function setZoom(value) {
        zoom = Math.max(80, Math.min(120, value));
        board.style.setProperty("--course-width", `${175 * zoom / 100}px`);
        document.getElementById("zoomValue").textContent = `${zoom}%`;
        document.getElementById("zoomOut").disabled = zoom === 80;
        document.getElementById("zoomIn").disabled = zoom === 120;
    }
    document.getElementById("zoomOut").addEventListener("click", () => setZoom(zoom - 10));
    document.getElementById("zoomIn").addEventListener("click", () => setZoom(zoom + 10));
    document.getElementById("resetView").addEventListener("click", () => { search.value = ""; filter.value = "all"; setZoom(100); render(); document.getElementById("boardScroll").scrollLeft = 0; });
    render();
    showDetail(data.courses.some(course => course.code === selected) ? selected : data.courses[0].code);
} catch (error) { showLoadError(error); }
