
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permite recibir datos de formularios en formato JSON.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sirve los archivos públicos de UniPath.
app.use(express.static(__dirname));

// Página principal.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Iniciar servidor.
app.listen(PORT, () => {
    console.log(`UniPath está disponible en http://localhost:${PORT}`);
});
