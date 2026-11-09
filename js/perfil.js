import { obtenerDatos, inicializarMenuMovil } from './compartido.js';

document.addEventListener("DOMContentLoaded", async () => {
    inicializarMenuMovil();
    const respuesta = await obtenerDatos('api/perfil.php');
    
    if (respuesta) {
        // aqui se llena los  datos personales
        document.getElementById("datosPersonales").innerHTML = `
            <p><strong>Nombre:</strong> ${respuesta.perfil.nombre}</p>
            <p><strong>Correo:</strong> ${respuesta.perfil.correo_institucional}</p>
            <p><strong>Carrera:</strong> ${respuesta.perfil.carrera || 'Sin carrera asignada'}</p>
        `;

        // Llenar tabla
        const tbody = document.getElementById("tablaHistorial");
        tbody.innerHTML = "";
        respuesta.historial.forEach(mat => {
            const estadoTexto = mat.estado === 'aprobada' ? '✅ Aprobada' : '⏳ En curso';
            tbody.innerHTML += `
                <tr>
                    <td>${mat.codigo}</td>
                    <td>${mat.nombre}</td>
                    <td>${mat.creditos}</td>
                    <td>${estadoTexto}</td>
                </tr>
            `;
        });
    }
});