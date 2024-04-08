class MinecraftServerClient {
    constructor() {
        this.selectServer = { name: "", versions: "" };
        this.socket = io('http://localhost:80');
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

        document.getElementById('add-button').addEventListener('click', () => {
            this.serverAddDiv(true)
            this.serverDiv(false)
        })
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

    serverAddDiv(state) {
        const content_add_server = document.getElementById('content-add-server')
        if (state) {
            content_add_server.style.display = "block";
        } else {
            content_add_server.style.display = "none";
        }
    }

    serverDiv(state) {
        const data_server = document.getElementById('data-server')
        if (state) {
            data_server.style.display = "block";
        } else {
            data_server.style.display = "none";
        }
    }
    
    async fetchVersions() {
        try {
            const response = await fetch('/minecraft/getVersionInfo');
            const versions = await response.json();
    
            const versionSelect = document.getElementById('version-select');
            versionSelect.innerHTML = ''; // Clear existing options
    
            versions.forEach(version => {
                const option = document.createElement('option');
                option.value = version.version;
                option.textContent = version.version;
                versionSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des versions :', error);
        }
    }    

    async createServer(serverName, selectedVersion) {
        if (serverName.trim() === '') {
            alert('Veuillez saisir un nom pour le serveur.');
            return;
        }
    
        const existingServers = Array.from(document.querySelectorAll('#servers li')).map(li => li.textContent.trim());
        if (existingServers.includes(serverName)) {
            alert(`Le serveur "${serverName}" existe déjà.`);
            return;
        }
        
        this.serverAddDiv(false)
    
        try {
            const response = await fetch(`/minecraft/addServer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    serverName,
                    serverVersion: selectedVersion
                })
            });
    
            if (!response.ok) {
                throw new Error('Une erreur s\'est produite lors de la création du serveur.');
            }
    
            console.log('Le serveur a été créé avec succès.');
            this.updateServerList(); // Update server list display after successful creation
        } catch (error) {
            console.error('Erreur lors de la création du serveur :', error);
        }
    }    

    async startServer() {
        try {
            const response = await fetch('/minecraft/startServer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    serverName: this.selectServer.name,
                    serverVersion: this.selectServer.versions
                })
            });
    
            if (!response.ok) {
                throw new Error('Une erreur s\'est produite lors du démarrage du serveur.');
            }
    
            console.log('Le serveur a été démarré avec succès.');
        } catch (error) {
            console.error('Erreur :', error);
        }
    }
    

    async stopServer() {
        try {
            const response = await fetch('/minecraft/stopServer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    serverName: this.selectServer.name
                })
            });
    
            if (!response.ok) {
                throw new Error('Une erreur s\'est produite lors de l\'arrêt du serveur.');
            }
    
            console.log('Le serveur a été arrêté avec succès.');
        } catch (error) {
            console.error('Erreur :', error);
        }
    }
    

    async sendCommand() {
        const commandInput = document.getElementById("server-console");
        const command = commandInput.value.trim();
    
        if (command === '') {
            alert('Veuillez saisir une commande.');
            return;
        }
    
        try {
            const response = await fetch('/minecraft/sendCommand', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    serverName: this.selectServer.name,
                    command: command
                })
            });
    
            if (!response.ok) {
                throw new Error('Une erreur s\'est produite lors de l\'envoi de la commande.');
            }
    
            console.log('Commande envoyée avec succès.');
    
            // Optionally clear the command input after successful command execution
            commandInput.value = '';
        } catch (error) {
            console.error('Erreur :', error);
        }
    }
    
    updateServerList() {
        fetch('/minecraft/getServersList')
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
                        this.serverDiv(true)
                        this.serverAddDiv(false)
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