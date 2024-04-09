class FileExplorer {
    constructor(app, rootDirectory) {
        this.app = app;
        this.rootDirectory = rootDirectory;

        // Configurer les routes pour l'explorateur de fichiers
        this.setupRoutes();
    }

    setupRoutes() {
        const app = this.app;
        const rootDirectory = this.rootDirectory;

        // Route principale de l'explorateur de fichiers
        app.all('/file_explorer/:action(/*)?', async (req, res) => {
            const { action } = req.params;
            const requestedPath = req.params[0] || '';

            switch (action) {
                case 'files':
                    await this.listFiles(res, requestedPath);
                    break;
                case 'file-content':
                    await this.readFileContent(res, requestedPath);
                    break;
                case 'download':
                    await this.downloadFile(res, requestedPath);
                    break;
                case 'save-file':
                    await this.saveFile(req, res, requestedPath);
                    break;
                default:
                    res.status(404).send('Action non prise en charge');
            }
        });
    }

    async listFiles(res, requestedPath) {
        const directoryPath = path.join(this.rootDirectory, requestedPath);

        try {
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

            res.json(fileList);
        } catch (err) {
            console.error('Erreur lors de la lecture du répertoire', err);
            res.status(500).send('Erreur de lecture du répertoire');
        }
    }

    async readFileContent(res, requestedPath) {
        const filePath = path.join(this.rootDirectory, requestedPath);

        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            res.send(fileContent);
        } catch (err) {
            console.error('Erreur lors de la lecture du fichier', err);
            res.status(500).send('Erreur de lecture du fichier');
        }
    }

    async downloadFile(res, requestedPath) {
        const filePath = path.join(this.rootDirectory, requestedPath);

        try {
            const fileStats = await fs.stat(filePath);
            if (!fileStats.isFile()) {
                return res.status(404).send('Le chemin spécifié ne correspond pas à un fichier');
            }

            // Envoi du fichier au client
            res.download(filePath, path.basename(filePath));
        } catch (err) {
            console.error('Erreur lors de la lecture du fichier', err);
            res.status(500).send('Erreur de lecture du fichier');
        }
    }

    async saveFile(req, res, requestedPath) {
        const filePath = path.join(this.rootDirectory, requestedPath);
        const content = req.body; // Assurez-vous que req.body contient le contenu à enregistrer

        try {
            // Convertir le contenu en chaîne de caractères si nécessaire
            const contentString = typeof content === 'string' ? content : JSON.stringify(content);

            await fs.writeFile(filePath, contentString, 'utf-8');
            res.send('Contenu du fichier enregistré avec succès !');
        } catch (err) {
            console.error('Erreur lors de l\'enregistrement du fichier', err);
            res.status(500).send('Erreur lors de l\'enregistrement du fichier');
        }
    }
}

module.exports = FileExplorer;
