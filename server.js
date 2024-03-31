// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src')));

// Lire les versions disponibles à partir du fichier JSON
const versions = require('./versions.json');

// Route pour envoyer les versions disponibles
app.get('/versions', (req, res) => {
    res.json(versions);
});

// Télécharger le fichier JAR de la version spécifiée
// Télécharger tous les fichiers nécessaires pour le serveur Minecraft
async function downloadJar(serverName, version) {
    const versionInfo = versions.find(v => v.version === version);
    if (!versionInfo) {
        throw new Error(`La version ${version} n'est pas disponible.`);
    }

    const serverFolder = `Minecraft_Server/${serverName}`;
    if (!fs.existsSync(serverFolder)) {
        fs.mkdirSync(serverFolder, { recursive: true }); // Créez le dossier récursivement si nécessaire
    }

    // Télécharger le fichier JAR
    const jarUrl = versionInfo.url;
    const jarResponse = await axios({
        url: jarUrl,
        method: 'GET',
        responseType: 'stream',
    });
    const jarFilePath = path.join(serverFolder, `minecraft_server.${version}.jar`);
    jarResponse.data.pipe(fs.createWriteStream(jarFilePath));

    return new Promise((resolve, reject) => {
        jarResponse.data.on('end', () => {
            resolve();
        });
        jarResponse.data.on('error', (err) => {
            reject(err);
        });
    });
}


// Créer et démarrer un serveur Minecraft
app.get('/add-server', async (req, res) => {
    const { serverName, version } = req.query;

    // Télécharger le fichier JAR
    try {
        await downloadJar(serverName, version);
        console.log(`Fichier JAR de la version ${version} téléchargé avec succès pour le serveur ${serverName}.`);
    } catch (error) {
        console.error(`Erreur lors du téléchargement du fichier JAR : ${error.message}`);
        res.status(500).send(`Une erreur est survenue lors du téléchargement du fichier JAR : ${error.message}`);
        return;
    }

    const command = `java -jar minecraft_server.${version}.jar`;
    const file_path = `minecraft_server/${serverName}`
    
    exec(command, { cwd: file_path }, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Erreur lors de l'exécution de la commande : ${error}`);
            return;
        }
        console.log(`Sortie de la commande : ${stdout}`);
        console.error(`Erreurs de la commande : ${stderr}`);
    
        // Attendre que le fichier eula.txt soit disponible
        const eulaFilePath = `${file_path}/eula.txt`;
        let eulaContent = '';
        while (!fs.existsSync(eulaFilePath)) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Attendre 1 seconde
        }
    
        // Modifier eula.txt pour mettre eula=true
        try {
            eulaContent = fs.readFileSync(eulaFilePath, 'utf8');
            eulaContent = eulaContent.replace('eula=false', 'eula=true');
            fs.writeFileSync(eulaFilePath, eulaContent);
            console.log("Le fichier eula.txt a été modifié avec succès.");
        } catch (err) {
            console.error(`Erreur lors de la modification du fichier eula.txt : ${err}`);
        }
    });

});

app.listen(port, () => {
    console.log(`Serveur web démarré sur http://localhost:${port}`);
});
