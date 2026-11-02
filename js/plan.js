import { obtenerDatos, inicializarMenuMovil } from './shared/compartido.js';

document.addEventListener("DOMContentLoaded", async () => {
    inicializarMenuMovil();
    const respuesta = await obtenerDatos('api/plan.php');
    
    if (respuesta && respuesta.plan) {
        // Agrupar por semestre
        const agrupado = respuesta.plan.reduce((acc, mat) => {
            if (!acc[mat.semestre]) acc[mat.semestre] = [];
            acc[mat.semestre].push(mat);
            return acc;
        }, {});

        const contenedor = document.getElementById("contenedorPlan");
        contenedor.innerHTML = "";

        for (const [semestre, materias] of Object.entries(agrupado)) {
            let htmlMaterias = materias.map(m => `
                <li style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    <strong>${m.codigo}</strong><br>${m.nombre_materia} (${m.creditos} cr.)
                </li>
            `).join("");

            contenedor.innerHTML += `
                <div class="plan-card" style="min-width: 250px;">
                    <div class="card-head"><h2>Semestre ${semestre}</h2></div>
                    <ul style="list-style: none; padding: 0;">${htmlMaterias}</ul>
                </div>
            `;
        }
    }
});