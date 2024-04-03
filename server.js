const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

class MinecraftServerManager {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIO(this.server);
        this.port = 4000;
        this.minecraftProcesses = new Map(); // Stocker les processus Minecraft en cours
        this.versions = require('./versions.json');

        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
    }

    setupMiddleware() {
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(express.static(path.join(__dirname, 'src')));
    }

    setupRoutes() {
        this.app.get('/', this.handleHomePage.bind(this));
        this.app.get('/versions', this.handleVersionsRequest.bind(this));
        this.app.get('/add-server', this.handleAddServerRequest.bind(this));
        this.app.get('/start', this.handleStartServerRequest.bind(this));
        this.app.get('/stop', this.handleStopServerRequest.bind(this));
        this.app.get('/command', this.handleSendCommandRequest.bind(this));
        this.app.get('/servers', this.handleServersRequest.bind(this));
        this.app.get('/open-file', this.handleOpenFileRequest.bind(this));
        this.app.get('/folder-content', this.handleFolderContentRequest.bind(this));
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('Un client s\'est connecté');
        });
    }

    async handleHomePage(req, res) {
        res.sendFile(path.join(__dirname, 'src', 'menu_principal.html'));
    }

    handleVersionsRequest(req, res) {
        res.json(this.versions);
    }

    async handleAddServerRequest(req, res) {
        const { serverName, version } = req.query;
        try {
            await this.downloadJar(serverName, version);
            console.log(`Fichier JAR de la version ${version} téléchargé avec succès pour le serveur ${serverName}.`);
        } catch (error) {
            console.error(`Erreur lors du téléchargement du fichier JAR : ${error.message}`);
            res.status(500).send(`Une erreur est survenue lors du téléchargement du fichier JAR : ${error.message}`);
            return;
        }

        const command = `"C:\\Program Files\\Java\\jdk-17\\bin\\java" -jar minecraft_server.${version}.jar`;
        const filePath = `minecraft_server/${serverName}`;

        const child = exec(command, { cwd: filePath }, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Erreur lors de l'exécution de la commande : ${error}`);
                return;
            }
            console.log(`Sortie de la commande : ${stdout}`);
            console.error(`Erreurs de la commande : ${stderr}`);

            const eulaFilePath = `${filePath}/eula.txt`;
            let eulaContent = '';
            while (!fs.existsSync(eulaFilePath)) {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Attendre 3 secondes
            }

            try {
                eulaContent = fs.readFileSync(eulaFilePath, 'utf8');
                eulaContent = eulaContent.replace('eula=false', 'eula=true');
                fs.writeFileSync(eulaFilePath, eulaContent);
                console.log("Le fichier eula.txt a été modifié avec succès.");
            } catch (err) {
                console.error(`Erreur lors de la modification du fichier eula.txt : ${err}`);
            }
        });

        child.stdout.on('data', (data) => {
            this.io.emit('serverConsole', { serverName, output: data.toString() });
        });

        child.stderr.on('data', (data) => {
            this.io.emit('serverConsole', { serverName, output: data.toString() });
        });

        res.send('Serveur Minecraft démarré.');
    }

    async downloadJar(serverName, version) {
        const versionInfo = this.versions.find(v => v.version === version);
        if (!versionInfo) {
            throw new Error(`La version ${version} n'est pas disponible.`);
        }

        const serverFolder = `Minecraft_Server/${serverName}`;
        if (!fs.existsSync(serverFolder)) {
            fs.mkdirSync(serverFolder, { recursive: true }); // Créez le dossier récursivement si nécessaire
        }

        const jarUrl = versionInfo.url;
        const jarResponse = await axios({
            url: jarUrl,
            method: 'GET',
            responseType: 'stream',
        });
        const jarFilePath = path.join(serverFolder, `minecraft_server.${version}.jar`);
        jarResponse.data.pipe(fs.createWriteStream(jarFilePath));

        return new Promise((resolve, reject) => {
            jarResponse.data.on('end', () => {
                resolve();
            });
            jarResponse.data.on('error', (err) => {
                reject(err);
            });
        });
    }

    handleStartServerRequest(req, res) {
        const { serverName, versions } = req.query;
        console.log(`Le serveur ${serverName} essaie de démarrer`);
        const command = `"C:\\Program Files\\Java\\jdk-17\\bin\\java" -jar minecraft_server.${versions}.jar`;
        const filePath = `minecraft_server/${serverName}`;

        const minecraftProcess = exec(command, { cwd: filePath }, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Erreur lors de l'exécution de la commande : ${error}`);
                return;
            }
            console.log(`Sortie de la commande : ${stdout}`);
            console.error(`Erreurs de la commande : ${stderr}`);
        });

        minecraftProcess.stdout.on('data', (data) => {
            this.io.emit('serverConsole', { serverName, output: data.toString() });
        });

        minecraftProcess.stderr.on('data', (data) => {
            this.io.emit('serverConsole', { serverName, output: data.toString() });
        });

        this.minecraftProcesses.set(serverName, minecraftProcess);
        res.send('Serveur Minecraft démarré.');
    }

    handleStopServerRequest(req, res) {
        const { serverName } = req.query;
        const minecraftProcess = this.minecraftProcesses.get(serverName);
        if (minecraftProcess) {
            minecraftProcess.stdin.write("stop" + '\n');
            this.minecraftProcesses.delete(serverName);
            res.send('Arrêt du serveur en cours.');
        } else {
            res.status(404).send('Le serveur spécifié n\'est pas en cours d\'exécution.');
        }
    }

    handleSendCommandRequest(req, res) {
        const { serverName, command } = req.query;
        console.log(`${serverName}, ${command}`)
        const minecraftProcess = this.minecraftProcesses.get(serverName);
        if (minecraftProcess) {
            minecraftProcess.stdin.write(command + '\n');
            res.send('Commande envoyée.');
        } else {
            res.status(404).send('Le serveur spécifié n\'est pas en cours d\'exécution.');
        }
    }

    handleServersRequest(req, res) {
        const serverFolder = 'minecraft_server';
        fs.readdir(serverFolder, (err, files) => {
            if (err) {
                console.error(`Erreur lors de la lecture du dossier des serveurs : ${err}`);
                res.status(500).send(`Une erreur est survenue lors de la lecture du dossier des serveurs.`);
                return;
            }

            const serverList = [];

            files.forEach(server => {
                const serverPath = path.join(serverFolder, server);

                fs.readdir(serverPath, (err, serverFiles) => {
                    if (err) {
                        console.error(`Erreur lors de la lecture du dossier du serveur ${server} : ${err}`);
                        return;
                    }

                    const versionFolder = serverFiles.find(file => fs.statSync(path.join(serverPath, file)).isDirectory() && file.toLowerCase().startsWith('versions'));

                    if (versionFolder) {
                        fs.readdir(path.join(serverPath, versionFolder), (err, versions) => {
                            if (err) {
                                console.error(`Erreur lors de la lecture du dossier des versions du serveur ${server} : ${err}`);
                                return;
                            }

                            serverList.push({ name: server, versions: versions });
                            if (serverList.length === files.length) {
                                res.json(serverList);
                            }
                        });
                    } else {
                        serverList.push({ name: server, versions: [] });
                        if (serverList.length === files.length) {
                            res.json(serverList);
                        }
                    }
                });
            });
        });
    }

    handleOpenFileRequest(req, res) {
        const { serverName, fileName } = req.query;
        const filePath = `minecraft_server/${serverName}/${fileName}`;
        res.sendFile(filePath);
    }
    
    handleFolderContentRequest(req, res) {
        const { serverName, folderName } = req.query;
        const folderPath = `minecraft_server/${serverName}/${folderName}`;
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error(`Erreur lors de la lecture du contenu du dossier ${folderName} :`, err);
                res.status(500).send(`Erreur lors de la lecture du contenu du dossier ${folderName}.`);
                return;
            }
    
            const fileList = files.map(file => ({ name: file, isDirectory: fs.statSync(path.join(folderPath, file)).isDirectory() }));
            res.json(fileList);
        });
    }
    
    

    start() {
        this.server.listen(this.port, () => {
            console.log(`Serveur web démarré sur http://localhost:${this.port}`);
        });
    }
}

const serverManager = new MinecraftServerManager();
serverManager.start();
