
"use strict";



const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const searchInput = document.getElementById("searchInput");

const notificationMessage =
    document.getElementById("notificationMessage");


function closeMenu() {
    sidebar.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Abrir menú");
}

menuButton.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
        "aria-label",
        isOpen ? "Cerrar menú" : "Abrir menú"
    );
});

document.querySelectorAll(".side-nav .nav-link").forEach((link) => {
    link.addEventListener("click", () => {
        closeMenu();

        document.querySelectorAll(".side-nav .nav-link")
            .forEach((item) => {
                item.classList.remove("active");
                item.removeAttribute("aria-current");
            });

        link.classList.add("active");
        link.setAttribute("aria-current", "location");
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeMenu();
    }
});

let notificationTimeout;

function showMessage(message) {
    notificationMessage.textContent = message;
    notificationMessage.hidden = false;

    clearTimeout(notificationTimeout);

    notificationTimeout = setTimeout(() => {
        notificationMessage.hidden = true;
    }, 4000);
}

const searchablePanels = [
    ...document.querySelectorAll(".dashboard-grid > .panel")
];

searchInput.addEventListener("input", () => {
    const query = searchInput.value
        .trim()
        .toLocaleLowerCase("es");

    searchablePanels.forEach((panel) => {
        const matches = panel.textContent
            .toLocaleLowerCase("es")
            .includes(query);

        panel.hidden = query !== "" && !matches;
    });
});

function prepareRoute() {
    showMessage(
        "Para generar una ruta debemos conectar tu plan de estudios, " +
        "los prerrequisitos y tus cursos aprobados."
    );

    document.getElementById("generador").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

document.getElementById("startPlanning")
    .addEventListener("click", prepareRoute);

document.getElementById("generateRouteButton")
    .addEventListener("click", prepareRoute);

// =========================================
// NOTIFICACIONES
// =========================================

document.getElementById("notificationsButton")
    .addEventListener("click", () => {
        showMessage(
            "Las notificaciones estarán disponibles cuando " +
            "conectemos tu cuenta y tus recordatorios."
        );
    });

closeMenu();
