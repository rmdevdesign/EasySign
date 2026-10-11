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
2. Ajouter du texte, modifier son contenu, sa police, sa taille et son interligne.
3. Importer une signature PNG transparente. Déplacer les éléments au doigt ou à la souris ; tirer la poignée du coin pour ajuster leur taille.
   Les outils flottent en bas de l’écran. Sélectionner ou déplacer un élément laisse le PDF dégagé ; « Modifier » ouvre ses réglages. L’ajout d’un texte ouvre directement la saisie. « Terminé » ou un toucher hors du panneau le referme. Les textes laissés vides disparaissent.
4. Utiliser les flèches pour changer de page. « et » vont directement à la première ou à la dernière page. Les ajouts de toutes les pages sont exportés.
5. Télécharger le PDF. Sur iOS, utiliser le menu Partager puis Enregistrer dans Fichiers si le PDF s’ouvre dans un aperçu.

Les trois polices disponibles sont intégrées au PDF. Les textes utilisent les caractères latins pris en charge par les polices standard (pas d’emoji). Les PDF chiffrés ne sont pas pris en charge. L’ajout est une signature visuelle, pas une signature numérique certifiée. Les modifications ne sont pas sauvegardées après fermeture de l’onglet. Les polices de l’interface utilisent Google Fonts avec des polices de repli locales ; aucun document ne leur est transmis.

L’interface est responsive et utilise Pointer Events pour les gestes tactiles. Une validation sur appareils iOS réels reste nécessaire.

Le PDF utilise la largeur disponible. Le zoom de 50 à 300 % se règle avec +/− ou le pincement à deux doigts sur le document. Sur ordinateur, Ctrl/Cmd + molette zoome autour du pointeur. « Ajuster » revient à la largeur de l’écran. Le zoom ne modifie pas les coordonnées exportées. À fort zoom, faire défiler le document pour se déplacer.

Sur mobile, le zoom natif de la page par pincement est désactivé : seul le PDF zoome. Le défilement au doigt reste actif. Les gestes Safari sont interceptés en complément de `touch-action` et du viewport ; certains réglages d’accessibilité du navigateur peuvent prendre priorité.
