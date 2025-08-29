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
        video.srcObject = stream;
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
    }
}

function supprimerPhoto(photoId, contexte) {
    const photoDiv = document.getElementById(photoId);
    if (photoDiv) {
        photoDiv.remove();
        afficherNotification('🗑️ Photo supprimée', 'warning');
        mettreAJourStatistiques();
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
    console.log('📄 Export PDF températures...');
    
    if (!window.jsPDF) {
        afficherNotification('❌ Bibliothèque PDF non disponible', 'danger');
        return;
    }
    
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();
    
    // Titre
    doc.setFontSize(20);
    doc.text('Rapport de Contrôle Températures', 20, 30);
    
    // Info
    doc.setFontSize(12);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 20, 45);
    doc.text('MADAME COOKIES - Système PMS', 20, 55);
    
    // Données
    let y = 70;
    doc.setFontSize(14);
    doc.text('Derniers Contrôles:', 20, y);
    
    y += 10;
    doc.setFontSize(10);
    
    donnees.temperatures.slice(0, 10).forEach(temp => {
        const date = new Date(temp.datetime).toLocaleString('fr-FR');
        const statut = temp.conforme ? 'CONFORME' : 'NON-CONFORME';
        
    donnees.temperatures.slice(0, 10).forEach(temp => {
        const date = new Date(temp.datetime).toLocaleString('fr-FR');
        const statut = temp.conforme ? 'CONFORME' : 'NON-CONFORME';
        
        doc.text(`${date} - ${temp.responsable} - ${statut}`, 20, y);
        y += 8;
        
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    });
    
    // Sauvegarde
    const filename = `temperatures_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    
    afficherNotification('📄 PDF généré avec succès', 'success');
}

function genererRapportPDF() {
    console.log('📄 Génération rapport complet...');
    
    if (!window.jsPDF) {
        afficherNotification('❌ Bibliothèque PDF non disponible', 'danger');
        return;
    }
    
    const { jsPDF } = window.jsPDF;
    const doc = new jsPDF();
    
    // Page de couverture
    doc.setFontSize(24);
    doc.text('RAPPORT PMS', 105, 60, { align: 'center' });
    doc.setFontSize(18);
    doc.text('MADAME COOKIES', 105, 80, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Période: ${new Date().toLocaleDateString('fr-FR')}`, 105, 100, { align: 'center' });
    doc.text(`Généré par: ${document.getElementById('current-user').textContent}`, 105, 115, { align: 'center' });
    
    // Statistiques
    doc.addPage();
    doc.setFontSize(16);
    doc.text('STATISTIQUES GÉNÉRALES', 20, 30);
    
    doc.setFontSize(12);
    let y = 50;
    doc.text(`• Contrôles conformes: ${donnees.temperatures.filter(t => t.conforme).length}`, 20, y);
    y += 10;
    doc.text(`• Contrôles non-conformes: ${donnees.temperatures.filter(t => !t.conforme).length}`, 20, y);
    y += 10;
    doc.text(`• Productions réalisées: ${donnees.productions.length}`, 20, y);
    y += 10;
    doc.text(`• Total photos: ${getTotalPhotos()}`, 20, y);
    
    // Températures
    if (donnees.temperatures.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('CONTRÔLES TEMPÉRATURES', 20, 30);
        
        y = 50;
        doc.setFontSize(10);
        donnees.temperatures.forEach(temp => {
            const date = new Date(temp.datetime).toLocaleString('fr-FR');
            doc.text(`${date} - ${temp.responsable}`, 20, y);
            y += 6;
            doc.text(`  Froide: ${temp.froide}°C | Négative: ${temp.negative}°C | Ambiance: ${temp.ambiance}°C`, 25, y);
            y += 6;
            doc.text(`  Statut: ${temp.conforme ? 'CONFORME' : 'NON-CONFORME'}`, 25, y);
            y += 10;
            
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });
    }
    
    // Productions
    if (donnees.productions.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('PRODUCTIONS', 20, 30);
        
        y = 50;
        doc.setFontSize(10);
        donnees.productions.forEach(prod => {
            doc.text(`Lot: ${prod.lot} - ${prod.variete}`, 20, y);
            y += 6;
            doc.text(`  Quantité: ${prod.quantite} pcs | Température: ${prod.temperature}°C`, 25, y);
            y += 6;
            doc.text(`  Horaires: ${prod.debut || 'N/A'} - ${prod.fin || 'N/A'}`, 25, y);
            y += 10;
            
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });
    }
    
    // Signature
    doc.addPage();
    doc.setFontSize(14);
    doc.text('VALIDATION', 20, 30);
    
    doc.setFontSize(12);
    doc.text('Responsable qualité:', 20, 60);
    doc.line(70, 60, 150, 60); // Ligne pour signature
    
    doc.text('Date:', 20, 90);
    doc.line(35, 90, 100, 90);
    
    doc.text('Signature:', 20, 120);
    doc.line(50, 120, 150, 120);
    
    // Sauvegarde
    const filename = `rapport_pms_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    
    afficherNotification('📄 Rapport PDF généré avec succès', 'success');
}

function getTotalPhotos() {
    return donnees.temperatures.reduce((acc, t) => acc + (t.photos || 0), 0) +
           donnees.productions.reduce((acc, p) => acc + (p.photos || 0), 0);
}

// Exports Excel (simulation)
function exporterExcel() {
    console.log('📊 Export Excel...');
    
    // Créer contenu CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // En-têtes températures
    csvContent += "TEMPERATURES\n";
    csvContent += "Date,Responsable,Froide,Negative,Surgel1,Surgel2,Surgel3,Ambiance,Conforme\n";
    
    donnees.temperatures.forEach(temp => {
        const row = [
            new Date(temp.datetime).toLocaleString('fr-FR'),
            temp.responsable,
            temp.froide || '',
            temp.negative || '',
            temp.surgel1 || '',
            temp.surgel2 || '',
            temp.surgel3 || '',
            temp.ambiance || '',
            temp.conforme ? 'OUI' : 'NON'
        ].join(',');
        csvContent += row + "\n";
    });
    
    csvContent += "\nPRODUCTIONS\n";
    csvContent += "Lot,Variete,Quantite,Debut,Fin,Temperature,Observations\n";
    
    donnees.productions.forEach(prod => {
        const row = [
            prod.lot,
            prod.variete,
            prod.quantite,
            prod.debut || '',
            prod.fin || '',
            prod.temperature || '',
            `"${prod.observations || ''}"`
        ].join(',');
        csvContent += row + "\n";
    });
    
    // Télécharger
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `donnees_pms_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    afficherNotification('📊 Export CSV téléchargé', 'success');
}

// Sauvegarde locale
function sauvegarderLocal() {
    console.log('💾 Sauvegarde locale...');
    
    const donneesBackup = {
        ...donnees,
        backup_date: new Date().toISOString(),
        version: '2.0'
    };
    
    const dataStr = JSON.stringify(donneesBackup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `backup_pms_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    afficherNotification('💾 Sauvegarde téléchargée', 'success');
}

// Fonctions de nettoyage et réception (placeholders)
function sauvegarderNettoyage() {
    console.log('🧽 Sauvegarde nettoyage...');
    afficherNotification('🧽 Nettoyage enregistré (fonction en développement)', 'success');
}

function sauvegarderReception() {
    console.log('📦 Sauvegarde réception...');
    afficherNotification('📦 Réception enregistrée (fonction en développement)', 'success');
}

function exporterProductionPDF() {
    console.log('📄 Export PDF production...');
    exporterTemperaturesPDF(); // Utilise la même base pour l'instant
}

function exporterReceptionPDF() {
    console.log('📄 Export PDF réception...');
    exporterTemperaturesPDF(); // Utilise la même base pour l'instant
}

function filtrerHistorique() {
    console.log('🔍 Filtrage historique...');
    chargerHistorique();
}

function viderHistorique() {
    if (confirm('⚠️ Êtes-vous sûr de vouloir vider l\'historique ?')) {
        donnees = {
            temperatures: [],
            productions: [],
            nettoyages: [],
            receptions: [],
            actions: {}
        };
        sauvegarderDonnees();
        chargerHistorique();
        mettreAJourStatistiques();
        afficherNotification('🗑️ Historique vidé', 'warning');
    }
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