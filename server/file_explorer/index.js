const path = require('path');
const fs = require('fs').promises;

class FileExplorer {
    constructor(app, rootDirectory) {
        this.app = app;
        this.rootDirectory = rootDirectory;

        this.setupRoutes();
    }

    setupRoutes() {
        const app = this.app;
        const rootDirectory = this.rootDirectory;

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

        app.get('/file_explorer/download/*', async (req, res) => {
            const filePath = path.join(rootDirectory, req.params[0]);

            try {
                const fileStats = await fs.stat(filePath);
                if (!fileStats.isFile()) {
                    return res.status(404).send('Le chemin spécifié ne correspond pas à un fichier');
                }

                res.download(filePath, path.basename(filePath));
            } catch (err) {
                console.error('Erreur lors de la lecture du fichier', err);
                res.status(500).send('Erreur de lecture du fichier');
            }
        });

        app.post('/file_explorer/save-file', async (req, res) => {
            const filePath = path.join(rootDirectory, req.body.filePath);

            const content = req.body.content;
            console.log(content)
            try {
                // Écrire le contenu dans le fichier
                await fs.writeFile(filePath, content, 'utf-8');
        
                // Envoyer une réponse de succès
                res.status(200).json({ message: 'Contenu du fichier enregistré avec succès !' });
            } catch (error) {
                console.error('Erreur lors de l\'enregistrement du fichier :', error);
                res.status(500).json({ error: 'Erreur lors de l\'enregistrement du fichier' });
            }
        });
        

        app.post('/file_explorer/create-directory/*', async (req, res) => {
            const newDirectoryPath = path.join(rootDirectory, req.params[0]);
        
            try {
                await fs.mkdir(newDirectoryPath);
                res.send('Répertoire créé avec succès !');
            } catch (err) {
                console.error('Erreur lors de la création du répertoire', err);
                res.status(500).send('Erreur lors de la création du répertoire');
            }
        });

        app.post('/file_explorer/create-file/:filename', async (req, res) => {
            const { filename } = req.params;
            console.log(filename)
            const newFilePath = path.join(rootDirectory, filename);
        
            try {
                // Vérifiez si le fichier contient une extension
                const fileExtension = path.extname(filename);
                if (!fileExtension) {
                    throw new Error('Extension de fichier manquante');
                }
        
                // Créez le fichier vide dans le répertoire spécifié
                await fs.writeFile(newFilePath, '');
        
                res.send('Fichier créé avec succès !');
            } catch (err) {
                console.error('Erreur lors de la création du fichier', err);
                res.status(500).send('Erreur lors de la création du fichier');
            }
        });

        app.delete('/file_explorer/delete/*', async (req, res) => {
            const filePath = path.join(rootDirectory, req.params[0]);
        
            try {
                await fs.unlink(filePath);
                res.send('Fichier supprimé avec succès !');
            } catch (err) {
                console.error('Erreur lors de la suppression du fichier', err);
                res.status(500).send('Erreur lors de la suppression du fichier');
            }
        });
        
    }
}

module.exports = FileExplorer;