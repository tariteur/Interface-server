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
        const app = this.app;
        const rootDirectory = this.rootDirectory;

        // Route pour lister les fichiers dans un répertoire
        app.get('/file_explorer/files/*', async (req, res) => {
            const requestedPath = req.params[0] || '';
            const directoryPath = path.join(rootDirectory, requestedPath);
          
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
        });

        // Route pour lire le contenu d'un fichier
        app.get('/file_explorer/file-content/*', async (req, res) => {
            const filePath = path.join(rootDirectory, req.params[0]);
          
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                res.send(fileContent);
            } catch (err) {
                console.error('Erreur lors de la lecture du fichier', err);
                res.status(500).send('Erreur de lecture du fichier');
            }
        });

        // Route pour télécharger un fichier
        app.get('/file_explorer/download/*', async (req, res) => {
            const filePath = path.join(rootDirectory, req.params[0]);
          
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
        });

        // Route pour enregistrer le contenu dans un fichier
        app.post('/file_explorer/save-file/*', async (req, res) => {
            const filePath = path.join(rootDirectory, req.params[0]);
            const content = req.body; // Assurez-vous que req.body contient le contenu à enregistrer
            console.log(content)
            try {
                // Convertir le contenu en chaîne de caractères si nécessaire
                const contentString = typeof content === 'string' ? content : JSON.stringify(content);

                await fs.writeFile(filePath, contentString, 'utf-8');
                res.send('Contenu du fichier enregistré avec succès !');
            } catch (err) {
                console.error('Erreur lors de l\'enregistrement du fichier', err);
                res.status(500).send('Erreur lors de l\'enregistrement du fichier');
            }
        });
    }
}

module.exports = FileExplorer;
