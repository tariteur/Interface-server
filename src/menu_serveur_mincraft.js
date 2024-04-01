let selectServer = {name: "", versions: ""}

const socket = io('http://localhost:4000'); // Mettez votre URL correcte

socket.on('serverConsole', (data) => {
    console.log(data.output);
    const server_console_viewer = document.getElementById('server-console-viewer');
    const listItem = document.createElement('li');
    listItem.textContent = data.output;
    server_console_viewer.appendChild(listItem);
});

function createServer() {
    const serverNameNewInput = document.getElementById('server-name-new');
    const versionSelect = document.getElementById('version-select');
    const serverName = serverNameNewInput.value.trim();
    const selectedVersion = versionSelect.value;

    if (serverName === '') {
        alert('Veuillez saisir un nom pour le serveur.');
        return;
    }

    // Vérifier si le nom du serveur existe déjà
    const existingServers = Array.from(document.querySelectorAll('#servers li')).map(li => li.textContent.trim());
    if (existingServers.includes(serverName)) {
        alert(`Le serveur "${serverName}" existe déjà.`);
        return;
    }

    ServerDiv(false);

    // Télécharger le fichier JAR et créer le serveur
    fetch(`/add-server?serverName=${serverName}&version=${selectedVersion}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Une erreur s\'est produite lors du démarrage du serveur.');
            }
            console.log('Le serveur a été démarré avec succès.');
        })
        .catch(error => console.error('Erreur :', error));
}

function ServerDiv(state) {
    const content_add_server = document.getElementById('content-add-server');
    const add_button = document.getElementById('add-button');
    const data_server = document.getElementById('data-server');

    if (state) {
        content_add_server.style.display = "block";
        add_button.style.display = "none";
        data_server.style.direction = "none";
    } else {
        content_add_server.style.display = "none";
        add_button.style.display = "block";
    }
}

function dataServerDiv(state) {
    const data_server = document.getElementById('data-server');
    const content_add_server = document.getElementById('content-add-server');

    if (state) {
        data_server.style.display = "block";
        content_add_server.style.display = "none";
    } else {
        data_server.style.display = "none";
    }
}

// Récupérer les versions disponibles depuis le serveur Node.js et afficher sur la page
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

function startServer() {
    fetch(`/start?serverName=${selectServer.name}&versions=${selectServer.versions}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Une erreur s\'est produite lors du démarrage du serveur.');
            }
            console.log('Le serveur a été démarré avec succès.');
        })
        .catch(error => console.error('Erreur :', error));
}

function stopServer() {
    fetch(`/stop?serverName=${selectServer.name}&versions=${selectServer.versions}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Une erreur s\'est produite lors du démarrage du serveur.');
            }
            console.log('Le serveur a été démarré avec succès.');
        })
        .catch(error => console.error('Erreur :', error));
}

// Fonction pour mettre à jour la liste des serveurs affichés
function updateServerList() {
    fetch('/servers')
        .then(response => response.json())
        .then(servers => {
            const server_list = document.getElementById('server-list');
            const server_name = document.getElementById('server-name');
            server_list.innerHTML = ''; // Effacer la liste actuelle des serveurs
            servers.forEach(server => {
                const listItem = document.createElement('li');
                // Ajouter un événement de clic à chaque élément de la liste des serveurs
                listItem.textContent = `${server.name} : ${server.versions}`;
                listItem.addEventListener('click', () => {
                    dataServerDiv(true);
                    server_name.innerHTML = `${server.name} : ${server.versions}`;
                    selectServer = {name: server.name, versions: server.versions};
                });
                server_list.appendChild(listItem);
            });
        })
        .catch(error => console.error('Erreur :', error));
}

// Mettre à jour la liste des serveurs lors du chargement initial de la page
window.onload = updateServerList;