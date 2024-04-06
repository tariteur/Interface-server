const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3000;

const rootDirectory = path.join(__dirname, 'minecraft_server', 'survie');

// Middleware pour servir les fichiers statiques depuis le dossier public
app.use(express.static('src'));

// Redirection vers l'interface de l'explorateur de fichiers au démarrage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Route pour lister les fichiers du répertoire spécifié
app.get('/files/*', async (req, res) => {
  const requestedPath = req.params[0] || ''; // Récupère tout le chemin après '/files/'

  // Construit le chemin absolu à partir du chemin demandé
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
              path: path.join(requestedPath, file) // Utilise le chemin demandé pour construire le chemin complet
          });
      }

      res.json(fileList);
  } catch (err) {
      console.error('Erreur lors de la lecture du répertoire', err);
      res.status(500).send('Erreur de lecture du répertoire');
  }
});

// Route pour lire le contenu d'un fichier
app.get('/file-content/*', async (req, res) => {
  const filePath = path.join(rootDirectory, req.params[0]); // Construit le chemin absolu du fichier

  try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      res.send(fileContent); // Envoie le contenu du fichier au client
  } catch (err) {
      console.error('Erreur lors de la lecture du fichier', err);
      res.status(500).send('Erreur de lecture du fichier');
  }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
