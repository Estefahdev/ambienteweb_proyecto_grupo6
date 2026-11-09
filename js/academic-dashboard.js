"use strict";
import { loadAcademic, initializeShell, showLoadError, statistics, escapeHtml, icon, readStorage, money } from "./academic-core.js";

initializeShell();
try {
    const data = await loadAcademic();
    const stats = statistics(data);
    document.getElementById("greeting").textContent = `Hola, ${data.userName.split(" ")[0]} 👋`;
    document.getElementById("dashboardMetrics").innerHTML = [
        ["Avance de carrera", `${stats.progress}%`, `<progress max="100" value="${stats.progress}" aria-label="Avance de carrera"></progress>${stats.approvedCredits} de ${stats.credits} créditos aprobados`, "imgContainer11"],
        ["Materias aprobadas", `${stats.approved.length} <small>/ ${stats.total}</small>`, "Materias registradas en tu perfil académico", "imgContainer13"],
        ["Materias en curso", stats.current.length, `${stats.currentCredits} créditos en tu carga actual`, "imgContainer14"],
        ["Materias pendientes", stats.total - stats.approved.length - stats.current.length, "Por cursar según tu avance registrado", "imgContainer15"]
    ].map(([title,value,description,img]) => `<article class="academic-card metric-card"><div class="section-heading"><h2>${title}</h2><span class="metric-icon">${icon(img, "1-6150")}</span></div><strong class="metric-value">${value}</strong><div class="metric-description">${description}</div></article>`).join("");
    document.getElementById("currentCredits").textContent = `${stats.current.length} materias · ${stats.currentCredits} créditos`;
    document.getElementById("currentCourses").innerHTML = stats.current.length ? stats.current.map((course,index) => `<a class="dashboard-course" href="plan-estudios.html?course=${course.code}"><span class="course-tile-icon">${icon(["imgContainer17", "imgContainer20", "imgContainer22", "imgContainer23"][index % 4], "1-6150")}</span><span><span class="course-meta"><strong>${course.code}</strong> · ${course.credits} créditos · ${course.hours} h de estudio / sem</span><strong>${escapeHtml(course.name)}</strong></span><span class="state current">En curso</span><span aria-hidden="true">›</span></a>`).join("") : '<p class="empty-state">Todavía no registraste materias en curso. Podés hacerlo desde tu perfil académico.</p>';
    const maxCredits = Math.max(...[...new Set(data.courses.map(course => course.term))].map(term => data.courses.filter(course => course.term === term).reduce((sum,course) => sum + course.credits,0)));
    document.getElementById("creditChart").innerHTML = [...new Set(data.courses.map(course => course.term))].map(term => {
        const courses = data.courses.filter(course => course.term === term);
        const total = courses.reduce((sum,course) => sum + course.credits,0);
        const approved = courses.filter(course => data.states[course.code] === "aprobada").reduce((sum,course) => sum + course.credits,0);
        const current = courses.filter(course => data.states[course.code] === "en_curso").reduce((sum,course) => sum + course.credits,0);
        return `<div class="chart-column" title="Cuatrimestre ${term}: ${approved} créditos aprobados, ${current} en curso y ${total-approved-current} pendientes"><small>${total} cr</small><div class="chart-bar" style="height:${total/maxCredits*110}px"><span class="chart-pending" style="height:${(total-approved-current)/total*100}%"></span><span class="chart-current" style="height:${current/total*100}%"></span><span class="chart-approved" style="height:${approved/total*100}%"></span></div><small>C${term}</small></div>`;
    }).join("");
    const routeElement = document.getElementById("activeRoute");
    try {
        const response = await fetch("data/rutas-ejemplo.json");
        if (!response.ok) throw new Error("Routes unavailable");
        const routes = (await response.json()).rutas;
        const state = readStorage(localStorage, "unipath.estadoRutas", { guardadas: [1,2], activa: 1 });
        const route = routes.find(item => item.id === state?.activa && Array.isArray(state.guardadas) && state.guardadas.includes(item.id));
        if (route) {
            const metrics = route.metricas;
            routeElement.innerHTML = `<span class="tag green">Activa</span><h3>${escapeHtml(route.nombre)}</h3><p>${metrics.cuatrimestres} cuatrimestres · ${metrics.horasPromedio} h / sem</p><p>${money(metrics.costoPromedio)} por cuatrimestre</p><p class="muted">Ejemplo guardado. Revisá la ruta si cambiaste tu avance académico.</p><a class="academic-button secondary full-width" href="mis-rutas.html">Ver mis rutas →</a>`;
        } else routeElement.innerHTML = '<p>No tenés una ruta activa.</p><a class="academic-button secondary full-width" href="generador-rutas.html">Generar rutas →</a>';
    } catch { routeElement.innerHTML = '<p>No pudimos cargar tus rutas.</p><a href="mis-rutas.html">Consultar Mis rutas →</a>'; }
} catch (error) { showLoadError(error); }
