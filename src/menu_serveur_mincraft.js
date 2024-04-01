function createServer() {
    const serverNameInput = document.getElementById('server-name');
    const versionSelect = document.getElementById('version-select');
    const serverName = serverNameInput.value.trim();
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

    if (state) {
        content_add_server.style.display = "block";
        add_button.style.display = "none";
    } else {
        content_add_server.style.display = "none";
        add_button.style.display = "block";
    }
}

function removeServerDiv() {
    const content_add_server = document.getElementById('content-add-server');
    const add_button = document.getElementById('add-button');

    content_add_server.style.display = "none";
    add_button.style.display = "block";
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

function startServer(serverName, versions) {
    fetch(`/start?serverName=${serverName}&versions=${versions}`)
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
            const serverList = document.getElementById('server-list');
            serverList.innerHTML = ''; // Effacer la liste actuelle des serveurs
            servers.forEach(server => {
                const listItem = document.createElement('li');
                // Ajouter un événement de clic à chaque élément de la liste des serveurs
                listItem.textContent = `${server.name} : ${server.versions}`;
                listItem.addEventListener('click', () => {
                    startServer(server.name, server.versions);
                });
                serverList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Erreur :', error));
}

// Mettre à jour la liste des serveurs lors du chargement initial de la page
window.onload = updateServerList;