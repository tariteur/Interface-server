class FileExplorer {
    constructor(contentContainerId, backButtonId, popupMessageId) {
        this.contentContainer = document.getElementById(contentContainerId);
        this.backButton = document.getElementById(backButtonId);
        this.popupMessage = document.getElementById(popupMessageId);
        this.currentPath = '';

        this.backButton.addEventListener('click', this.navigateToParentDirectory.bind(this));
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();

            this.removeContextMenu();

            this.showContextMenu(event.clientX, event.clientY);
        });

        window.addEventListener('click', () => {
            this.removeContextMenu();
        });
        
        this.urlParams = new URLSearchParams(window.location.search);
        this.rootDirectory = this.urlParams.get('rootDirectory');
        this.loadFiles(this.rootDirectory);
    }

    async loadFiles(path = '') {
        try {
            const response = await fetch(`/file_explorer/files/${path}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Root-Directory': this.rootDirectory
                }
            });            
            if (!response.ok) {
                throw new Error('Réponse du serveur non valide');
            }

            const data = await response.json();

            this.currentPath = path;
            const breadcrumbs = this.getBreadcrumbsDisplayPath();
            this.renderBreadcrumbs(breadcrumbs);
            this.renderFileList(data);
            this.backButton.style.display = this.currentPath === this.rootDirectory ? 'none' : 'block';
        } catch (error) {
            console.error('Erreur lors du chargement des fichiers', error);
        }
    }

    getBreadcrumbsDisplayPath() {
        if (this.currentPath.startsWith(this.rootDirectory)) {
            // Extract the part of currentPath that comes after rootDirectory
            const displayPath = `${this.rootDirectory.match(/\/([^\/]+)\/?$/)[1]}/${this.currentPath.slice(this.rootDirectory.length).replace(/^\//, '')}`;
            return displayPath || 'error'
        }
        return 'error'
    }


    renderBreadcrumbs(breadcrumbs) {
        this.contentContainer.innerHTML = `<div class="breadcrumbs">${breadcrumbs}</div>`;
    }

    renderFileList(data) {
        const fileList = document.createElement('div');
        fileList.className = 'file-list';

        data.forEach(item => {
            const fileItem = this.createFileItem(item);
            fileList.appendChild(fileItem);
        });

        this.contentContainer.appendChild(fileList);
    }

    createFileItem(item) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
    
        const iconPath = item.isDirectory ? 'img/folder.png' : this.getIconPath(item.name);
        fileItem.innerHTML = `
            <img src="${iconPath}" alt="${item.name}">
            <span>${item.name}</span>
        `;
    
        fileItem.addEventListener('mouseenter', () => {
            if (!item.isDirectory) {
                const downloadButton = document.createElement('button');
                downloadButton.textContent = '⬇️';
                downloadButton.className = 'download-button';
    
                downloadButton.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    await this.downloadFile(item);
                });
    
                fileItem.appendChild(downloadButton);
            }
        });
    
        fileItem.addEventListener('mouseleave', () => {
            const downloadButton = fileItem.querySelector('.download-button');
            if (downloadButton) {
                fileItem.removeChild(downloadButton);
            }
        });
    
        fileItem.addEventListener('click', async () => {
            if (item.isDirectory) {
                await this.loadFiles(`${this.currentPath ? this.currentPath + '/' : ''}${item.name}`);
            } else {
                this.openFile(item);
            }
        });
    
        return fileItem;
    }
    
    
    async openFile(file) {
        const filePath = `${this.currentPath ? this.currentPath + '/' : ''}${file.name}`;
        try {
            const extension = this.getFileExtension(file.name).toLowerCase();
            if (!this.isSupported(extension)) {
                this.showPopup(`Can't open .${extension} files`);
                return;
            }

            const response = await fetch(`/file_explorer/file-content/${filePath}`);
            if (!response.ok) {
                throw new Error('Échec de la récupération du contenu du fichier');
            }

            const fileContent = await response.text();
            this.renderBreadcrumbs(filePath || 'unknown');
            this.renderFileContent(fileContent, filePath);
            this.backButton.style.display = filePath === '' ? 'none' : 'block';
        } catch (error) {
            console.error('Une erreur s\'est produite : ', error);
        }
    }

    async downloadFile(item) {
        if (item.isDirectory) {
            this.showPopup('Impossible de télécharger des dossier');
            return;
        }
        const filePath = `${this.currentPath ? this.currentPath + '/' : ''}${item.name}`;
        try {
            const response = await fetch(`/file_explorer/download/${filePath}`);
            if (!response.ok) {
                throw new Error('Échec du téléchargement du fichier');
            }
    
            // Convertir la réponse en blob et créer un lien de téléchargement
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.name;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Une erreur s\'est produite lors du téléchargement du fichier : ', error);
        }
    }
    

    renderFileContent(fileContent, filePath) {
        const textarea = document.createElement('textarea');
        textarea.className = 'textarea';
        textarea.value = fileContent;

        textarea.addEventListener('input', async () => {
            await this.saveFileContent(filePath, textarea.value);
        });

        this.contentContainer.appendChild(textarea);
    }

    async saveFileContent(filePath, content) {
        try {
            const response = await fetch('/file_explorer/save-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filePath: filePath,
                    content: content
                })
            });
    
            if (response.ok) {
                const responseData = await response.json();
                console.log('Réponse du serveur :', responseData);
            } else {
                console.error('Échec de la requête :', response.statusText);
            }
        } catch (error) {
            console.error('Erreur lors de la requête :', error);
        }
    }
    
    showContextMenu(clientX, clientY) {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = `${clientX}px`;
        contextMenu.style.top = `${clientY}px`;
        contextMenu.style.border = '1px solid black';
        contextMenu.style.padding = '5px';
        contextMenu.style.backgroundColor = 'white';

        const newFileOption = document.createElement('div');
        newFileOption.textContent = 'Nouveau Fichier';
        newFileOption.addEventListener('click', () => {
            this.handleNewFile();
            this.removeContextMenu();
        });
        contextMenu.appendChild(newFileOption);

        const newDirectoryOption = document.createElement('div');
        newDirectoryOption.textContent = 'Nouveau Dossier';
        newDirectoryOption.addEventListener('click', () => {
            this.handleNewDirectory();
            this.removeContextMenu();
        });
        contextMenu.appendChild(newDirectoryOption);

        document.body.appendChild(contextMenu);

        window.addEventListener('click', () => {
            this.removeContextMenu();
        }, { once: true });

        contextMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

    removeContextMenu() {
        const contextMenu = document.querySelector('.context-menu');
        if (contextMenu) {
            contextMenu.remove();
        }
    }

    // Gestionnaire de création d'un nouveau fichier
    async handleNewFile() {
        const newFileName = prompt('Nom du nouveau fichier :');
        if (newFileName) {
            const filePath = `${this.currentPath ? this.currentPath + '/' : ''}${newFileName}`;
            await this.createFile(filePath);
        }
    }

    // Gestionnaire de création d'un nouveau dossier
    async handleNewDirectory() {
        const newDirectoryName = prompt('Nom du nouveau dossier :');
        if (newDirectoryName) {
            const directoryPath = `${this.currentPath ? this.currentPath + '/' : ''}${newDirectoryName}`;
            await this.createDirectory(directoryPath);
        }
    }

    // Méthode pour créer un nouveau fichier
    async createFile(filePath) {
        console.log(filePath)
        try {
            // Envoi d'une requête POST au serveur pour créer le fichier
            const response = await fetch(`/file_explorer/create-file/${filePath}`, {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error('Erreur lors de la création du fichier');
            }
            const message = await response.text();
            this.showPopup(message);
            await this.loadFiles(this.currentPath); // Recharger les fichiers après la création du fichier
        } catch (error) {
            console.error('Erreur lors de la création du fichier', error);
            this.showPopup('Erreur lors de la création du fichier');
        }
    }

    // Méthode pour créer un nouveau répertoire
    async createDirectory(directoryPath) {
        try {
            // Envoi d'une requête POST au serveur pour créer le répertoire
            const response = await fetch(`/file_explorer/create-directory/${directoryPath}`, {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error('Erreur lors de la création du répertoire');
            }
            const message = await response.text();
            this.showPopup(message);
            await this.loadFiles(this.currentPath); // Recharger les fichiers après la création du répertoire
        } catch (error) {
            console.error('Erreur lors de la création du répertoire', error);
            this.showPopup('Erreur lors de la création du répertoire');
        }
    }

    getFileExtension(fileName) {
        return fileName.split('.').pop();
    }

    isSupported(extension) {
        return ['json', 'txt', 'properties', 'log'].includes(extension);
    }

    showPopup(message) {
        this.popupMessage.textContent = message;
        this.popupMessage.style.display = 'block';
        setTimeout(() => {
            this.popupMessage.style.display = 'none';
        }, 3000);
    }

    getIconPath(fileName) {
        const extension = this.getFileExtension(fileName).toLowerCase();
        const iconMap = {
            'js': 'img/file-js.png',
            'json': 'img/file-json.png',
            'txt': 'img/file.png',
            'properties': 'img/file-setting.png',
            'log': 'img/file-log.png',
            'gz': 'img/file-compress.png',
            'jar': 'img/file-jar.png'
        };
        return iconMap[extension] || 'img/file.png'; // Icône de fichier par défaut
    }

    navigateToParentDirectory() {
        if (this.currentPath === this.rootDirectory) {
            return this.loadFiles(this.currentPath);
        }

        const parentPath = this.currentPath.split('/').slice(0, -1).join('/');
        if (parentPath.startsWith(this.rootDirectory)) {
            this.loadFiles(parentPath);
        }
    }
}

// Utilisation de la classe FileExplorer
document.addEventListener('DOMContentLoaded', () => {
    const fileExplorer = new FileExplorer('contentContainer', 'backButton', 'popupMessage');
});
