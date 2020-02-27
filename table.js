const express = require('express')
const fs = require('fs');
const path = require('path')
var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', function (request, response) {
    console.log(request.url);
    loadPage('table', response);
});


function loadPage(page, response) {
    response.write(fs.readFileSync(page + '.html', 'utf-8'));
    response.end();
    console.log("Access to " + page);
}

const idEvent = {
    CONNECTION: 'connection',
    DECONNECTION: 'deconnection',
    ACHAT: 'achat',
    ELSE: 'else'

}

//Variables de nmbre de joueurs globales
var nbJoueursActuel = 0;
var nbJoueursMax = 5;
var lastClient;
var pseudosArr = [];
var idArr = [];
var currentPlayer = 0;
var indicTour = 0;
var turnSync = false;

var magasins;
var clients = [];
var events = [];
var avis = [];



fs.readFile('./ConstrClient.JSON', 'utf-8', function (error, data) {
    clients = JSON.parse(data);
});

fs.readFile('./ConstrAvis.JSON', 'utf-8', function (error, data) {
    avis = JSON.parse(data);
});

fs.readFile('./ConstrEvent.JSON', 'utf-8', function (error, data) {
    events = JSON.parse(data);
});

fs.readFile('./plateauStandard.JSON', 'utf-8', function (error, data) {
    plateau = JSON.parse(data);
});


////////////////
//  Socket.io //
////////////////
//#region


io.sockets.on('connection', function (socket) {
    console.log('Client connected.');
    socket.on('configLoader', function (configNameFile) {
        if(nbJoueursActuel>1){
            socket.emit('partieLancée');
        }
        else{
            console.log("chargement des parametres");
            let config = JSON.parse(fs.readFileSync(configNameFile + '.JSON', 'utf8'));
            socket.emit('configLoader', config);
            fs.copyFile(configNameFile + '.JSON', configNameFile + 'Save.JSON', (err) => {
                if (err) throw err;
                console.log(configNameFile + '.JSON a été copié dans ' + configNameFile + 'Save.JSON');
            });
        }
    });

    socket.on('alterParam', function (id, configNameFile, valeur) {
        console.log('modification du parametre : ' + id + ' avec la valeur ' + valeur + ' dans ' + configNameFile + 'Save.JSON');
        let config = JSON.parse(fs.readFileSync(configNameFile + 'Save.JSON', 'utf8'));
        for (var p in config.parameters) {
            if (config.parameters[p].id === id) {
                config.parameters[p].number = valeur;
            }
        }
        fs.writeFileSync(configNameFile + 'Save.JSON', JSON.stringify(config));
    });

    socket.on('configLoaderPerso', function (data) {
        console.log(data);
        //        let config = JSON.parse(fs.readFileSync(configNameFile + 'Save.JSON', 'utf8'));
    });
    socket.on('lancerPartie', function (configNameFile) {
        let config = JSON.parse(fs.readFileSync(configNameFile + 'Save.JSON', 'utf8'));
        let nombreMagasin = 0;
        let partie = {
            "clients": [],
            "joueurs": [],
            "magasins": [],
            "zones": [],
            "plateau": [],
            "entrées": [],
            "avis": [],
            "événements": []
        };
        for (var p in config.parameters) {
            if (config.parameters[p].id === "param1") {
                partie.nombreDeJoueurs = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param2") {
                partie.largeur = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param3") {
                partie.hauteur = config.parameters[p].number;
            }
            ////////////////////
            // creation zones //
            ////////////////////
            if (config.parameters[p].id === "param4") {
                let indexX = 0;
                let indexY = 0;
                nombreDeZone = config.parameters[p].number;
                nombreDeCases = partie.hauteur * partie.largeur;
                let talon = nombreDeCases % nombreDeZone;
                let tailleUnitaireZone = nombreDeCases / nombreDeZone;
                for (let zoneNumber = 0; zoneNumber < nombreDeZone; zoneNumber++) {
                    partie.zones.push({ "nom": "zone" + zoneNumber, "emplacements": [] });
                    let tailleThisZone = tailleUnitaireZone;
                    if (talon) {
                        talon--;
                        tailleThisZone++;
                    }
                    ////////////////////////
                    //      0     x
                    //    0 ¤----------->
                    //      |  
                    //   y  |  emplacements
                    //      |
                    //      v
                    //
                    while (tailleThisZone) {
                        partie.zones[zoneNumber].emplacements.push({ "x": indexX, "y": indexY });
                        tailleThisZone--;
                        indexY++;
                        if (indexY >= partie.hauteur) {
                            indexY = 0;
                            indexX++;
                        }
                    }
                }
            }
            /////////////////////////////////
            // creation clients épicuriens //
            /////////////////////////////////
            if (config.parameters[p].id === "param7") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("épicurien", "paranoïaque"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param8") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("épicurien", "sociopathe"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param9") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("épicurien", "psychorigide"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param10") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("épicurien", "dépressif"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param6") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("épicurien", "sain"));
                    tb--;
                }
            }
            //////////////////////////////////
            // creation clients végétariens //
            //////////////////////////////////
            if (config.parameters[p].id === "param12") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("végétarien", "paranoïaque"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param13") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("végétarien", "sociopathe"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param14") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("végétarien", "psychorigide"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param15") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("végétarien", "dépressif"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param11") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("végétarien", "sain"));
                    tb--;
                }
            }
            //////////////////////////////
            // creation clients pauvres //
            //////////////////////////////
            if (config.parameters[p].id === "param17") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("pauvre", "paranoïaque"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param18") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("pauvre", "sociopathe"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param19") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("pauvre", "psychorigide"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param20") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("pauvre", "dépressif"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param16") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("pauvre", "sain"));
                    tb--;
                }
            }
            //////////////////////////////
            // creation clients anxieux //
            //////////////////////////////
            if (config.parameters[p].id === "param22") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("anxieux", "paranoïaque"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param23") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("anxieux", "sociopathe"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param24") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("anxieux", "psychorigide"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param25") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("anxieux", "dépressif"));
                    tb--;
                }
            }
            if (config.parameters[p].id === "param21") {
                let tb = config.parameters[p].number;
                while (tb) {
                    partie.clients.push(setClient("anxieux", "sain"));
                    tb--;
                }
            }

            /////////////////////////////
            // génération des magasins //
            /////////////////////////////
            // Cave à vin
            if (config.parameters[p].id === "param50") {
                nomMagasin = "Caveàvin";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param51") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param52") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param53") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param54") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Caveàvin.png"));
            }

            // Alimentation bio
            if (config.parameters[p].id === "param55") {
                nomMagasin = "Alimentationbio";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param56") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param57") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param58") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param59") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Alimentationbio.png"));
            }

            // Boulangerie
            if (config.parameters[p].id === "param60") {
                nomMagasin = "Boulangerie";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param61") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param62") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param63") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param64") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Boulangerie.png"));
            }

            // Boucherie
            if (config.parameters[p].id === "param65") {
                nomMagasin = "Boucherie";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param66") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param67") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param68") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param69") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome,"./public/cartes/magasin/Boucherie.png"));
            }

            // Fruits et légumes
            if (config.parameters[p].id === "param70") {
                nomMagasin = "Fruitsetlégumes";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param71") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param72") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param73") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param74") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Fruitsetlégumes.png"));
            }

            // Pharmacie
            if (config.parameters[p].id === "param75") {
                nomMagasin = "Pharmacie";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param76") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param77") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param78") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param79") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Pharmacie.png"));;
            }

            // Poissonnerie
            if (config.parameters[p].id === "param80") {
                nomMagasin = "Poissonnerie";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param81") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param82") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param83") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param84") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Poissonnerie.png"));
            }

            // Fromagerie
            if (config.parameters[p].id === "param85") {
                nomMagasin = "Fromagerie";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param86") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param87") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param88") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param89") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Fromagerie.png"));
            }

            // Superette
            if (config.parameters[p].id === "param90") {
                nomMagasin = "Superette";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param91") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param92") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param93") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param94") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Superette.png"));
            }

            // Pâtisserie
            if (config.parameters[p].id === "param95") {
                nomMagasin = "Pâtisserie";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param96") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param97") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param98") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param99") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Pâtisserie.png"));
            }

            // Multimédia
            if (config.parameters[p].id === "param102") {
                nomMagasin = "Multimédia";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param103") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param104") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param105") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param106") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome, "./public/cartes/magasin/Multimédia.png"));
            }

            // Quincaillerie
            if (config.parameters[p].id === "param107") {
                nomMagasin = "Droguerie";
                coutMagasin = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param108") {
                anxieuxIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param109") {
                epicuriensIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param110") {
                pauvresIncome = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param111") {
                vegetariensIncome = config.parameters[p].number;
                partie.magasins.push(setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome,"./public/cartes/magasin/Droguerie.png"));
            }

            ///////////////////////////////////////
            // génération des avis et évènements //
            ///////////////////////////////////////
            // évènement Voleur
            if (config.parameters[p].id === "param40") {
                for (let number = 0; number < config.parameters[p].number; number++) {
                    partie.événements.push({
                        "Nom": "Voleur",
                        "Effet": "Retire 2 UM par magasin de la zone d'effet.",
                        "imgPath":"./public/cartes/avis-evenement/Voleur.png"
                    });
                }
            }

            // évènement Fraude Fiscale
            if (config.parameters[p].id === "param41") {
                for (let number = 0; number < config.parameters[p].number; number++) {
                    partie.événements.push({
                        "Nom": "Fraude Fiscale",
                        "Effet": "Double les UM rapportés par chaque magasin de la zone d'effet.",
                        "imgPath":"./public/cartes/avis-evenement/Fraude Fiscale.png"
                    });
                }
            }

            // évènement DGCCRF
            if (config.parameters[p].id === "param42") {
                for (let number = 0; number < config.parameters[p].number; number++) {
                    partie.événements.push({
                        "Nom": "DGCCRF",
                        "Effet": "Annule le bénéfice de la carte Fraude fiscale et en amende triple le montant des achats de chaque magasin.",
                        "imgPath":"./public/cartes/avis-evenement/DGCCRF.png"
                    });
                }
            }

            // avis Anxieux/Épicuriens
            if (config.parameters[p].id === "param43") {
                for (let number = 0; number < config.parameters[p].number; number++) {
                    let random = Math.random();
                    if (random > 0.5) {
                        partie.avis.push({
                            "Nom": "Provenance inconnue",
                            "Effet": "On ne sait plus quelle viande on mange",
                            "Cible magasin": "Boucherie/Supérette",
                            "Cible client": "Anxieux/Epicuriens",
                            "imgPath":"./public/cartes/avis-evenement/Provenance inconnue.png"
                        });
                    } else {
                        partie.avis.push({
                            "Nom": "Le bio c'est trop tôt !",
                            "Effet": "Les produits bio sont trop tristes",
                            "Cible magasin": "Alimentation Bio/Fruits & Légumes",
                            "Cible client": "Anxieux/Epicuriens",
                            "imgPath":"./public/cartes/avis-evenement/Le bio c'est trop tôt !.png"
                        });

                    }
                }
            }

            // avis Anxieux/Végétariens
            if (config.parameters[p].id === "param45") {
                for (let number = 0; number < config.parameters[p].number; number++) {
                    let random = Math.random();
                    if (random > 0.66) {
                        partie.avis.push({
                            "Nom": "Les oeufs qui piques",
                            "Effet": "Les oeufs sont contaminés par des insecticides",
                            "Cible magasin": "Boulangerie/Pâtisserie",
                            "Cible client": "Anxieux/Végétariens",
                            "imgPath":"./public/cartes/avis-evenement/Les oeufs qui piques.png"
                        });
                    } else if (random > 0.33) {
                        partie.avis.push({
                            "Nom": "Le cheval de mer",
                            "Effet": "Le poisson est nourri avec du cheval",
                            "Cible magasin": "Supérette/Poissonerie",
                            "Cible client": "Anxieux/Végétariens",
                            "imgPath":"./public/cartes/avis-evenement/Le cheval de mer.png"
                        });
                    } else {
                        partie.avis.push({
                            "Nom": "Alerte graisse animale !",
                            "Effet": "Les additifs à base de graisse animale sont partout",
                            "Cible magasin": "Pâtisserie/Supérette",
                            "Cible client": "Anxieux/Végétariens",
                            "imgPath":"./public/cartes/avis-evenement/Alerte graisse animale !.png"
                        });
                    }
                }
            }

            // avis Epicuriens/Végétariens
            if (config.parameters[p].id === "param46") {
                for (let number = 0; number < config.parameters[p].number; number++) {
                    partie.avis.push({
                        "Nom": "Les fruits fades",
                        "Effet": "Les fruits n'ont plus aucun goût",
                        "Cible magasin": "Fruit & Légumes/Supérette",
                        "Cible client": "Epicuriens/Végétariens",
                        "imgPath":"./public/cartes/avis-evenement/Les fruits fades.png"
                    });
                }
            }

            // avis Pauvres/Végétariens
            if (config.parameters[p].id === "param48") {
                for (let number = 0; number < config.parameters[p].number; number++) {
                    partie.avis.push({
                        "Nom": "Pénurie de raclette",
                        "Effet": "Le fromage est hors de prix",
                        "Cible magasin": "Alimentation Bio/Fromagerie",
                        "Cible client": "Pauvres/Végétariens",
                        "imgPath":"./public/cartes/avis-evenement/Pénurie de raclette.png"
                    });
                }
            }

            // avis Epicuriens/Pauvres
            if (config.parameters[p].id === "param47") {
                for (let number = 0; number < config.parameters[p].number; number++) {
                    partie.avis.push({
                        "Nom": "Bonjour la villageoise",
                        "Effet": "Le bon vin est hors de prix",
                        "Cible magasin": "Alimentation Bio/Cave à vin",
                        "Cible client": "Epicuriens/Pauvres",
                        "imgPath":"./public/cartes/avis-evenement/Bonjour la villageoise.png"
                    });
                }
            }

            ////////////////////////////
            // génération des joueurs //
            ////////////////////////////
            if (config.parameters[p].id === "param100") {
                solde = config.parameters[p].number;
                pushJoueur(solde);
            }

            ///////////////////////////////////////////
            // génération des paramètre de la partie //
            ///////////////////////////////////////////
            if (config.parameters[p].id === "param101") {
                partie.nombreDeTourDeJeu = config.parameters[p].number;
            }
            if (config.parameters[p].id === "param49") {
                partie.nombreCarteMaxMainJoueur = config.parameters[p].number;
            }

        }

        function pushJoueur(solde) {
            partie.joueurs.push({
                "pseudo": "",
                "id": "",
                "UM": solde,
                "inventaire": [
                    {
                        "magasins": []
                    },
                    {
                        "event": []
                    },
                    {
                        "avis": []
                    },
                    {
                        "clients": []
                    }
                ]
            });
        }

        for (let nbJ = 1; nbJ < partie.nombreDeJoueurs; nbJ++) {
            pushJoueur(solde);
        }

        ///////////////////////////
        // génération du plateau //
        ///////////////////////////
        let type = "";
        for (let y = 0; y < partie.hauteur; y++) {
            for (let x = 0; x < partie.largeur; x++) {
                if (y == 0 || y == 2) { type = "magasin"; } else if (x == 0 || x == (partie.largeur - 1)) { type = "entrée"; } else if (x == 1 || x == 2 || x == 4) { type = "affichage"; } else { type = "couloir"; }
                partie.plateau.push({ "emplacement": [{ "x": x, "y": y }], "type": type, "clients": []});
            }
        }
        nombreDeJoueursMax=partie.nombreDeJoueurs;
        fs.writeFileSync('game.JSON', JSON.stringify(partie));
        io.emit('partieLancée');
    });

    function eventCreation(idE, data) {
        let event;
        switch (idE) {

            case idEvent.CONNECTION:
                event = data + " connecté(e) !";
                io.emit("eventServer", event);
                console.log(event);
                break;

            case idEvent.DECONNECTION:
                event = data + " déconnecté(e) !";
                io.emit("eventServer", event);
                console.log(event);
                break;

            case idEvent.ACHAT:

                break;

            case idEvent.ELSE:
                event = data;
                io.emit("eventServer", event);
                break;

        }
    }

    //Trigger => Selection finale des configs
    socket.on('onSettingChange', function (preset) {
        // console.log(preset);
        const fileData = JSON.stringify(preset);
        fs.writeFile('configPartie.json', fileData, (err) => {
            if (err) throw err;
            console.log('The file has been saved!');
        });
    });


    // | Trigger => connection d'un nouveau client
    socket.on('connectionPlayer', function (pseudo) {

        if (nbJoueursActuel >= nbJoueursMax) {
            console.log("Nombre de joueurs max atteints");
        } else  {

            nbJoueursActuel++;
            lastClient = socket.id;
            console.log('Client connected. id: ' + lastClient);
            console.log('nbJoueursActuel: ' + nbJoueursActuel);
            idArr.push(lastClient);
            pseudosArr.push(pseudo);

            socket.broadcast.emit('connectionPlayer', nbJoueursActuel, pseudosArr);

            // Les autres clients envoient leurs pseudo au dernier client arrivé 
            io.to(lastClient).emit('toLast', nbJoueursActuel, pseudosArr);
            eventCreation(idEvent.CONNECTION, pseudo);
        }
    });

    // | Trigger => un client appuie sur la touche 'Enter'
    socket.on('messageClient', function (nomClient, message) {
        console.log("Client : " + nomClient + " | dit : " + message);
        io.emit('messageServer', {
            nomClient: nomClient,
            message: message
        });
    });

    // | Trigger => un client charge le plateau de jeu
    socket.on('chargementPlateau', function () {
        plateau = JSON.parse(fs.readFileSync('game.JSON', 'utf-8'));
        socket.emit('chargementPlateau', plateau);

        // Creation du profil des joueurs
        let profiles = creationJoueur(idArr, pseudosArr);
        plateau["joueurs"] = profiles;

        //Une fois le plateau chargé on le stock dans le JSON de la partie en cours
        fs.writeFile('game.JSON', JSON.stringify(plateau), function (err) {
            if (err) {
                console.log("Failed")
            } else {
                console.log("File saved");
            }
        });

        console.log("Plateau charger");
    });

    // | Trigger => un client se déconnecte
    socket.on('disconnect', function () {
        if (nbJoueursActuel <= nbJoueursMax) {

            let pseudoIndex = idArr.indexOf(socket.id);
            console.log(socket.id);

            pseudosArr.splice(pseudoIndex, 1);
            idArr.splice(pseudoIndex, 1);
            // nbJoueursActuel--;

            io.emit('disconnectionPlayer', pseudosArr, nbJoueursActuel - 1);
            console.log("client disconnected from server");
            console.log("nbJoueursActuel: " + nbJoueursActuel);
            console.log(idArr);
            console.log(pseudosArr);
        } else {
            if (nbJoueursActuel > nbJoueursMax) {
                nbJoueursActuel--;
            }
            console.log("spectator deconnected");
        }
    });

    //Trigger => tous les client sont bloqués
    socket.on('bloque', function () {
        io.to(idArr[currentPlayer]).emit('initTurn');
    });

    //Trigger =>le joueur a qui c'est le tour de jouer signal qu'il est prêt
    socket.on('playerTurn', function () {
        if (!turnSync) {
            eventCreation(idEvent.ELSE, "Tour de " + pseudosArr[currentPlayer]);
            turnSync=true;
            console.log("Tour de " + pseudosArr[currentPlayer]);
            console.log("Etape: "+indicTour);

            //Phase d'achat des magasins
            if (indicTour == 0) {
                plateau = JSON.parse(fs.readFileSync('game.JSON', 'utf-8'));
                magasins=plateau.magasins;
                io.to(idArr[currentPlayer]).emit('yourTurn', plateau.magasins) //Peut être ajouter un indicateur de phase
            }

            //Phase de pose des magasins
            if(indicTour == 1){
                io.to(idArr[currentPlayer]).emit('yourTurn',null);
            }

            //Phase avis/event
            if(indicTour == 2){
                if(plateau["joueurs"][currentPlayer]["inventaire"][1]["event"].length+
                    plateau["joueurs"][currentPlayer]["inventaire"][2]["avis"].length+
                    plateau["joueurs"][currentPlayer]["inventaire"][3]["clients"].length<9){
                    plateau = JSON.parse(fs.readFileSync('game.JSON', 'utf-8'));


                    plateau["joueurs"][currentPlayer]["inventaire"][2]["avis"].push(plateau["avis"].pop());

                    plateau["joueurs"][currentPlayer]["inventaire"][1]["event"].push(plateau["événements"].pop());

                    fs.writeFile('game.JSON', JSON.stringify(plateau), function (err) {
                        if (err) {
                            console.log("error writing file");
                        }
                    });
                }
                io.to(idArr[currentPlayer]).emit('yourTurn', plateau["joueurs"][currentPlayer]["inventaire"]);
            }
        }

        //Phase client 
        if (indicTour == 3) {
            if(plateau["joueurs"][currentPlayer]["inventaire"][1]["event"].length+
                plateau["joueurs"][currentPlayer]["inventaire"][2]["avis"].length+
                plateau["joueurs"][currentPlayer]["inventaire"][3]["clients"].length<8){
                for(let i =0; i<3; i++){
                    plateau["joueurs"][currentPlayer]["inventaire"][3]["clients"].push(plateau["clients"].pop());
                }
                fs.writeFile('game.JSON', JSON.stringify(plateau), function (err) {
                    if (err) {
                        console.log("error");
                    }
                });
            }
            io.to(idArr[currentPlayer]).emit('yourTurn', plateau["joueurs"][currentPlayer]["inventaire"]);
        }

        //TODO:Phase de résolution
        //Gestion de l'argent(event => avis => magasins => dépense des clients)
        //Avis => affecte un/des magasin(s) (REMARQUE: si psychopathe dans un
        //magasins affecté active leur "compétence") 
        //Event => affecte une zone 
        if(indicTour == 4){

        }

        //ici on envoie toutes les donneés nécessaire selon le tour
    });

    //Trigger => un joueur vient de finir son tour
    socket.on('finTour', function () {
        turnSync=false;
        console.log("Fin du tour de " + pseudosArr[currentPlayer]);
        if (++currentPlayer >= nbJoueursActuel) {
            if (++indicTour > 4) {
                indicTour = 2;
            }
            currentPlayer = 0;
        }
        io.emit("blocage");
    });

    //Trigger => un joueur a qui c'est le tour a effectué une action d'une etapes
    socket.on('actualiser', function (dat) {
        if (indicTour == 0) {
            for (let i = 0; i < magasins.length; i++) {
                if (magasins[i].nom === dat) {
                    let tmp = magasins[i];
                    fs.readFile('game.JSON', 'utf-8', function (err, data) {
                        plateau = JSON.parse(data);
                        plateau.magasins.splice(i,1);
                        // On stocke le magasins dans l'inventaire du joueur et on deduit le cout du magasin
                        plateau["joueurs"][currentPlayer]["inventaire"][0]["magasins"].push(tmp);
                        plateau["joueurs"][currentPlayer]["UM"] = plateau["joueurs"][currentPlayer]["UM"] - tmp.cout;
                        fs.writeFile('game.JSON', JSON.stringify(plateau), function (err) {
                            if (err) {
                                console.log("error");
                            }
                        });
                    });
                    magasins.splice(i, 1);
                }
            }
        }
        if(indicTour==1){
            console.log(dat);
            fs.readFile('game.JSON', 'utf-8', function (err, data) {
                plateau = JSON.parse(data);
                let regex = /[^xy=]/g
                let coord = dat.coord.toString().match(regex);
                let x = coord[0];
                let y = coord[1];
                var nom = dat.id;
                for(let i = 0; i<plateau["joueurs"][currentPlayer]["inventaire"][0]["magasins"].length; i++){
                    if(plateau["joueurs"][currentPlayer]["inventaire"][0]["magasins"][i].nom==nom){
                        plateau["joueurs"][currentPlayer]["inventaire"][0]["magasins"][i].splice(i,1);
                    }
                }
                for (var p in plateau["plateau"]) {
                    for (var e in plateau["plateau"][p].emplacement) {
                        if (plateau["plateau"][p].emplacement[e].x == x && plateau["plateau"][p].emplacement[e].y == y) {
                            plateau["plateau"][p].n = nom;
                            plateau["plateau"][p].pr = pseudosArr[currentPlayer];
                        }
                    }
                }
                fs.writeFile('game.JSON', JSON.stringify(plateau), function (err) {
                    if (err) {
                        console.log("error");
                    }
                });
                socket.broadcast.emit('chargementPlateau',plateau);
            });
        }
        if(indicTour==2){
            fs.readFile('game.JSON', 'utf-8', function (err, data) {
                plateau = JSON.parse(data);
                let regex = /[^xy=]/g
                let coord = dat.coord.toString().match(regex);
                let x = coord[0];
                let y = coord[1];
                var nom = dat.id;
                console.log(plateau);
                for (var p in plateau["plateau"]) {
                    for (var e in plateau["plateau"][p].emplacement) {
                        if (plateau["plateau"][p].emplacement[e].x == x && plateau["plateau"][p].emplacement[e].y == y) {
                            plateau["plateau"][p].n = nom;
                            plateau["plateau"][p].pr = pseudosArr[currentPlayer];
                        }
                    }
                }

                fs.writeFile('game.JSON', JSON.stringify(plateau), function (err) {
                    if (err) {
                        console.log("error");
                    }
                });
                socket.broadcast.emit('chargementPlateau',plateau);
            });
        }
        if (indicTour==3) {
            if(dat.x!=null){ 
                fs.readFile('game.JSON', 'utf-8', function (err, data) {
                    plateau = JSON.parse(data);
                    for (var p in plateau["plateau"]) {
                        for (var e in plateau["plateau"][p].emplacement) {
                            if (plateau["plateau"][p].emplacement[e].x == dat.x && plateau["plateau"][p].emplacement[e].y == dat.y) {    
                                plateau["plateau"][p].clients.push({
                                    "client":plateau["joueurs"][currentPlayer]["inventaire"][3]["clients"][dat.client].nom,
                                    "pr": pseudosArr[currentPlayer]
                                });
                                console.log(plateau["plateau"][p]);
                                plateau["joueurs"][currentPlayer]["inventaire"][3]["clients"].splice(dat.client,1);
                                fs.writeFile('game.JSON', JSON.stringify(plateau), function (err) {
                                    if (err) {
                                        console.log("error");
                                    }
                                }); 
                            }
                        }
                    }
                    io.emit('chargementPlateau',plateau);

                });
            }
        }
    });

    //Trigger => bouton lancer partie appuye 
    socket.on("partieLancée", function () {
        io.emit("blocage");
    });
});
//#endregion

console.log('listen on *:8080');
server.listen(8080);

/////////////////////
// Fonctionnalités //
/////////////////////
//#région

//Fonction d'initialisation des informations de chaque joueurs
function creationJoueur(id, pseudo) {
    let tmp_arr = [];
    for (let i = 0; i < id.length; i++) {
        let tmp = {
            "pseudo": pseudo[i],
            "id": id[i],
            "UM": 14,
            "inventaire": [
                {
                    "magasins": []
                },
                {
                    "event":[]
                },
                {
                    "avis":[]
                },
                {
                    "clients": []
                }
            ]
        };
        tmp_arr[i] = tmp;
    }
    return tmp_arr;
}

function setClient(categorie, etatMetal) {
    let clients = JSON.parse(fs.readFileSync('ConstrClient.JSON', 'utf8'));
    let indiceNom = Math.floor(Math.random() * Math.floor(25));
    let indiceCarte = Math.floor(Math.random() * Math.floor(25));
    if (Math.floor(Math.random() * Math.floor(2) == 1)) {
        let result = { "nom": clients['hommes'][indiceNom].nom, "categorie": categorie, "etatMental": etatMetal, "imgPath": "/public/cartes/clients/Hommes/" + categorie+etatMetal + ".png" };
        return result;
    } else {
        let result = { "nom": clients['femmes'][indiceNom].nom, "categorie": categorie, "etatMental": etatMetal, "imgPath": "/public/cartes/clients/Femmes/" + categorie+etatMetal + ".png" };
        return result;
    }
}
function setMagasin(nomMagasin, coutMagasin, anxieuxIncome, epicuriensIncome, pauvresIncome, vegetariensIncome,image) {
    return ({ "nom": nomMagasin, "coût": coutMagasin, "anxieux": anxieuxIncome, "épicuriens": epicuriensIncome, "pauvres": pauvresIncome, "végétariens": vegetariensIncome, "image":image});
}

//#endregion
