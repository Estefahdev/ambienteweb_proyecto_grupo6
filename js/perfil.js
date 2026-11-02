import { obtenerDatos, inicializarMenuMovil } from './shared/compartido.js';

document.addEventListener("DOMContentLoaded", async () => {
    inicializarMenuMovil();
    const respuesta = await obtenerDatos('api/perfil.php');
    
    if (respuesta) {
        // Llenar datos personales
        document.getElementById("datosPersonales").innerHTML = `
            <p><strong>Nombre:</strong> ${respuesta.perfil.nombre}</p>
            <p><strong>Correo:</strong> ${respuesta.perfil.correo}</p>
            <p><strong>Carrera:</strong> ${respuesta.perfil.carrera}</p>
            <p><strong>Universidad:</strong> ${respuesta.perfil.universidad}</p>
        `;

        // Llenar tabla
        const tbody = document.getElementById("tablaHistorial");
        tbody.innerHTML = "";
        respuesta.historial.forEach(mat => {
            tbody.innerHTML += `
                <tr>
                    <td>${mat.codigo}</td>
                    <td>${mat.nombre_materia}</td>
                    <td>${mat.creditos}</td>
                    <td>${mat.nota}</td>
                </tr>
            `;
        });
    }
});