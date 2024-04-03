class MinecraftServerClient {
    constructor() {
        this.selectServer = { name: "", versions: "" };
        this.socket = io('http://localhost:4000');
        this.setupSocketListeners();
        this.setupEventListeners();
        this.fetchVersions();
        this.updateServerList();
    }

    setupSocketListeners() {
        this.socket.on('serverConsole', (data) => {
            const serverConsoleViewer = document.getElementById('server-console-viewer');
            const listItem = document.createElement('li');
            listItem.textContent = data.output;
            serverConsoleViewer.appendChild(listItem);
        });
    }

    setupEventListeners() {
        const serverNameNewInput = document.getElementById('server-name-new');
        const versionSelect = document.getElementById('version-select');

        document.getElementById('create-server-button').addEventListener('click', () => {
            this.createServer(serverNameNewInput.value.trim(), versionSelect.value);
        });

        document.getElementById('start-server-button').addEventListener('click', () => {
            this.startServer();
        });

        document.getElementById('stop-server-button').addEventListener('click', () => {
            this.stopServer();
        });

        document.getElementById('send-command-button').addEventListener('click', () => {
            this.sendCommand();
        });

        document.getElementById('server-console').addEventListener('keypress', (event) => {
            if (event.key === "Enter") {
                this.sendCommand();
            }
        });
    }

    fetchVersions() {
        fetch('/versions')
            .then(response => response.json())
            .then(versions => {
                const versionSelect = document.getElementById('version-select');
                versions.forEach(version => {
                    const option = document.createElement('option');
                    option.value = version.version;
                    option.textContent = version.version;
                    versionSelect.appendChild(option);
                });
            })
            .catch(error => console.error('Erreur :', error));
    }

    createServer(serverName, selectedVersion) {
        if (serverName === '') {
            alert('Veuillez saisir un nom pour le serveur.');
            return;
        }

        const existingServers = Array.from(document.querySelectorAll('#servers li')).map(li => li.textContent.trim());
        if (existingServers.includes(serverName)) {
            alert(`Le serveur "${serverName}" existe déjà.`);
            return;
        }

        fetch(`/add-server?serverName=${serverName}&version=${selectedVersion}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Une erreur s\'est produite lors du démarrage du serveur.');
                }
                console.log('Le serveur a été démarré avec succès.');
                this.updateServerList();
            })
            .catch(error => console.error('Erreur :', error));
    }

    startServer() {
        fetch(`/start?serverName=${this.selectServer.name}&versions=${this.selectServer.versions}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Une erreur s\'est produite lors du démarrage du serveur.');
                }
                console.log('Le serveur a été démarré avec succès.');
            })
            .catch(error => console.error('Erreur :', error));
    }

    stopServer() {
        fetch(`/stop?serverName=${this.selectServer.name}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Une erreur s\'est produite lors de l\'arrêt du serveur.');
                }
                console.log('Le serveur a été arrêté avec succès.');
            })
            .catch(error => console.error('Erreur :', error));
    }

    sendCommand() {
        const command = document.getElementById("server-console").value.trim();
        if (command === '') {
            alert('Veuillez saisir une commande.');
            return;
        }

        fetch(`/send-command?serverName=${this.selectServer.name}&command=${command}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Une erreur s\'est produite lors de l\'envoi de la commande.');
                }
                console.log('Commande envoyée avec succès.');
            })
            .catch(error => console.error('Erreur :', error));
    }

    updateServerList() {
        fetch('/servers')
            .then(response => response.json())
            .then(servers => {
                const serverList = document.getElementById('server-list');
                serverList.innerHTML = '';
                servers.forEach(server => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${server.name} : ${server.versions}`;
                    listItem.addEventListener('click', () => {
                        this.selectServer = { name: server.name, versions: server.versions };
                        document.getElementById('server-name').textContent = `${server.name} : ${server.versions}`;
                        document.getElementById('data-server').style.display = "block";
                        document.getElementById('content-add-server').style.display = "none";
                    });
                    serverList.appendChild(listItem);
                });
            })
            .catch(error => console.error('Erreur :', error));
    }
}

window.onload = () => {
    const minecraftClient = new MinecraftServerClient();
};