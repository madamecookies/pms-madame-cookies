// Variables globales
let currentTab = 'dashboard';
let stream = null;
let photoContext = '';
let donnees = {
    temperatures: [],
    productions: [],
    nettoyages: [],
    receptions: [],
    actions: {}
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initialiserApp();
    initialiserNavigation();
});

function initialiserApp() {
    console.log('🍪 Initialisation PMS Madame Cookies...');
    
    // Date actuelle
    const maintenant = new Date();
    document.getElementById('current-date').textContent = 
        maintenant.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

    // Initialiser les champs date/heure
    const dateTimeFields = ['temp-datetime'];
    dateTimeFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.value = maintenant.toISOString().slice(0, 16);
        }
    });

    // Générer numéro de lot pour production
    genererNumeroLot();

    // Charger données sauvegardées
    chargerDonnees();

    // Mettre à jour les statistiques
    mettreAJourStatistiques();
    try{ chargerConfigSync(); }catch(e){}
    if (typeof initialiserMPEtiquettesUI==='function') initialiserMPEtiquettesUI();

    // Charger les actions du jour
    chargerActions();
    
    console.log('✅ Application initialisée');
}

function initialiserNavigation() {
    // Ajouter les événements de clic aux boutons de navigation
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            changerTab(tabId);
        });
    });
    
    console.log('🔗 Navigation initialisée');
}

// Navigation entre onglets
function changerTab(tabId) {
    console.log('🔄 Changement onglet:', tabId);
    
    // Masquer tous les onglets
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Désactiver tous les boutons nav
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(nav => {
        nav.classList.remove('active');
    });

    // Activer l'onglet sélectionné
    const targetTab = document.getElementById(tabId);
    const targetNav = document.querySelector(`[data-tab="${tabId}"]`);
    
    if (targetTab && targetNav) {
        targetTab.classList.add('active');
        targetNav.classList.add('active');
        currentTab = tabId;

        // Charger les données spécifiques à l'onglet
        switch(tabId) {
            case 'temperatures':
                chargerTableauTemperatures();
                break;
            case 'production':
                chargerTableauProductions();
                break;
            case 'historique':
                chargerHistorique();
                break;
        }
        
        afficherNotification(`📋 Onglet ${getTabDisplayName(tabId)} activé`, 'success');
    } else {
        console.error('❌ Onglet introuvable:', tabId);
    }
}

function getTabDisplayName(tabId) {
    const names = {
        'dashboard': 'Tableau de Bord',
        'temperatures': 'Températures',
        'production': 'Production',
        'nettoyage': 'Nettoyage',
        'reception': 'Réception',
        'historique': 'Historique',
        'exports': 'Exports'
    };
    return names[tabId] || tabId;
}

// Vérification température
function verifierTemperature(input, cible, tolerance, type = 'range') {
    const valeur = parseFloat(input.value);
    if (isNaN(valeur)) return;

    input.classList.remove('alert');
    
    let conforme = false;
    if (type === 'max') {
        conforme = valeur <= cible;
    } else {
        conforme = Math.abs(valeur - cible) <= tolerance;
    }

    if (!conforme) {
        input.classList.add('alert');
        afficherNotification(`⚠️ Température non conforme: ${valeur}°C`, 'warning');
    } else {
        afficherNotification(`✅ Température conforme: ${valeur}°C`, 'success');
    }
}

// Gestion caméra
function ouvrirCamera(contexte) {
    console.log('📷 Ouverture caméra pour:', contexte);
    photoContext = contexte;
    const modal = document.getElementById('modalCamera');
    const video = document.getElementById('video');

    modal.style.display = 'block';

    // Accès caméra
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        } 
    })
    .then(function(mediaStream) {
        stream = mediaStream;
        \1
        if (video.play) { try { video.play(); } catch(e) {} }
        console.log('✅ Caméra activée');
    })
    .catch(function(err) {
        console.error('❌ Erreur caméra:', err);
        afficherNotification('❌ Impossible d\'accéder à la caméra', 'danger');
        fermerCamera();
    });
}

function prendrePhoto() {
    console.log('📸 Capture photo...');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Définir les dimensions du canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capturer l'image
    ctx.drawImage(video, 0, 0);
    
    // Convertir en base64
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    
    // Ajouter la photo à la section appropriée
    ajouterPhoto(dataURL, photoContext);
    
    // Fermer la caméra
    fermerCamera();
    
    afficherNotification('📷 Photo capturée avec succès', 'success');
}

function fermerCamera() {
    console.log('❌ Fermeture caméra');
    const modal = document.getElementById('modalCamera');
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    modal.style.display = 'none';
}

function ajouterPhoto(dataURL, contexte) {
    const photoId = 'photo_' + Date.now();
    const previewDiv = document.getElementById(`${contexte}-photos`);
    
    if (previewDiv) {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-item';
        photoDiv.innerHTML = `
            <img src="${dataURL}" alt="Photo ${contexte}">
            <button class="photo-delete" onclick="supprimerPhoto('${photoId}', '${contexte}')">×</button>
        `;
        photoDiv.id = photoId;
        previewDiv.appendChild(photoDiv);
        
        // Mettre à jour les stats
        mettreAJourStatistiques();
    try{ chargerConfigSync(); }catch(e){}
    if (typeof initialiserMPEtiquettesUI==='function') initialiserMPEtiquettesUI();
    }
}

function supprimerPhoto(photoId, contexte) {
    const photoDiv = document.getElementById(photoId);
    if (photoDiv) {
        photoDiv.remove();
        afficherNotification('🗑️ Photo supprimée', 'warning');
        mettreAJourStatistiques();
    try{ chargerConfigSync(); }catch(e){}
    if (typeof initialiserMPEtiquettesUI==='function') initialiserMPEtiquettesUI();
    }
}

// Sauvegarde températures
function sauvegarderTemperatures() {
    console.log('💾 Sauvegarde températures...');
    
    const donneeTemp = {
        id: 'temp_' + Date.now(),
        datetime: document.getElementById('temp-datetime').value,
        responsable: document.getElementById('temp-responsable').value,
        froide: parseFloat(document.getElementById('temp-froide').value) || null,
        negative: parseFloat(document.getElementById('temp-negative').value) || null,
        surgel1: parseFloat(document.getElementById('temp-surgel1').value) || null,
        surgel2: parseFloat(document.getElementById('temp-surgel2').value) || null,
        surgel3: parseFloat(document.getElementById('temp-surgel3').value) || null,
        ambiance: parseFloat(document.getElementById('temp-ambiance').value) || null,
        actions: document.getElementById('temp-actions').value,
        photos: Array.from(document.getElementById('temp-photos').children).length
    };

    // Vérifier conformité
    donneeTemp.conforme = verifierConformiteTemp(donneeTemp);
    
    // Ajouter aux données
    donnees.temperatures.unshift(donneeTemp);
    
    // Sauvegarder localement
    sauvegarderDonnees();
    
    // Réinitialiser le formulaire
    reinitialiserFormulaireTemp();
    
    // Recharger tableau
    chargerTableauTemperatures();
    
    // Mettre à jour stats
    mettreAJourStatistiques();
    try{ chargerConfigSync(); }catch(e){}
    if (typeof initialiserMPEtiquettesUI==='function') initialiserMPEtiquettesUI();
    
    afficherNotification('✅ Températures sauvegardées', 'success');
}

function verifierConformiteTemp(donnee) {
    const conformites = [];
    
    if (donnee.froide !== null) {
        conformites.push(Math.abs(donnee.froide - 4.2) <= 1);
    }
    if (donnee.negative !== null) {
        conformites.push(Math.abs(donnee.negative - (-13)) <= 2);
    }
    if (donnee.surgel1 !== null) {
        conformites.push(Math.abs(donnee.surgel1 - (-18)) <= 2);
    }
    if (donnee.surgel2 !== null) {
        conformites.push(Math.abs(donnee.surgel2 - (-18)) <= 2);
    }
    if (donnee.surgel3 !== null) {
        conformites.push(Math.abs(donnee.surgel3 - (-18)) <= 2);
    }
    if (donnee.ambiance !== null) {
        conformites.push(donnee.ambiance <= 25);
    }
    
    return conformites.every(c => c === true);
}

function reinitialiserFormulaireTemp() {
    const maintenant = new Date();
    document.getElementById('temp-datetime').value = maintenant.toISOString().slice(0, 16);
    document.getElementById('temp-froide').value = '';
    document.getElementById('temp-negative').value = '';
    document.getElementById('temp-surgel1').value = '';
    document.getElementById('temp-surgel2').value = '';
    document.getElementById('temp-surgel3').value = '';
    document.getElementById('temp-ambiance').value = '';
    document.getElementById('temp-actions').value = '';
    document.getElementById('temp-photos').innerHTML = '';
    
    // Retirer les classes d'alerte
    document.querySelectorAll('.temp-input').forEach(input => {
        input.classList.remove('alert');
    });
}

// Sauvegarde production
function sauvegarderProduction() {
    console.log('💾 Sauvegarde production...');
    
    const donneeProduction = {
        id: 'prod_' + Date.now(),
        lot: document.getElementById('prod-lot').value,
        variete: document.getElementById('prod-variete').value,
        quantite: parseInt(document.getElementById('prod-quantite').value) || 0,
        debut: document.getElementById('prod-debut').value,
        fin: document.getElementById('prod-fin').value,
        temperature: parseFloat(document.getElementById('prod-temperature').value) || null,
        observations: document.getElementById('prod-observations').value,
        photos: Array.from(document.getElementById('prod-photos').children).length,
        datetime: new Date().toISOString()
    };

    if (!donneeProduction.variete || !donneeProduction.quantite) {
        afficherNotification('⚠️ Veuillez remplir les champs obligatoires', 'warning');
        return;
    }
    
    // Ajouter aux données
    donnees.productions.unshift(donneeProduction);
    
    // Sauvegarder localement
    sauvegarderDonnees();
    
    // Réinitialiser le formulaire
    reinitialiserFormulaireProduction();
    
    // Recharger tableau
    chargerTableauProductions();
    
    // Mettre à jour stats
    mettreAJourStatistiques();
    try{ chargerConfigSync(); }catch(e){}
    if (typeof initialiserMPEtiquettesUI==='function') initialiserMPEtiquettesUI();
    
    afficherNotification('✅ Production enregistrée', 'success');
}

function genererNumeroLot() {
    const maintenant = new Date();
    const annee = maintenant.getFullYear().toString().slice(-2);
    const mois = (maintenant.getMonth() + 1).toString().padStart(2, '0');
    const jour = maintenant.getDate().toString().padStart(2, '0');
    const heure = maintenant.getHours().toString().padStart(2, '0');
    const minute = maintenant.getMinutes().toString().padStart(2, '0');
    
    const numeroLot = `MC${annee}${mois}${jour}-${heure}${minute}`;
    
    const lotField = document.getElementById('prod-lot');
    if (lotField) {
        lotField.value = numeroLot;
    }
}

function reinitialiserFormulaireProduction() {
    genererNumeroLot();
    document.getElementById('prod-variete').value = '';
    document.getElementById('prod-quantite').value = '';
    document.getElementById('prod-debut').value = '';
    document.getElementById('prod-fin').value = '';
    document.getElementById('prod-temperature').value = '';
    document.getElementById('prod-observations').value = '';
    document.getElementById('prod-photos').innerHTML = '';
}

// Chargement tableaux
function chargerTableauTemperatures() {
    const tbody = document.getElementById('table-temperatures');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    donnees.temperatures.forEach(temp => {
        const row = tbody.insertRow();
        const dateFormat = new Date(temp.datetime).toLocaleString('fr-FR');
        const statut = temp.conforme ? 
            '<span class="status-badge status-conforme">Conforme</span>' :
            '<span class="status-badge status-non-conforme">Non-conforme</span>';
        
        row.innerHTML = `
            <td>${dateFormat}</td>
            <td>${temp.froide !== null ? temp.froide + '°C' : '-'}</td>
            <td>${temp.negative !== null ? temp.negative + '°C' : '-'}</td>
            <td>${temp.surgel1 !== null ? temp.surgel1 + '°C' : '-'}</td>
            <td>${temp.surgel2 !== null ? temp.surgel2 + '°C' : '-'}</td>
            <td>${temp.surgel3 !== null ? temp.surgel3 + '°C' : '-'}</td>
            <td>${temp.ambiance !== null ? temp.ambiance + '°C' : '-'}</td>
            <td>${statut}</td>
        `;
    });
}

function chargerTableauProductions() {
    const tbody = document.getElementById('table-productions');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    donnees.productions.forEach(prod => {
        const row = tbody.insertRow();
        const heureDebut = prod.debut || '-';
        const heureFin = prod.fin || '-';
        const duree = prod.debut && prod.fin ? `${heureDebut}-${heureFin}` : heureDebut;
        
        row.innerHTML = `
            <td>${prod.lot}</td>
            <td>${prod.variete}</td>
            <td>${prod.quantite} pcs</td>
            <td>${duree}</td>
            <td>${prod.temperature ? prod.temperature + '°C' : '-'}</td>
            <td><span class="status-badge status-conforme">OK</span></td>
        `;
    });
}

function chargerHistorique() {
    const tbody = document.getElementById('table-historique');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Combiner tous les types de données
    const historique = [
        ...donnees.temperatures.map(t => ({...t, type: 'Température'})),
        ...donnees.productions.map(p => ({...p, type: 'Production'}))
    ].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    
    historique.forEach(item => {
        const row = tbody.insertRow();
        const dateFormat = new Date(item.datetime).toLocaleString('fr-FR');
        const details = item.type === 'Température' ? 
            `${item.responsable} - ${Object.values(item).filter(v => typeof v === 'number').length} mesures` :
            `${item.variete} - ${item.quantite} pcs`;
        const statut = item.conforme !== false ? 
            '<span class="status-badge status-conforme">OK</span>' :
            '<span class="status-badge status-non-conforme">Alerte</span>';
        
        row.innerHTML = `
            <td>${dateFormat}</td>
            <td>${item.type}</td>
            <td>${item.responsable || 'N/A'}</td>
            <td>${details}</td>
            <td>${statut}</td>
        `;
    });
}

// Gestion actions du jour
function sauvegarderAction(checkbox) {
    const actionId = checkbox.id;
    donnees.actions[actionId] = checkbox.checked;
    sauvegarderDonnees();
    
    if (checkbox.checked) {
        checkbox.closest('.checkbox-item').classList.add('success-flash');
        setTimeout(() => {
            checkbox.closest('.checkbox-item').classList.remove('success-flash');
        }, 1000);
    }
}

function chargerActions() {
    Object.keys(donnees.actions).forEach(actionId => {
        const checkbox = document.getElementById(actionId);
        if (checkbox) {
            checkbox.checked = donnees.actions[actionId];
        }
    });
}

// Statistiques
function mettreAJourStatistiques() {
    const conformes = donnees.temperatures.filter(t => t.conforme).length;
    const nonConformes = donnees.temperatures.filter(t => !t.conforme).length;
    const totalProductions = donnees.productions.length;
    const totalPhotos = donnees.temperatures.reduce((acc, t) => acc + (t.photos || 0), 0) +
                       donnees.productions.reduce((acc, p) => acc + (p.photos || 0), 0);

    document.getElementById('stat-conformes').textContent = conformes;
    document.getElementById('stat-non-conformes').textContent = nonConformes;
    document.getElementById('stat-productions').textContent = totalProductions;
    document.getElementById('stat-photos').textContent = totalPhotos;
}

// Sauvegarde locale
function sauvegarderDonnees() {
    try {
        localStorage.setItem('pms_donnees', JSON.stringify(donnees));
        console.log('💾 Données sauvegardées localement');
    } catch (e) {
        console.error('❌ Erreur sauvegarde:', e);
    }
}

function chargerDonnees() {
    try {
        const donneesStock = localStorage.getItem('pms_donnees');
        if (donneesStock) {
            donnees = JSON.parse(donneesStock);
            console.log('📁 Données chargées:', Object.keys(donnees).map(k => `${k}: ${donnees[k].length || 'N/A'}`));
        }
    } catch (e) {
        console.error('❌ Erreur chargement:', e);
        donnees = {
            temperatures: [],
            productions: [],
            nettoyages: [],
            receptions: [],
            actions: {}
        };
    }
}

// Exports PDF
function exporterTemperaturesPDF() {
    if (!window.jsPDF) {
        afficherNotification('❌ Bibliothèque PDF non disponible', 'danger');
        return;
    }
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Rapport de Contrôle Températures', 20, 30);
    doc.setFontSize(12);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 20, 45);
    let y = 60;
    doc.setFontSize(14);
    doc.text('Derniers Contrôles:', 20, y);
    y += 10;
    doc.setFontSize(10);
    (donnees.temperatures || []).slice(0, 10).forEach(temp => {
        const date = new Date(temp.datetime).toLocaleString('fr-FR');
        const statut = temp.conforme ? 'CONFORME' : 'NON-CONFORME';
        doc.text(`${date} - ${temp.responsable || 'N/A'} - ${statut}`, 20, y);
        y += 8;
        if (y > 280) { doc.addPage(); y = 20; }
    });
    const filename = `temperatures_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    afficherNotification('📄 PDF généré avec succès', 'success');
}

// Notifications
function afficherNotification(message, type = 'info') {
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} floating-alert`;
    
    const icon = type === 'success' ? '✅' : 
                 type === 'warning' ? '⚠️' : 
                 type === 'danger' ? '❌' : 'ℹ️';
    
    notification.innerHTML = `<span>${icon}</span> ${message}`;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Supprimer après 4 secondes
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.animation = 'slideInAlert 0.3s ease reverse';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
}

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('❌ Erreur JavaScript:', e.error);
    afficherNotification('❌ Une erreur inattendue s\'est produite', 'danger');
});

// Gestion de la connexion
window.addEventListener('online', function() {
    afficherNotification('🌐 Connexion rétablie', 'success');
});

window.addEventListener('offline', function() {
    afficherNotification('📡 Mode hors-ligne activé', 'warning');
});

// Gestion PWA (si applicable)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('✅ SW registered:', registration.scope);
            })
            .catch(function(error) {
                console.log('❌ SW registration failed:', error);
            });
    });
}

console.log('🍪 PMS Madame Cookies - JavaScript chargé');


// ---------- Exports & Sync Helpers ----------
function telechargerFichier(nom, contenu, mime='text/plain'){
    const blob = new Blob([contenu], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nom; a.click();
    URL.revokeObjectURL(url);
}

function toCSV(rows, headers){
    const esc = v => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g,'""');
        return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const head = headers.map(h=>esc(h.label)).join(';');
    const lines = rows.map(r => headers.map(h=>esc(r[h.key])).join(';'));
    return [head, ...lines].join('\n');
}

function snapshotDonnees(){
    try{
        return JSON.stringify({ meta: { app: 'PMS Madame Cookies', exportedAt: new Date().toISOString() }, donnees }, null, 2);
    }catch(e){
        return JSON.stringify({ error: 'Snapshot failed', message: e.message });
    }
}

function exporterExcel(){
    const tRows = (donnees.temperatures||[]).map(t => ({
        id: t.id, datetime: t.datetime, responsable: t.responsable,
        froide: t.froide, negative: t.negative, surgel1: t.surgel1, surgel2: t.surgel2, surgel3: t.surgel3,
        ambiance: t.ambiance, actions: t.actions, conforme: t.conforme, photos: t.photos
    }));
    const tCSV = toCSV(tRows, [
        {key:'id',label:'id'}, {key:'datetime',label:'datetime'}, {key:'responsable',label:'responsable'},
        {key:'froide',label:'froide'}, {key:'negative',label:'negative'}, {key:'surgel1',label:'surgel1'},
        {key:'surgel2',label:'surgel2'}, {key:'surgel3',label:'surgel3'}, {key:'ambiance',label:'ambiance'},
        {key:'actions',label:'actions'}, {key:'conforme',label:'conforme'}, {key:'photos',label:'photos'}
    ]);
    telechargerFichier('temperatures.csv', tCSV, 'text/csv');

    const pRows = (donnees.productions||[]).map(p => ({
        id: p.id, lot: p.lot, variete: p.variete, quantite: p.quantite, debut: p.debut, fin: p.fin,
        temperature: p.temperature, observations: p.observations, photos: p.photos, datetime: p.datetime
    }));
    const pCSV = toCSV(pRows, [
        {key:'id',label:'id'},{key:'lot',label:'lot'},{key:'variete',label:'variete'},{key:'quantite',label:'quantite'},
        {key:'debut',label:'debut'},{key:'fin',label:'fin'},{key:'temperature',label:'temperature'},
        {key:'observations',label:'observations'},{key:'photos',label:'photos'},{key:'datetime',label:'datetime'}
    ]);
    telechargerFichier('productions.csv', pCSV, 'text/csv');

    // Nettoyages
    const nRows = (donnees.nettoyages||[]).map(n => ({
        id:n.id, datetime:n.datetime, zone:n.zone, produit:n.produit, responsable:n.responsable, conforme:n.conforme, observations:n.observations||''
    }));
    if (nRows.length){
        const nCSV = toCSV(nRows, [
            {key:'id',label:'id'},{key:'datetime',label:'datetime'},{key:'zone',label:'zone'},
            {key:'produit',label:'produit'},{key:'responsable',label:'responsable'},{key:'conforme',label:'conforme'},
            {key:'observations',label:'observations'}
        ]);
        telechargerFichier('nettoyages.csv', nCSV, 'text/csv');
    }
    // Réceptions
    const rRows = (donnees.receptions||[]).map(r => ({
        id:r.id, datetime:r.datetime, fournisseur:r.fournisseur, bon:r.bon, produits:r.produits, conforme:r.conforme, observations:r.observations||''
    }));
    if (rRows.length){
        const rCSV = toCSV(rRows, [
            {key:'id',label:'id'},{key:'datetime',label:'datetime'},{key:'fournisseur',label:'fournisseur'},
            {key:'bon',label:'bon'},{key:'produits',label:'produits'},{key:'conforme',label:'conforme'},
            {key:'observations',label:'observations'}
        ]);
        telechargerFichier('receptions.csv', rCSV, 'text/csv');
    }
    // MP Etiquettes
    if (donnees.mpEtiquettes && donnees.mpEtiquettes.length){
        const mRows = donnees.mpEtiquettes.map((m,i)=>({index:i+1, productionId:m.productionId||'', nom:m.nom||'', lot:m.lot||'', photoId:m.photoId||''}));
        const mCSV = toCSV(mRows, [
            {key:'index',label:'#'},{key:'productionId',label:'productionId'},{key:'nom',label:'matiere_premiere'},{key:'lot',label:'numero_lot'},{key:'photoId',label:'photoId'}
        ]);
        telechargerFichier('mp_etiquettes.csv', mCSV, 'text/csv');
    }
    try{ afficherNotification('📊 Exports CSV téléchargés', 'success'); }catch(e){}
}

function genererRapportPDF(){
    if(!window.jsPDF){ try{ afficherNotification('jsPDF non chargé', 'danger'); }catch(e){} return; }
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();
    const margin = 14;
    let y = 18;
    doc.setFontSize(16); doc.text('Rapport PMS — Madame Cookies', margin, y); y+=8;
    doc.setFontSize(10); doc.text('Généré le: '+ new Date().toLocaleString('fr-FR'), margin, y); y+=6;

    doc.setFontSize(12); doc.text('Températures (derniers enregistrements)', margin, y); y+=4;
    if (doc.autoTable){
        doc.autoTable({
            startY: y,
            head: [['Date/heure','Resp.','Froide','Nég.','Surg.1','Surg.2','Surg.3','Amb.','Conforme']],
            body: (donnees.temperatures||[]).slice(0,15).map(t=>[
                t.datetime? new Date(t.datetime).toLocaleString('fr-FR') : '',
                t.responsable||'',
                t.froide??'', t.negative??'', t.surgel1??'', t.surgel2??'', t.surgel3??'',
                t.ambiance??'', t.conforme? 'Oui':'Non'
            ]),
            styles:{ fontSize:8 }
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    doc.setFontSize(12); doc.text('Productions (dernières saisies)', margin, y); y+=4;
    if (doc.autoTable){
        doc.autoTable({
            startY: y,
            head: [['Date','Lot','Variété','Qté','Début','Fin','Temp.','Photos']],
            body: (donnees.productions||[]).slice(0,15).map(p=>[
                p.datetime? new Date(p.datetime).toLocaleString('fr-FR') : '',
                p.lot||'', p.variete||'', p.quantite??'',
                p.debut||'', p.fin||'', p.temperature??'', p.photos??0
            ]),
            styles:{ fontSize:8 }
        });
    }

    doc.save('rapport_pms.pdf');
    try{ afficherNotification('📄 PDF généré', 'success'); }catch(e){}
}

function chargerConfigSync(){
    const cfg = JSON.parse(localStorage.getItem('pmsSyncConfig')||'{}');
    const get = id => document.getElementById(id);
    if(get('cfg-sheets-url')) get('cfg-sheets-url').value = cfg.sheetsUrl || '';
    if(get('cfg-gh-owner')) get('cfg-gh-owner').value = cfg.ghOwner || '';
    if(get('cfg-gh-repo')) get('cfg-gh-repo').value = cfg.ghRepo || '';
    if(get('cfg-gh-branch')) get('cfg-gh-branch').value = cfg.ghBranch || 'main';
    if(get('cfg-gh-folder')) get('cfg-gh-folder').value = cfg.ghFolder || 'exports';
    if(get('cfg-gh-token')) get('cfg-gh-token').value = cfg.ghToken || '';
    if(get('cfg-auto-sync')) get('cfg-auto-sync').checked = (cfg.autoSync==='on');
    if(get('cfg-auto-every')) get('cfg-auto-every').value = cfg.autoEvery || '5';
}
function sauverConfigSync(){
    const get = id => document.getElementById(id);
    const cfg = {
        sheetsUrl: (get('cfg-sheets-url')? get('cfg-sheets-url').value : '').trim(),
        ghOwner: (get('cfg-gh-owner')? get('cfg-gh-owner').value : '').trim(),
        ghRepo: (get('cfg-gh-repo')? get('cfg-gh-repo').value : '').trim(),
        ghBranch: (get('cfg-gh-branch')? get('cfg-gh-branch').value : '').trim() || 'main',
        ghFolder: (get('cfg-gh-folder')? get('cfg-gh-folder').value : '').trim() || 'exports',
        ghToken: (get('cfg-gh-token')? get('cfg-gh-token').value : '').trim(),
        autoSync: (get('cfg-auto-sync') && get('cfg-auto-sync').checked) ? 'on' : 'off',
        autoEvery: (get('cfg-auto-every')? get('cfg-auto-every').value : '5').trim()
    };
    localStorage.setItem('pmsSyncConfig', JSON.stringify(cfg));
    try{ afficherNotification('⚙️ Paramètres enregistrés', 'success'); }catch(e){}
}

async function syncToGoogleSheets(){
    const cfg = JSON.parse(localStorage.getItem('pmsSyncConfig')||'{}');
    if(!cfg.sheetsUrl){ try{ afficherNotification('Renseigne l’URL Apps Script', 'warning'); }catch(e){} return; }
    const payload = { meta:{source:'PMS Madame Cookies', exportedAt: new Date().toISOString()}, donnees };
    try{
        const res = await fetch(cfg.sheetsUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const txt = await res.text();
        try{ afficherNotification('✅ Envoyé à Google Sheets', 'success'); }catch(e){}
        console.log('Sheets response:', txt);
    }catch(e){
        try{ afficherNotification('❌ Envoi Google Sheets échoué', 'danger'); }catch(_){}
        console.error(e);
    }
}

async function syncToGitHub(){
    const cfg = JSON.parse(localStorage.getItem('pmsSyncConfig')||'{}');
    const { ghOwner, ghRepo, ghBranch='main', ghFolder='exports', ghToken } = cfg;
    if(!ghOwner || !ghRepo || !ghToken){
        try{ afficherNotification('⚠️ Renseigne Owner, Repo et Token', 'warning'); }catch(e){}
        return;
    }
    const path = `${ghFolder.replace(/\/+/g,'/').replace(/\/$/,'')}/pms_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    const content = btoa(unescape(encodeURIComponent(snapshotDonnees())));
    const api = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${path}`;
    const body = { message: 'PMS export', content, branch: ghBranch };

    try{
        const res = await fetch(api, { method:'PUT', headers:{ 'Authorization': `token ${ghToken}`, 'Accept':'application/vnd.github+json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if(res.status >= 200 && res.status < 300){
            try{ afficherNotification('🐙 Données sauvegardées sur GitHub', 'success'); }catch(e){}
            console.log('GitHub:', data);
        }else{
            try{ afficherNotification('❌ GitHub a refusé la requête', 'danger'); }catch(e){}
            console.warn('GitHub error:', data);
        }
    }catch(e){
        try{ afficherNotification('❌ Erreur réseau GitHub', 'danger'); }catch(_){}
        console.error(e);
    }
}



// ======= MP Etiquettes + OCR + Photos persistence + Auto Sync =======
let etatProductionCourante = { mpEtiquettes: [] };
let currentMPIndex = null;

if (!donnees.photos) donnees.photos = [];
if (!donnees.mpEtiquettes) donnees.mpEtiquettes = [];

document.addEventListener('DOMContentLoaded', () => {
  try {
    if (!document.querySelector('.tab-content.active')) {
      const firstTab = document.querySelector('.tab-content');
      if (firstTab) firstTab.classList.add('active');
      const firstBtn = document.querySelector('.nav-tab');
      if (firstBtn) firstBtn.classList.add('active');
    }
  } catch(e){}
});

function ajouterMPEtiquette(nom=''){
  etatProductionCourante.mpEtiquettes.push({ nom, lot:'', photoId:null, dataURL:null });
  rendreMPEtiquettes();
}
function supprimerMPEtiquette(i){
  etatProductionCourante.mpEtiquettes.splice(i,1);
  rendreMPEtiquettes();
}
function rendreMPEtiquettes(){
  const list = document.getElementById('mp-list');
  if(!list) return;
  list.innerHTML='';
  etatProductionCourante.mpEtiquettes.forEach((mp,i)=>{
    const row = document.createElement('div');
    row.className='mp-item';
    row.innerHTML = `
      <div class="mp-fields">
        <div>
          <label class="form-label">Matière première</label>
          <input type="text" class="form-input" value="${mp.nom||''}" oninput="etatProductionCourante.mpEtiquettes[${i}].nom=this.value">
        </div>
        <div>
          <label class="form-label">N° de lot <span class="required">*</span></label>
          <input type="text" class="form-input" id="mp-lot-${i}" value="${mp.lot||''}" oninput="etatProductionCourante.mpEtiquettes[${i}].lot=this.value">
        </div>
      </div>
      <div class="mp-actions">
        <div class="mp-photo" id="mp-photo-${i}">${mp.dataURL?'<img src="'+mp.dataURL+'"/>':'📷'}</div>
        <button class="btn btn-secondary" type="button" onclick="prendrePhotoEtiquette(${i})">Photographier</button>
        <button class="btn btn-danger" type="button" onclick="supprimerMPEtiquette(${i})">Supprimer</button>
      </div>`;
    list.appendChild(row);
  });
}
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('btn-add-mp');
  if(btn) btn.addEventListener('click', ()=>{
    const nom = prompt('Nom de la matière première ?','');
    ajouterMPEtiquette(nom||'');
  });
  rendreMPEtiquettes();
});

function prendrePhotoEtiquette(i){
  currentMPIndex = i;
  ouvrirCamera('mp-label');
}

async function ocrLireTexte(dataURL){
  try{
    if('TextDetector' in window){
      const det = new window.TextDetector();
      const img = await createImageBitmap(await (await fetch(dataURL)).blob());
      const results = await det.detect(img);
      const txt = results.map(r=>r.rawValue||'').join(' ');
      if(txt && txt.length>3) return txt;
    }
  }catch(e){}
  if (window.Tesseract && window.Tesseract.recognize){
    try{
      const { data } = await Tesseract.recognize(dataURL, 'eng+fra');
      return data && data.text ? data.text : '';
    }catch(e){}
  }
  return '';
}
function extraireNumeroLot(texte){
  if(!texte) return '';
  const t = texte.replace(/\s+/g,' ').trim();
  const m1 = t.match(/(lot|batch|n[°o]\.?|nº)\s*[:\-]?\s*([A-Z0-9\-_\/\.]{3,})/i);
  if(m1) return m1[2];
  const re = /\b([A-Z0-9][A-Z0-9\-_\/\.]{4,20})\b/g; let x,c='';
  while((x=re.exec(t))){ if(/[0-9]/.test(x[1])){ c=x[1]; break; } }
  return c;
}

(function(){
  const _prendre = window.prendrePhoto;
  window.prendrePhoto = async function(){
    try{
      const video = document.getElementById('video');
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      const photoId = 'photo_' + Date.now();
      if (!donnees.photos) donnees.photos = [];
      donnees.photos.push({ id: photoId, contexte: photoContext || 'general', dataURL, ts: new Date().toISOString() });
      sauvegarderDonnees();
      const previewDiv = document.getElementById(`${photoContext}-photos`);
      if (previewDiv){
        const div = document.createElement('div');
        div.className='photo-item'; div.id = photoId;
        div.innerHTML = `<img src="${dataURL}"><button class="photo-delete" onclick="supprimerPhoto('${photoId}', '${photoContext}')">×</button>`;
        previewDiv.appendChild(div);
      }
      if (photoContext === 'mp-label' && currentMPIndex !== null){
        const mp = etatProductionCourante.mpEtiquettes[currentMPIndex];
        if(mp){
          mp.photoId = photoId;
          mp.dataURL = dataURL;
          const txt = await ocrLireTexte(dataURL);
          const lot = extraireNumeroLot(txt);
          if(lot){
            mp.lot = lot;
            const input = document.getElementById('mp-lot-'+currentMPIndex);
            if(input) input.value = lot;
            try{ afficherNotification('Lot détecté : '+lot, 'success'); }catch(e){}
          }else{
            try{ afficherNotification('Photo étiquette ajoutée. Aucun lot détecté automatiquement.', 'info'); }catch(e){}
          }
          rendreMPEtiquettes();
          currentMPIndex = null;
        }
      }
      try{ fermerCamera(); }catch(e){}
      try{ mettreAJourStatistiques(); }catch(e){}
    }catch(e){
      console.error(e);
    }
  }
})();

(function(){
  const _save = window.sauvegarderProduction;
  window.sauvegarderProduction = function(){
    const imgs = Array.from(document.querySelectorAll('#prod-photos img')).map(img => img.src);
    const before = (donnees.productions||[]).length;
    _save && _save();
    const after = (donnees.productions||[]).length;
    if (after > before){
      const prod = donnees.productions[0];
      prod.photosData = imgs.slice(0,2);
      if (etatProductionCourante.mpEtiquettes && etatProductionCourante.mpEtiquettes.length){
        prod.mpEtiquettes = etatProductionCourante.mpEtiquettes.map(m=>({nom:m.nom||'', lot:m.lot||'', photoId:m.photoId||''}));
        if (!donnees.mpEtiquettes) donnees.mpEtiquettes = [];
        donnees.mpEtiquettes.push(...prod.mpEtiquettes.map(x=>({ ...x, productionId: prod.id })));
        etatProductionCourante.mpEtiquettes = [];
        rendreMPEtiquettes();
      }
      sauvegarderDonnees();
      try{ autoSyncTrigger(); }catch(e){}
    }
  }
})();

let autoSyncTimer = null;
function getSyncConfig(){ try{ return JSON.parse(localStorage.getItem('pmsSyncConfig')||'{}'); }catch(e){ return {}; } }
function autoSyncEnabled(){ const c=getSyncConfig(); return !!c.sheetsUrl && c.autoSync==='on'; }
function startAutoSync(){
  stopAutoSync();
  const cfg = getSyncConfig();
  const every = Math.max(1, parseInt(cfg.autoEvery||'5',10));
  autoSyncTimer = setInterval(()=>{ syncToGoogleSheets(); }, every*60*1000);
  window.addEventListener('beforeunload', ()=>{ try{ navigator.sendBeacon(cfg.sheetsUrl, new Blob([snapshotDonnees()], {type:'application/json'})); }catch(e){} });
}
function stopAutoSync(){ if(autoSyncTimer){ clearInterval(autoSyncTimer); autoSyncTimer=null; } }
function autoSyncTrigger(){ if (autoSyncEnabled()){ syncToGoogleSheets(); } }
document.addEventListener('DOMContentLoaded', ()=>{
  const cfg = getSyncConfig();
  if (cfg.autoSync==='on' && cfg.sheetsUrl){ startAutoSync(); }
});
