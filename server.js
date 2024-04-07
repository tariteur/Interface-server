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

// Instanciar el servidor de Minecraft
const minecraftServer = new MinecraftServer(socket, 'C:\\Program Files\\Java\\jdk-17\\bin\\java', path.join(__dirname, 'minecraft_server'));

const rootDirectory = path.join(__dirname, 'minecraft_server');
const fileExplorer = new FileExplorer(app, rootDirectory);

app.post('/minecraft/addServer', async (req, res) => {
    const { serverName, serverVersion } = req.body;

    try {
        const message = await minecraftServer.addServer(serverName, serverVersion);
        res.send(message);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.post('/minecraft/startServer', async (req, res) => {
    const { serverName, serverVersion } = req.body;
    try {
        const message = await minecraftServer.startServer(serverName, serverVersion);
        res.send(message);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.post('/minecraft/stopServer', async (req, res) => {
    const { serverName } = req.body;

    try {
        const message = await minecraftServer.stopServer(serverName);
        res.send(message);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.post('/minecraft/sendCommand', async (req, res) => {
    const { serverName, command } = req.body;

    try {
        const message = await minecraftServer.sendCommand(serverName, command);
        res.send(message);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.get('/minecraft/getVersionInfo', async (req, res) => {
    try {
        const message = await minecraftServer.getVersionInfo();
        res.send(message);
    } catch (error) {
        res.status(500).send(`Erreur : ${error.message}`);
    }
});

app.get('/minecraft/getServersList', async (req, res) => {
    try {
        const message = await minecraftServer.getServersList();
        res.send(message);
    } catch (error) {
        res.status(500).send(`Erreur : ${error.message}`);
    }
});

// Iniciar el servidor HTTP
server.listen(port, () => {
    console.log(`Serveur principal démarré sur http://localhost:${port}`);
});
