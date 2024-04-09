class FileExplorer {
    constructor(contentContainerId, backButtonId, popupMessageId) {
        this.contentContainer = document.getElementById(contentContainerId);
        this.backButton = document.getElementById(backButtonId);
        this.popupMessage = document.getElementById(popupMessageId);
        this.currentPath = '';

        this.backButton.addEventListener('click', this.navigateToParentDirectory.bind(this));

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
    
        // Ajouter une icône et un nom de fichier
        const iconPath = item.isDirectory ? 'img/folder.png' : this.getIconPath(item.name);
        fileItem.innerHTML = `
            <img src="${iconPath}" alt="${item.name}">
            <span>${item.name}</span>
        `;
    
        // Ajouter un bouton de téléchargement
        const downloadButton = document.createElement('button');
        downloadButton.textContent = '⬇️'; // Icône de flèche vers le bas
        downloadButton.className = 'download-button';
    
        downloadButton.addEventListener('click', async (event) => {
            event.stopPropagation(); // Arrêter la propagation pour éviter de déclencher le clic de l'élément parent
            await this.downloadFile(item);
        });
    
        fileItem.appendChild(downloadButton);
    
        // Ajouter un gestionnaire d'événements pour le clic sur l'élément de fichier
        fileItem.addEventListener('click', async () => {
            if (item.isDirectory) {
                await this.loadFiles(`${this.currentPath ? this.currentPath + '/' : ''}${item.name}`);
            } else {
                this.openFile(item);
            }
        });
    
        // Marquer les fichiers non pris en charge
        if (!item.isDirectory) {
            const fileExtension = this.getFileExtension(item.name);
            if (!this.isSupported(fileExtension)) {
                fileItem.classList.add('unsupported');
            }
        }
    
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
            await fetch(`/file_explorer/save-file/${filePath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: content
            });
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du fichier', error);
        }
    }

    async downloadFile(item) {
        const filePath = `${this.currentPath ? this.currentPath + '/' : ''}${item.name}`;
        try {
            const response = await fetch(`/file_explorer/download/${filePath}`);
            if (!response.ok) {
                throw new Error('Échec du téléchargement du fichier');
            }
    
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
            this.showPopup('Erreur lors du téléchargement du fichier');
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
