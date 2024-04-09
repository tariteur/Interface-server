const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const MinecraftServer = require('./server/minecraft/index.js');
const FileExplorer = require('./server/file_explorer/index.js')

const app = express();
const port = 3000;
const server = http.createServer(app);
const socket = socketIO(server);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src')));
app.use(bodyParser.json()); // Parse JSON bodies

// Servir la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'main-menu', 'index.html'));
});

const rootDirectory = path.join(__dirname);

// Instanciar el servidor de Minecraft
const minecraftServer = new MinecraftServer(app, socket, 'C:\\Program Files\\Java\\jdk-17\\bin\\java', rootDirectory);
const fileExplorer = new FileExplorer(app, rootDirectory);

// Iniciar el servidor HTTP
server.listen(port, () => {
    console.log(`Serveur principal démarré sur http://localhost:${port}`);
});
