/* Festival Bio Guera 2026 — contenu éditable.
   Tout ce qui change d'ici au 18 décembre se modifie ICI, pas dans le HTML. */

window.FBG = {
  /* Heure de Porto-Novo = UTC+1 (WAT) */
  kickoff: '2026-12-18T09:00:00+01:00',
  showtime: '2026-12-18T17:00:00+01:00',

  /* ---------- Billetterie (paiement Chariow, billets = licences) ----------
     api  : URL de l'API billetterie (dossier billetterie-api/, sur le VPS), ex. 'https://billetterie.mondomaine.com'.
            Vide = vente fermée : le bouton affiche « ouverture prochaine ».
     site : adresse publique du site, encodée dans le QR des billets.
     categories : affichage seulement. Le prix réellement payé est celui du produit Chariow
            (lié à chaque catégorie dans worker/wrangler.toml → TIERS). Les garder identiques.
     jusqua : fin de vente sur le site (à reporter aussi dans STANDARD_UNTIL côté API).
     avantages : ce que la catégorie inclut, affiché sous le prix (vide = rien affiché). */
  billetterie: {
    api: '',
    site: 'https://slvys21.github.io/BioGueraFestival',
    categories: [
      { id: 'standard', nom: 'Standard', prix: 1000, note: 'Prévente jusqu’au 10 décembre', jusqua: '2026-12-10T23:59:59+01:00', avantages: [] },
      { id: 'premium', nom: 'Premium', prix: 5000, note: 'Prix unique', avantages: [] },
      { id: 'vip', nom: 'VIP', prix: 10000, note: 'Prix unique', avantages: [] },
    ],
    pays: [
      { code: 'BJ', nom: 'Bénin', ind: '+229', ex: '01 97 00 00 00' },
      { code: 'TG', nom: 'Togo', ind: '+228', ex: '90 00 00 00' },
      { code: 'NG', nom: 'Nigeria', ind: '+234', ex: '803 000 0000' },
      { code: 'CI', nom: 'Côte d’Ivoire', ind: '+225', ex: '07 00 00 00 00' },
      { code: 'BF', nom: 'Burkina Faso', ind: '+226', ex: '70 00 00 00' },
      { code: 'NE', nom: 'Niger', ind: '+227', ex: '90 00 00 00' },
      { code: 'SN', nom: 'Sénégal', ind: '+221', ex: '77 000 00 00' },
      { code: 'FR', nom: 'France', ind: '+33', ex: '6 00 00 00 00' },
    ],
  },

  /* ---------- Planche du match ----------
     provisoire:true affiche le bandeau « Compositions provisoires ».
     x / y : position sur le demi-terrain, en % (x = 0 ligne de but, 100 ligne médiane ; y = 0 haut, 100 bas). */
  match: {
    provisoire: true,
    lieu: 'Terrain du CEG Dowa',
    ville: 'Porto-Novo',
    home: {
      id: 'guera', nom: 'Team Bio Guera', court: 'TBG', schema: '4-3-3',
      crest: 'https://res.cloudinary.com/emkqaupn/image/upload/f_auto,q_auto,c_limit,w_120/festival-bio-guera/crest-guera', coach: 'Coach : Rodrigue Sabi',
      joueurs: [
        { n: 1,  nom: 'S. Gounou',     poste: 'GB', x: 6,  y: 50 },
        { n: 2,  nom: 'K. Orou',       poste: 'DD', x: 26, y: 86 },
        { n: 4,  nom: 'B. Yérima',     poste: 'DC', x: 22, y: 62, cap: true },
        { n: 5,  nom: 'A. Chabi',      poste: 'DC', x: 22, y: 38 },
        { n: 3,  nom: 'I. Bagnan',     poste: 'DG', x: 26, y: 14 },
        { n: 6,  nom: 'M. Worou',      poste: 'MDC', x: 48, y: 50 },
        { n: 8,  nom: 'D. Kora',       poste: 'MC', x: 58, y: 72 },
        { n: 10, nom: 'F. Bio Tchané', poste: 'MO', x: 58, y: 28 },
        { n: 7,  nom: 'S. Sanni',      poste: 'AD', x: 82, y: 84 },
        { n: 9,  nom: 'G. Zimé',       poste: 'BU', x: 88, y: 50 },
        { n: 11, nom: 'N. Bouraïma',   poste: 'AG', x: 82, y: 16 },
      ],
    },
    away: {
      id: 'behanzin', nom: 'Team Béhanzin', court: 'TBH', schema: '4-4-2',
      crest: 'https://res.cloudinary.com/emkqaupn/image/upload/f_auto,q_auto,c_limit,w_120/festival-bio-guera/crest-behanzin', coach: 'Coach : Euloge Houngbo',
      joueurs: [
        { n: 1,  nom: 'C. Agossou',   poste: 'GB', x: 6,  y: 50 },
        { n: 2,  nom: 'R. Dossou',    poste: 'DD', x: 26, y: 86 },
        { n: 5,  nom: 'J. Hounkpè',   poste: 'DC', x: 22, y: 62 },
        { n: 4,  nom: 'E. Tossou', poste: 'DC', x: 22, y: 38 },
        { n: 3,  nom: 'P. Zinsou',    poste: 'DG', x: 26, y: 14 },
        { n: 7,  nom: 'A. Kpadonou',  poste: 'MD', x: 56, y: 86 },
        { n: 6,  nom: 'L. Glèlè',     poste: 'MC', x: 50, y: 62, cap: true },
        { n: 8,  nom: 'T. Adjovi',    poste: 'MC', x: 50, y: 38 },
        { n: 11, nom: 'V. Sossa',     poste: 'MG', x: 56, y: 14 },
        { n: 9,  nom: 'H. Akplogan',  poste: 'BU', x: 84, y: 64 },
        { n: 10, nom: 'Y. Dah-Houessou', poste: 'BU', x: 84, y: 36 },
      ],
    },
  },

  /* ---------- Récit cartographié ----------
     focus : département ou commune à mettre en avant (id de benin-map.js)
     pins  : lieux [lon, lat] ; approx:true = position indicative
     zoom  : cadre [lonMin, latMin, lonMax, latMax] */
  etapes: [
    {
      annee: '1856', titre: 'Naissance à Gbaasi',
      texte: 'Bio Guéra naît à Gbaasi, au nord-ouest de Nikki, dans l’actuelle commune de Kalalé. Prince wassangari, il grandit dans l’aristocratie cavalière du Borgou, où le cheval et la lance disent le rang.',
      focus: ['kalale'], dep: 'borgou',
      zoom: [2.55, 9.55, 3.85, 10.75],
      pins: [{ id: 'gbaasi', label: 'Gbaasi', ll: [3.14, 10.15], approx: true }, { id: 'nikki', label: 'Nikki', ll: [3.21, 9.94], minor: true }],
    },
    {
      annee: 'Août 1897', titre: 'Aux côtés de Saka Yérima',
      texte: 'Quand les colonnes françaises remontent vers le nord, il prend les armes aux côtés de Saka Yérima. Premier combat, première leçon : le Borgou ne se rendra pas sans se battre.',
      dep: 'borgou',
      zoom: [2.2, 9.2, 3.9, 10.9],
      pins: [{ id: 'perere', label: 'Pèrèrè', ll: [2.99, 9.80] }, { id: 'gbaasi', label: 'Gbaasi', ll: [3.14, 10.15], approx: true, minor: true }],
    },
    {
      annee: '1915 – 1916', titre: 'Le refus',
      texte: 'L’Europe est en guerre, la France recrute des tirailleurs jusque dans le Borgou. À la conscription s’ajoutent l’impôt de capitation et le travail forcé. Bio Guéra refuse, et rallie à lui Wassangari, Baatombu, Peuls et Boo.',
      dep: 'borgou',
      zoom: [1.8, 8.6, 4.0, 11.6],
      chips: ['Conscription', 'Impôt de capitation', 'Travail forcé'],
      pins: [],
    },
    {
      annee: '1916', titre: 'Le siège de Bembèrèkè',
      texte: 'Ses cavaliers encerclent le poste colonial de Bembèrèkè. Ponts, routes et lignes télégraphiques sont coupés : l’administration coloniale vacille dans tout le nord.',
      focus: ['bembereke'], dep: 'borgou',
      zoom: [2.25, 9.85, 3.25, 10.75],
      pins: [{ id: 'bembereke', label: 'Bembèrèkè', ll: [2.665, 10.228] }],
    },
    {
      annee: '1916', titre: 'Baoura, la dernière ligne',
      texte: 'La guerre se déplace à Baoura, au nord de Bembèrèkè. Près d’un an de combats : la cavalerie tient tête à une armée mieux équipée, qui finit par le traquer.',
      focus: ['bembereke'], dep: 'borgou',
      zoom: [2.3, 9.95, 3.1, 10.65],
      route: ['bembereke', 'baoura'],
      pins: [{ id: 'bembereke', label: 'Bembèrèkè', ll: [2.665, 10.228], minor: true }, { id: 'baoura', label: 'Baoura', ll: [2.70, 10.40], approx: true }],
    },
    {
      annee: '17 déc. 1916', titre: 'Il tombe à Baoura',
      texte: 'Le 17 décembre 1916, Bio Guéra meurt à Baoura. Les circonstances exactes restent portées par les récits. Ce qui ne se discute pas : il n’a jamais cédé.',
      focus: ['bembereke'], dep: 'borgou', mourning: true,
      zoom: [2.3, 9.95, 3.1, 10.65],
      pins: [{ id: 'baoura', label: 'Baoura', ll: [2.70, 10.40], approx: true, cross: true }],
    },
    {
      annee: '1975', titre: 'Héros national',
      texte: 'Le Bénin le proclame héros national. À Cotonou, sur le rond-point de l’aéroport de Cadjehoun, il charge aujourd’hui en cuivre : 10 mètres de haut, 7 pour la statue seule, 13 tonnes.',
      focus: ['cotonou'],
      zoom: [0.75, 6.1, 3.95, 12.45],
      route: ['baoura', 'cotonou'],
      pins: [{ id: 'baoura', label: 'Baoura', ll: [2.70, 10.40], minor: true }, { id: 'cotonou', label: 'Monument, Cotonou', ll: [2.3875, 6.3501] }],
    },
    {
      annee: '18 déc. 2026', titre: 'Porto-Novo se souvient',
      texte: '110 ans plus tard, la capitale lui consacre une journée : un match le matin, une soirée spectacle le soir. Rendez-vous à Porto-Novo.',
      focus: ['porto-novo'],
      zoom: [2.15, 6.2, 2.85, 6.75],
      route: ['cotonou', 'portonovo'],
      cta: true,
      pins: [{ id: 'cotonou', label: 'Cotonou', ll: [2.3875, 6.3501], minor: true }, { id: 'portonovo', label: 'Porto-Novo', ll: [2.6186, 6.4969], star: true }],
    },
  ],
};
