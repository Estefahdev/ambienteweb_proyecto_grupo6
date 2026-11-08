
"use strict";

// =========================================
// VERIFICAR AUTENTICACIÓN
// =========================================

const usuarioAutenticado = sessionStorage.getItem("unipathUsuario");

let usuario = null;

if (!usuarioAutenticado) {

    window.location.replace("login.html");

} else {

    try {

        usuario = JSON.parse(usuarioAutenticado);

        if (!usuario || !usuario.nombre) {

            sessionStorage.removeItem("unipathUsuario");
            usuario = null;

            window.location.replace("login.html");

        } else {

            // Mostrar nombre del usuario autenticado

            const userName = document.getElementById("userName");
            const accountName = document.getElementById("accountName");

            if (userName) {
                userName.textContent = usuario.nombre;
            }

            if (accountName) {
                accountName.textContent = usuario.nombre;
            }

        }

    } catch (error) {

        console.error("Error verificando autenticación:", error);

        sessionStorage.removeItem("unipathUsuario");
        usuario = null;

        window.location.replace("login.html");

    }

}


// =========================================
// ELEMENTOS DEL MENÚ
// =========================================

const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");


// =========================================
// CERRAR MENÚ
// =========================================

function closeMenu() {

    if (!sidebar || !menuButton) {
        return;
    }

    sidebar.classList.remove("open");

    menuButton.setAttribute("aria-expanded", "false");

    menuButton.setAttribute("aria-label", "Abrir menú");

}


// =========================================
// CARGAR SITUACIÓN PERSONAL
// =========================================

async function cargarSituacionPersonal() {

    const campos = {
        tipoTrabajo: document.getElementById("tipoTrabajo"),
        horasDisponibles: document.getElementById("horasDisponibles"),
        presupuesto: document.getElementById("presupuestoPersonal"),
        maxMaterias: document.getElementById("maxMaterias"),
        periodoMeta: document.getElementById("periodoMeta")
    };

    // Comprobar que los elementos existan en el HTML

    if (Object.values(campos).some(campo => !campo)) {

        console.error(
            "No se encontraron todos los elementos de situación personal."
        );

        return;
    }

    try {

        console.log("Iniciando consulta de situación personal...");

        const respuesta = await fetch("api/situacion-personal.php", {

            method: "GET",

            credentials: "same-origin",

            headers: {
                "Accept": "application/json"
            }

        });

        const resultado = await respuesta.json();

        console.log("Respuesta de situación personal:", resultado);

        // Comprobar si la sesión expiró

        if (respuesta.status === 401) {

            sessionStorage.removeItem("unipathUsuario");

            window.location.replace("login.html");

            return;
        }

        // Comprobar errores del servidor

        if (!respuesta.ok) {

            throw new Error(
                resultado.error || "Error al consultar los datos."
            );

        }

        const datos = resultado.situacion;

        // Comprobar si existen datos registrados

        if (!datos) {

            Object.values(campos).forEach(campo => {
                campo.textContent = "Sin datos";
            });

            return;
        }

        // Convertir el tipo de trabajo a texto

        const tiposTrabajo = {

            no: "No trabaja",

            medio_tiempo: "Medio tiempo",

            tiempo_completo: "Tiempo completo"

        };

        // Tipo de trabajo

        campos.tipoTrabajo.textContent =
            tiposTrabajo[datos.tipoTrabajo] || "Sin datos";

        // Horas disponibles

        campos.horasDisponibles.textContent =
            datos.horasDisponibles != null
                ? `${datos.horasDisponibles} horas`
                : "Sin datos";

        // Presupuesto

        campos.presupuesto.textContent =
            datos.presupuesto != null
                ? new Intl.NumberFormat("es-CR", {
                    style: "currency",
                    currency: "CRC",
                    maximumFractionDigits: 0
                }).format(datos.presupuesto)
                : "Sin datos";

        // Máximo de materias

        campos.maxMaterias.textContent =
            datos.maxMaterias != null
                ? datos.maxMaterias
                : "Sin datos";

        // Período meta

        campos.periodoMeta.textContent =
            datos.fechaMeta || "Sin datos";

    } catch (error) {

        console.error(
            "Error al cargar situación personal:",
            error
        );

        Object.values(campos).forEach(campo => {
            campo.textContent = "Error al cargar";
        });

    }

}


// =========================================
// ABRIR Y CERRAR MENÚ
// =========================================

if (sidebar && menuButton) {

    menuButton.addEventListener("click", () => {

        const isOpen = sidebar.classList.toggle("open");

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuButton.setAttribute(
            "aria-label",
            isOpen ? "Cerrar menú" : "Abrir menú"
        );

    });


    // Cerrar menú al seleccionar una opción

    const navigationLinks = document.querySelectorAll(
        ".side-nav .nav-link"
    );

    navigationLinks.forEach((link) => {

        link.addEventListener("click", () => {

            closeMenu();

        });

    });


    // Cerrar menú al presionar Escape

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            closeMenu();

        }

    });


    // Cerrar menú al cambiar a pantalla grande

    window.addEventListener("resize", () => {

        if (window.innerWidth > 750) {

            closeMenu();

        }

    });

}


// =========================================
// BUSCADOR DEL PANEL PRINCIPAL
// =========================================

const searchInput = document.getElementById("searchInput");

if (searchInput) {

    const searchableCards = [
        ...document.querySelectorAll(
            ".dashboard-grid .dashboard-card"
        )
    ];

    searchInput.addEventListener("input", () => {

        const query = searchInput.value
            .trim()
            .toLocaleLowerCase("es");

        searchableCards.forEach((card) => {

            const content = card.textContent
                .toLocaleLowerCase("es");

            const matches = content.includes(query);

            card.hidden = query !== "" && !matches;

        });

    });

}


// =========================================
// CERRAR SESIÓN
// =========================================

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener("click", (event) => {

        event.preventDefault();

        // Eliminar los datos del usuario del navegador

        sessionStorage.removeItem("unipathUsuario");

        // Regresar al inicio de sesión

        window.location.replace("login.html");

    });

}


// =========================================
// INICIALIZAR PANEL PRINCIPAL
// =========================================

if (usuario) {

    // Cargar información personal desde la API

    cargarSituacionPersonal();

}

// Inicializar menú

closeMenu();
