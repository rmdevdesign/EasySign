# Easy Sign

Application statique en français pour remplir et signer des PDF. Les documents et signatures restent en mémoire dans le navigateur, sans backend ni téléversement.

## Démarrer

```sh
npm install
npm run dev
```

Ouvrir l’adresse affichée par Vite. Pour essayer sur un iPhone ou un iPad connecté au même Wi-Fi, utiliser l’adresse réseau affichée (le pare-feu doit autoriser le serveur).

```sh
npm test
npm run build
```

Le dossier `dist/` peut être hébergé sur un hébergement statique HTTPS.

## GitHub Pages

Le chemin Vite est configuré pour `https://rmdevdesign.github.io/EasySign/`.
Dans le dépôt GitHub, choisir **Settings → Pages → Source → GitHub Actions**.
Le workflow `.github/workflows/deploy.yml` teste, compile et publie `dist/` à chaque push sur `main`.
La racine du dépôt contient les sources de développement et ne doit pas être servie directement par Pages.
Le serveur local est accessible à `http://localhost:5173/EasySign/`.

## Utilisation

1. Choisir un PDF ou ouvrir la démonstration.
2. Ajouter du texte et écrire directement dans son cadre sur le PDF. Toucher ailleurs termine la saisie ; « Écrire » permet de reprendre. Déplacer la zone et tirer sa poignée verte pour ajuster sa taille. La police et l’interligne sont fixes.
3. Importer une signature PNG, JPG ou WebP : elle apparaît directement sur le PDF, nettoyée et recadrée. La petite barre « Retirer le fond / Nettoyage » permet d’ajuster le résultat sur le document. Les PNG déjà transparents gardent leur transparence par défaut. Déplacer les éléments au doigt ou à la souris ; tirer la poignée du coin pour ajuster leur taille.
   Les outils flottent en bas de l’écran. Aucun panneau de modification : le texte et la signature se prévisualisent directement dans le document. Les textes laissés vides disparaissent.
4. Ouvrir **Menu** (ou toucher le numéro de page) pour accéder à la navigation et au zoom. « et » vont directement à la première ou à la dernière page. Les ajouts de toutes les pages sont exportés.
5. Télécharger le PDF. Sur iOS, utiliser le menu Partager puis Enregistrer dans Fichiers si le PDF s’ouvre dans un aperçu.

La police du texte est intégrée au PDF. Les textes utilisent les caractères latins pris en charge par les polices standard (pas d’emoji). Les PDF chiffrés ne sont pas pris en charge. L’ajout est une signature visuelle, pas une signature numérique certifiée. Les modifications ne sont pas sauvegardées après fermeture de l’onglet. Les polices de l’interface utilisent Google Fonts avec des polices de repli locales ; aucun document ne leur est transmis.

Le nettoyage des signatures est un traitement local des pixels clairs, adapté à l’encre sombre ou colorée sur papier blanc ou clair. Il ne reconnaît pas sémantiquement une signature et ne sépare pas les autres textes présents dans une photo. Les ombres fortes et les fonds complexes peuvent nécessiter un recadrage préalable. Les images sont réduites à 1600 pixels sur leur plus grand côté pour limiter la mémoire sur mobile, puis converties en PNG transparent pour l’export PDF.

L’interface est responsive et utilise Pointer Events pour les gestes tactiles. Une validation sur appareils iOS réels reste nécessaire.

Le PDF utilise la largeur disponible. Le zoom de 50 à 300 % se règle avec +/− ou le pincement à deux doigts sur le document. Sur ordinateur, Ctrl/Cmd + molette zoome autour du pointeur. « Ajuster » revient à la largeur de l’écran. Le zoom ne modifie pas les coordonnées exportées. À fort zoom, faire défiler le document pour se déplacer.

Sur mobile, le zoom natif de la page par pincement est désactivé : seul le PDF zoome. Le défilement au doigt reste actif. Les gestes Safari sont interceptés en complément de `touch-action` et du viewport ; certains réglages d’accessibilité du navigateur peuvent prendre priorité.
