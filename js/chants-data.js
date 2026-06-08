const CHANTS = [
  {
    id: 10496,
    titolo: "L'Etna",
    testo: "Che bello e'ee quando erutta l'Etna\nscende tutta la lava\ne scompare Palermo!",
    categoria: "sfotto",
    avversario: "Palermo",
    popolarita: 4815,
    melodia: null
  },
  {
    id: 14093,
    titolo: "Che Bello Uscire di Casa",
    testo: "Che bello e\nquando esco di casa\nper andare allo stadio\na vedere l'Unione!",
    categoria: "incoraggiamento",
    avversario: null,
    popolarita: 1664,
    melodia: null
  },
  {
    id: 34543,
    titolo: "Ci Accoltellano",
    testo: "ci accoltellano\npoi ci sassano\ne ci sciolgono dentro all'acido\nse ci fermano\nci controllano\ni cani scappano\ne noi cantiamo ancor\nforza unione alè\nsempre insieme a te\novunque giocherai\nsola non sarai mai",
    categoria: "curva",
    avversario: null,
    popolarita: 1635,
    melodia: null
  },
  {
    id: 10469,
    titolo: "Che Ne Sai",
    testo: "Che ne sai di come mi sento!!\nquando l'Unione scende in campo!!\ngioie immense forti emozioni!!\nsarò sempre su quei gradoni!!\nSemplice!!\nquesta passione per le due città!!\nsole e pioggia sarò sempre qua'!!\nè troppo forte il sentimento che mi porto dentro!!\nCiao Michael!!",
    categoria: "classico",
    avversario: null,
    popolarita: 1524,
    melodia: null
  },
  {
    id: 14091,
    titolo: "La Curva Sud Ti Ama",
    testo: "E forza unione\nla curva sud ti ama\ntutta la settimana\nio penso solo a te!\nArancio verde unico grande amore\nuna grande passione che c'è dentro di me\nOooh unione gol\nfino al novantesimo\nche fatica che ti chiedo\nforza unione facci un gol",
    categoria: "curva",
    avversario: null,
    popolarita: 1177,
    melodia: null
  },
  {
    id: 10996,
    titolo: "L'Unione / O Padovano",
    testo: "Eee oe oe oe oe oe oe l'Unione\nEee oe oe oe oe oe oe l'Unione\nEee oe oe oe oe oe oe l'Unione!!!\nE fino a quando potremo cantare\no padovano vai a cagare!!!!!",
    categoria: "derby",
    avversario: "Padova",
    popolarita: 732,
    melodia: null
  },
  {
    id: 10909,
    titolo: "Siamo i Leoni Arancioverdi",
    testo: "Siamo i leoni arancioverdi\ncome i color dei nostri cuor\ncon te ovunque giocherai\nnoi sempre al tuo fianco avrai!!!!\nAlé Alé unione Alé\nAlé Alé unione Alé\nAlé Alé unione Alé Alé Alé!!!!!!",
    categoria: "classico",
    avversario: null,
    popolarita: 97,
    melodia: null
  },
  {
    id: 10854,
    titolo: "La Nostra Passione",
    testo: "Perché l'unione è la nostra passione\ne arancioverde è la nostra storia\nalé alé alé alé unione\nalé alé alé alé alé alé unione",
    categoria: "classico",
    avversario: null,
    popolarita: 73,
    melodia: null
  },
  {
    id: 66870,
    titolo: "Armata Arancio Verde",
    testo: "dentro lo stadio ti sostengo\nfuori io vado a caricar\nsiamo l'armata arancio verde\nla Venezia Mestre ultrà\nforza unione facci un gol\nforza unione facci un gol\nforza unione forza unione facci un gol",
    categoria: "curva",
    avversario: null,
    popolarita: 78,
    melodia: null
  },
  {
    id: 65942,
    titolo: "Che Bello È (La Domenica)",
    testo: "Che bello è\nse la domenica la passo con te\nin ogni stadio canterò per te\nsei la mia vita sei unica\nmagica Unione\nche bello è",
    categoria: "classico",
    avversario: null,
    popolarita: 78,
    melodia: null
  },
  {
    id: 66270,
    titolo: "Noi Siamo il Venezia-Mestre",
    testo: "NOI SIAMO IL VENEZIA-MESTRE\nSIAMO SEMPRE ACCANTO A TE\nPER L'ITALIA GIREREMO ALÉ OH!\nALÉ ALÉ ALÉ OH! ALÉ ALÉ ALÉ OH!\nALÉ ALÉ ALÉ OH! FORZA UNIONE!",
    categoria: "incoraggiamento",
    avversario: null,
    popolarita: 58,
    melodia: null
  },
  {
    id: 66269,
    titolo: "Siamo l'Armata Arancioverde",
    testo: "SIAMO L'ARMATA ARANCIOVERDE\nE MAI NESSUN CI FERMERÀ\nNOI SAREMO SEMPRE QUA\nQUANDO L'UNIONE GIOCHERÀ\nFORZA UNIONE VINCI ANCORA PER GLI ULTRÀ",
    categoria: "curva",
    avversario: null,
    popolarita: 22,
    melodia: null
  },
  {
    id: 68359,
    titolo: "Forza Unione Alé",
    testo: "Forza Unione alé\nNon mollare mai\nLa sud ti seguirà\nOvunque giocherai\nChe si vinca o perda\nLotta più che puoi\nDietro alle tue spalle\nCi saremo noi",
    categoria: "incoraggiamento",
    avversario: null,
    popolarita: 20,
    melodia: null
  },
  {
    id: 68723,
    titolo: "Per Ogni Diffidato",
    testo: "Sai perché la curva vuole vincere\nper ogni diffidato che deve firmare\nper chi non può venire\nbisogna lottare",
    categoria: "curva",
    avversario: null,
    popolarita: 20,
    melodia: null
  },
  {
    id: 67867,
    titolo: "O Padovano Devi Vendere",
    testo: "o padovano devi vendere\nvattene vattene\no padovano devi vendere\nvattene vattene",
    categoria: "derby",
    avversario: "Padova",
    popolarita: 16,
    melodia: null
  },
  {
    id: 11034,
    titolo: "Alé Alé Alé UNIONE",
    testo: "Alé Alé Alé UNIONE Alé!\nforza lotta vincerai!\nnon ti lasceremo mai!",
    categoria: "incoraggiamento",
    avversario: null,
    popolarita: 29,
    melodia: null
  },
  {
    id: 65349,
    titolo: "Il Veneto Siamo Noi",
    testo: "Il Veneto siamo noi!\nSiamo noi, solo noi\nI padroni del Veneto siamo noiiii!",
    categoria: "sfotto",
    avversario: null,
    popolarita: 41,
    melodia: null
  },
  {
    id: 8848,
    titolo: "Un Padovano in Croce",
    testo: "Un padovano in croce\ngridando ad alta voce\nchiedeva alla sua mamma\n\"Di chi son figlio io?\"\nSua madre gli rispose\nalzando la sottana:\n\"O padovano mio\nsei un figlio di nessuno!\"",
    categoria: "derby",
    avversario: "Padova",
    popolarita: 1280,
    melodia: null
  }
];
