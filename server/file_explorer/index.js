const path = require('path');
const fs = require('fs').promises;

class FileExplorer {
    constructor(app, rootDirectory) {
        this.app = app;
        this.rootDirectory = rootDirectory;

        // Configurer les routes pour l'explorateur de fichiers
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.get('/file_explorer/*', async (req, res) => {
            const urlPath = req.params[0] || '';
            const { action } = req.params;
            const { content } = req.body;
            const parts = urlPath.split('/');
            const filePath = path.join(this.rootDirectory, parts.slice(1).join('/'));
    
            try {
                let message;
                
                switch (action) {
                    case 'files':
                        message = await this.handleGetFiles(filePath, urlPath);
                        break;
                    case 'file-content':
                        message = await this.handleGetFileContent(filePath);
                        break;
                    case 'download':
                        message = await this.handleDownloadFile(filePath);
                        break;
                    case 'save-file':
                        message = await this.handleSaveFile(content, filePath);
                        break;
                    default:
                        res.status(404).send('Action non supportée');
                        break;
                }
                
                console.log(message)
                res.send(message);
            } catch (err) {
                console.error('Erreur lors du traitement de la requête', err);
                res.status(500).send('Une erreur s\'est produite');
            }
        });
    }
    
    async handleGetFiles(directoryPath, requestedPath) {
        const files = await fs.readdir(directoryPath);
        const fileList = [];
    
        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const stats = await fs.stat(filePath);
    
            fileList.push({
                name: file,
                isDirectory: stats.isDirectory(),
                path: path.join(requestedPath, file)
            });
        }
    
        return fileList
    }
    
    async handleGetFileContent(filePath) {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return fileContent
    }
    
    async handleDownloadFile(filePath) {
        const fileStats = await fs.stat(filePath);
        if (!fileStats.isFile()) {
            return res.status(404).send('Le chemin spécifié ne correspond pas à un fichier');
        }
        res.download(filePath, path.basename(filePath));
    }
    
    async handleSaveFile(content, filePath) {
        console.log(content)
        const contentString = typeof content === 'string' ? content : JSON.stringify(content);
        
        await fs.writeFile(filePath, contentString, 'utf-8');
        return 'Contenu du fichier enregistré avec succès !'
    }
}

module.exports = FileExplorer;
