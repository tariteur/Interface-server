document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('contentContainer');
    const backButton = document.getElementById('backButton');
    const popupMessage = document.getElementById('popupMessage');
    let currentPath = '';

    const loadFiles = async (path = '') => {
        try {
            const response = await fetch(`/file_explorer/files/${path}`);
            if (!response.ok) {
                throw new Error('Réponse du serveur non valide');
            }

            const data = await response.json();

            currentPath = path;
            const breadcrumbs = path ? path : 'Racine';
            renderBreadcrumbs(breadcrumbs);
            renderFileList(data);
            backButton.style.display = currentPath === '' ? 'none' : 'block';
        } catch (error) {
            console.error('Erreur lors du chargement des fichiers', error);
        }
    };

    const renderBreadcrumbs = (breadcrumbs) => {
        contentContainer.innerHTML = `<div class="breadcrumbs">${breadcrumbs}</div>`;
    };

    const renderFileList = (data) => {
        const fileList = document.createElement('div');
        fileList.className = 'file-list';

        data.forEach(item => {
            const fileItem = createFileItem(item);
            fileList.appendChild(fileItem);
        });

        contentContainer.appendChild(fileList);
    };

    const createFileItem = (item) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        const iconPath = item.isDirectory ? 'img/folder.png' : getIconPath(item.name);

        fileItem.innerHTML = `
            <img src="${iconPath}" alt="${item.name}">
            <span>${item.name}</span>
        `;

        if (!item.isDirectory) {
            const fileExtension = getFileExtension(item.name);
            if (!isSupported(fileExtension)) {
                fileItem.classList.add('unsupported');
            }
        }

        fileItem.addEventListener('click', async () => {
            if (item.isDirectory) {
                await loadFiles(`${currentPath ? currentPath + '/' : ''}${item.name}`);
            } else {
                openFile(item);
            }
        });

        return fileItem;
    };

    const openFile = async (file) => {
        const filePath = `${currentPath ? currentPath + '/' : ''}${file.name}`;
        try {
            const extension = getFileExtension(file.name).toLowerCase();
            if (!isSupported(extension)) {
                showPopup(`Can't open .${extension} files`);
                return;
            }

            const response = await fetch(`/file_explorer/file-content/${filePath}`);
            if (!response.ok) {
                throw new Error('Échec de la récupération du contenu du fichier');
            }

            const fileContent = await response.text();
            renderBreadcrumbs(filePath || 'unknown');
            renderFileContent(fileContent, filePath);
            backButton.style.display = filePath === '' ? 'none' : 'block';
        } catch (error) {
            console.error('Une erreur s\'est produite : ', error);
        }
    };

    const renderFileContent = (fileContent, filePath) => {
        const textarea = document.createElement('textarea');
        textarea.className = 'textarea';
        textarea.value = fileContent;

        textarea.addEventListener('input', async () => {
            await saveFileContent(filePath, textarea.value);
        });

        contentContainer.appendChild(textarea);
    };

    const saveFileContent = async (filePath, content) => {
        try {
            await fetch(`/file_explorer/save-file/${filePath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: content
            });
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du fichier', error);
        }
    };

    const getFileExtension = (fileName) => fileName.split('.').pop();

    const isSupported = (extension) => ['json', 'txt', 'properties', 'log'].includes(extension);

    const showPopup = (message) => {
        popupMessage.textContent = message;
        popupMessage.style.display = 'block';
        setTimeout(() => {
            popupMessage.style.display = 'none';
        }, 3000);
    };

    const getIconPath = (fileName) => {
        const extension = getFileExtension(fileName).toLowerCase();
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
    };

    const navigateToParentDirectory = () => {
        const parentPath = currentPath.split('/').slice(0, -1).join('/');
        loadFiles(parentPath);
    };

    backButton.addEventListener('click', navigateToParentDirectory);
    loadFiles(); // Chargement initial des fichiers
});
