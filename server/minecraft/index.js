const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

class MinecraftServer {
    constructor(socket, javaPath, serverFolder) {
        this.javaPath = javaPath;
        this.serverFolder = serverFolder;
        this.running = false;
        this.minecraftProcesses = new Map();
        this.versions = require('./versions.json');
        this.socket = socket;
    }

    async addServer(serverName , serverVersion) {
        try {
            await this.downloadJar(serverName, serverVersion);
            console.log(`Fichier JAR de la version ${serverVersion} téléchargé avec succès pour le serveur ${serverName}.`);
        } catch (error) {
            console.error(`Erreur lors du téléchargement du fichier JAR : ${error.message}`);
            res.status(500).send(`Une erreur est survenue lors du téléchargement du fichier JAR : ${error.message}`);
            return;
        }
    
        const command = `"${this.javaPath}" -jar minecraft_server.${serverVersion}.jar`;
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
            
            return `Serveur ${serverName} en ${serverVersion} cree avec succes`
        });
    }
           
    startServer(serverName, versions) {
        console.log(`Le serveur ${serverName} essaie de démarrer`);
        const command = `"${this.javaPath}" -jar minecraft_server.${versions}.jar`;
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
            this.socket.emit('serverConsole', { game: 'Minecraft', serverName, output: data.toString() });
        });

        minecraftProcess.stderr.on('data', (data) => {
            this.socket.emit('serverConsole', { game: 'Minecraft', output: data.toString() });
        });

        this.minecraftProcesses.set(serverName, minecraftProcess);

        return `Le serveur ${serverName} essaie de démarrer`
    }

    stopServer(serverName) {
        const minecraftProcess = this.minecraftProcesses.get(serverName);
        if (minecraftProcess) {
            minecraftProcess.stdin.write("stop" + '\n');
            this.minecraftProcesses.delete(serverName);
            res.send('Arrêt du serveur en cours.');
        } else {
            res.status(404).send('Le serveur spécifié n\'est pas en cours d\'exécution.');
        }
    }

    async downloadJar(serverName, version, serverFolder) {
        const versionInfo = await this.getVersionInfo(version);
        console.log(`${serverName}, ${versionInfo.url}`);
    
        if (!versionInfo) {
            throw new Error(`La version ${version} n'est pas disponible.`);
        }
    
        const jarUrl = versionInfo.url;
        const serverFolderPath = path.join(this.serverFolder, serverName);
        const jarFilePath = path.join(serverFolderPath, `minecraft_server.${version}.jar`);
    
        try {
            // Create directory recursively if it doesn't exist
            await fs.promises.mkdir(serverFolderPath, { recursive: true });
    
            const response = await axios({
                url: jarUrl,
                method: 'GET',
                responseType: 'stream'
            });
    
            const writer = fs.createWriteStream(jarFilePath);
    
            // Handle stream events to write data to file
            response.data.pipe(writer);
    
            // Return a promise that resolves when file writing is complete
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log('Jar file downloaded successfully.');
                    resolve();
                });
    
                writer.on('error', (err) => {
                    reject(new Error(`Failed to write jar file: ${err.message}`));
                });
            });
        } catch (err) {
            throw new Error(`Failed to download jar file: ${err.message}`);
        }
    }
    
    getVersionInfo(version) {
        // Charger les informations sur les versions depuis un fichier ou une source externe (comme un API)
        const versions = require('./versions.json');

        if(version) return versions.find(v => v.version === version);
        return versions
    }

    async getServersList() {
        const serverFolder = this.serverFolder;

        return new Promise((resolve, reject) => {
            fs.readdir(serverFolder, (err, files) => {
                if (err) {
                    reject(`Erreur lors de la lecture du dossier des serveurs : ${err}`);
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
                                    resolve(serverList);
                                }
                            });
                        } else {
                            serverList.push({ name: server, versions: [] });
                            if (serverList.length === files.length) {
                                resolve(serverList);
                            }
                        }
                    });
                });
            });
        });
    }

    sendCommand(serverName, command) {
        const minecraftProcess = this.minecraftProcesses.get(serverName);
        if (minecraftProcess) {
            minecraftProcess.stdin.write(command + '\n');
            res.send('Commande envoyée.');
        } else {
            res.status(404).send('Le serveur spécifié n\'est pas en cours d\'exécution.');
        }
    }
}

module.exports = MinecraftServer;
