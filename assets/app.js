// ===== JS extrait du single-file =====


        // Variables globales
        let currentTab = 'dashboard';
        let stream = null;
        let currentPhotoType = '';
        let donneesPMS = {
            temperatures: [],
            productions: [],
            nettoyages: [],
            receptions: [],
            photos: []
        };

        // Initialisation
        document.addEventListener('DOMContentLoaded', function() {
            initialiserApp();
            chargerDonnees();
            configurerNavigation();
            definirDateActuelle();
            genererNumeroLot();
            mettreAJourStatistiques();
            chargerHistorique();
        });

        function initialiserApp() {
            // Désactiver le zoom sur les inputs (mobile)
            document.addEventListener('touchstart', () => {}, { passive: true });
            
            // Empêcher le zoom sur double-tap
            let lastTouchEnd = 0;
            document.addEventListener('touchend', function (event) {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                    event.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
        }

        function definirDateActuelle() {
            const maintenant = new Date();
            document.getElementById('current-date').textContent = maintenant.toLocaleDateString('fr-FR');
            
            // Définir datetime-local
            const datetimeLocal = maintenant.toISOString().slice(0, 16);
            document.getElementById('temp-datetime').value = datetimeLocal;
            
            // Définir dates
            const aujourdhui = maintenant.toISOString().split('T')[0];
            document.getElementById('nett-date').value = aujourdhui;
            document.getElementById('recep-date').value = aujourdhui;
            document.getElementById('filtre-debut').value = aujourdhui;
            document.getElementById('filtre-fin').value = aujourdhui;
            
            // Définir heure actuelle pour production
            const heureActuelle = maintenant.toTimeString().slice(0, 5);
            document.getElementById('prod-debut').value = heureActuelle;
        }

        function configurerNavigation() {
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    changerOnglet(tabId);
                });
            });
        }

        function changerOnglet(tabId) {
            // Désactiver tous les onglets
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Activer l'onglet sélectionné
            document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            currentTab = tabId;
        }

        // Gestion des données
        function sauvegarderDonnees() {
            try {
                const dataString = JSON.stringify(donneesPMS);
                localStorage.setItem('pms_madame_cookies_v2', dataString);
                console.log('✅ Données sauvegardées');
                return true;
            } catch (error) {
                console.error('❌ Erreur sauvegarde:', error);
                afficherAlerte('❌ Erreur de sauvegarde', 'danger');
                return false;
            }
        }

        function chargerDonnees() {
            try {
                const savedData = localStorage.getItem('pms_madame_cookies_v2');
                if (savedData) {
                    donneesPMS = JSON.parse(savedData);
                    console.log('✅ Données chargées:', Object.keys(donneesPMS).map(k => `${k}: ${donneesPMS[k].length}`));
                }
            } catch (error) {
                console.error('❌ Erreur chargement:', error);
                donneesPMS = {
                    temperatures: [],
                    productions: [],
                    nettoyages: [],
                    receptions: [],
                    photos: []
                };
            }
        }

        // Gestion des températures
        function verifierTemperature(input, cible, tolerance, type = 'range') {
            const valeur = parseFloat(input.value);
            if (isNaN(valeur)) return;
            
            let conforme = false;
            
            if (type === 'max') {
                conforme = valeur <= cible;
            } else {
                conforme = valeur >= (cible - tolerance) && valeur <= (cible + tolerance);
            }
            
            input.classList.remove('alert');
            
            if (!conforme) {
                input.classList.add('alert');
                
                // Vibration si supportée
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]);
                }
                
                const equipement = input.previousElementSibling.textContent.split('(')[0];
                afficherAlerte(`⚠️ ALERTE: ${equipement} = ${valeur}°C - Hors limites !`, 'danger');
                
                // Actions correctives automatiques
                const suggestions = {
                    'temp-froide': 'Vérifier joint porte, appeler maintenance froid',
                    'temp-negative': 'Contrôler dégivrage, vérifier compresseur', 
                    'temp-surgel': 'Transférer produits urgence, maintenance immédiate',
                    'temp-ambiance': 'Améliorer ventilation, climatisation'
                };
                
                const suggestion = suggestions[input.id] || 'Maintenance nécessaire';
                document.getElementById('temp-actions').value = `ALERTE TEMP ${valeur}°C: ${suggestion}`;
            }
            
            return conforme;
        }

        function sauvegarderTemperatures() {
            if (!validerFormulaireTemperatures()) return;
            
            const controle = {
                id: Date.now(),
                datetime: document.getElementById('temp-datetime').value,
                responsable: document.getElementById('temp-responsable').value,
                temperatures: {
                    froide: parseFloat(document.getElementById('temp-froide').value) || null,
                    negative: parseFloat(document.getElementById('temp-negative').value) || null,
                    surgel1: parseFloat(document.getElementById('temp-surgel1').value) || null,
                    surgel2: parseFloat(document.getElementById('temp-surgel2').value) || null,
                    surgel3: parseFloat(document.getElementById('temp-surgel3').value) || null,
                    ambiance: parseFloat(document.getElementById('temp-ambiance').value) || null
                },
                actions: document.getElementById('temp-actions').value,
                photos: obtenirPhotosParType('temperatures'),
                statut: calculerStatutTemperatures(),
                created_at: new Date().toISOString()
            };
            
            donneesPMS.temperatures.push(controle);
            
            if (sauvegarderDonnees()) {
                ajouterLigneHistoriqueTemp(controle);
                resetFormulaireTemperatures();
                afficherAlerte('✅ Contrôle température enregistré !', 'success');
                mettreAJourStatistiques();
                
                // Vibration succès
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            }
        }

        function validerFormulaireTemperatures() {
            const inputs = ['temp-froide', 'temp-negative', 'temp-surgel1', 'temp-surgel2', 'temp-surgel3', 'temp-ambiance'];
            let auMoinsUneValeur = false;
            
            inputs.forEach(id => {
                const input = document.getElementById(id);
                if (input.value) {
                    auMoinsUneValeur = true;
                }
            });
            
            if (!auMoinsUneValeur) {
                afficherAlerte('⚠️ Veuillez saisir au moins une température', 'warning');
                return false;
            }
            
            return true;
        }

        function calculerStatutTemperatures() {
            const inputs = ['temp-froide', 'temp-negative', 'temp-surgel1', 'temp-surgel2', 'temp-surgel3', 'temp-ambiance'];
            let conformes = 0;
            let total = 0;
            
            inputs.forEach(id => {
                const input = document.getElementById(id);
                if (input.value) {
                    total++;
                    if (!input.classList.contains('alert')) {
                        conformes++;
                    }
                }
            });
            
            if (conformes === total) return 'conforme';
            if (conformes > 0) return 'partiel';
            return 'non-conforme';
        }

        function resetFormulaireTemperatures() {
            ['temp-froide', 'temp-negative', 'temp-surgel1', 'temp-surgel2', 'temp-surgel3', 'temp-ambiance'].forEach(id => {
                const input = document.getElementById(id);
                input.value = '';
                input.classList.remove('alert');
            });
            document.getElementById('temp-actions').value = '';
            document.getElementById('temp-photos').innerHTML = '';
            
            // Nouvelle datetime
            document.getElementById('temp-datetime').value = new Date().toISOString().slice(0, 16);
        }

        function ajouterLigneHistoriqueTemp(controle) {
            const tbody = document.getElementById('table-temperatures');
            const row = tbody.insertRow(0);
            
            const date = new Date(controle.datetime).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit', 
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const statusClass = controle.statut === 'conforme' ? 'status-conforme' : 
                               controle.statut === 'partiel' ? 'status-non-conforme' : 'status-non-conforme';
            
            row.innerHTML = `
                <td>${date}</td>
                <td>${controle.temperatures.froide || '-'}°C</td>
                <td>${controle.temperatures.negative || '-'}°C</td>
                <td>${controle.temperatures.surgel1 || '-'}°C</td>
                <td>${controle.temperatures.surgel2 || '-'}°C</td>
                <td>${controle.temperatures.surgel3 || '-'}°C</td>
                <td>${controle.temperatures.ambiance || '-'}°C</td>
                <td><span class="status-badge ${statusClass}">${controle.statut}</span></td>
            `;
            
            // Limiter à 10 lignes
            while (tbody.rows.length > 10) {
                tbody.deleteRow(tbody.rows.length - 1);
            }
        }

        // Gestion de la production
        function genererNumeroLot() {
            const today = new Date();
            const year = today.getFullYear().toString().substr(-2);
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            
            // Compter les lots du jour
            const lotsAujourdhui = donneesPMS.productions.filter(p => {
                const prodDate = new Date(p.datetime || p.created_at);
                return prodDate.toDateString() === today.toDateString();
            }).length;
            
            const numeroLot = (lotsAujourdhui + 1).toString().padStart(2, '0');
            const lotId = `MC-${year}${month}${day}-${numeroLot}`;
            
            document.getElementById('prod-lot').value = lotId;
        }

        function sauvegarderProduction() {
            if (!validerFormulaireProduction()) return;
            
            const production = {
                id: Date.now(),
                datetime: new Date().toISOString(),
                lot: document.getElementById('prod-lot').value,
                variete: document.getElementById('prod-variete').value,
                quantite: parseInt(document.getElementById('prod-quantite').value),
                heureDebut: document.getElementById('prod-debut').value,
                heureFin: document.getElementById('prod-fin').value,
                temperature: parseFloat(document.getElementById('prod-temperature').value),
                controles: {
                    tempMP: document.getElementById('ctrl-temp-mp').checked,
                    proprete: document.getElementById('ctrl-proprete').checked,
                    hygiene: document.getElementById('ctrl-hygiene').checked,
                    cuisson: document.getElementById('ctrl-cuisson').checked,
                    aspect: document.getElementById('ctrl-aspect').checked,
                    refroid: document.getElementById('ctrl-refroid').checked
                },
                observations: document.getElementById('prod-observations').value,
                photos: obtenirPhotosParType('production'),
                responsable: document.getElementById('current-user').textContent,
                created_at: new Date().toISOString()
            };
            
            donneesPMS.productions.push(production);
            
            if (sauvegarderDonnees()) {
                resetFormulaireProduction();
                afficherAlerte('✅ Production enregistrée !', 'success');
                mettreAJourStatistiques();
                genererNumeroLot();
                
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            }
        }

        function validerFormulaireProduction() {
            const variete = document.getElementById('prod-variete').value;
            const quantite = document.getElementById('prod-quantite').value;
            
            if (!variete) {
                afficherAlerte('⚠️ Veuillez sélectionner une variété de cookie', 'warning');
                return false;
            }
            
            if (!quantite || quantite <= 0) {
                afficherAlerte('⚠️ Veuillez saisir une quantité valide', 'warning');
                return false;
            }
            
            return true;
        }

        function resetFormulaireProduction() {
            document.getElementById('prod-variete').selectedIndex = 0;
            document.getElementById('prod-quantite').value = '';
            document.getElementById('prod-temperature').value = '';
            document.getElementById('prod-observations').value = '';
            document.getElementById('prod-photos').innerHTML = '';
            
            // Reset checkboxes
            ['ctrl-temp-mp', 'ctrl-proprete', 'ctrl-hygiene', 'ctrl-cuisson', 'ctrl-aspect', 'ctrl-refroid'].forEach(id => {
                document.getElementById(id).checked = false;
            });
            
            // Nouvelle heure de début
            document.getElementById('prod-debut').value = new Date().toTimeString().slice(0, 5);
            document.getElementById('prod-fin').value = '';
        }

        // Gestion du nettoyage
        function sauvegarderNettoyage() {
            if (!validerFormulaireNettoyage()) return;
            
            const zonesSelectionnees = [];
            document.querySelectorAll('.zone-check:checked').forEach(checkbox => {
                zonesSelectionnees.push({
                    zone: checkbox.dataset.zone,
                    nom: checkbox.parentElement.textContent.trim()
                });
            });
            
            const nettoyage = {
                id: Date.now(),
                date: document.getElementById('nett-date').value,
                equipe: document.getElementById('nett-equipe').value,
                type: document.getElementById('nett-type').value,
                zones: zonesSelectionnees,
                observations: document.getElementById('nett-observations').value,
                photos: obtenirPhotosParType('nettoyage'),
                created_at: new Date().toISOString()
            };
            
            donneesPMS.nettoyages.push(nettoyage);
            
            if (sauvegarderDonnees()) {
                resetFormulaireNettoyage();
                afficherAlerte('✅ Plan de nettoyage enregistré !', 'success');
                mettreAJourStatistiques();
                
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            }
        }

        function validerFormulaireNettoyage() {
            const zonesChecked = document.querySelectorAll('.zone-check:checked').length;
            
            if (zonesChecked === 0) {
                afficherAlerte('⚠️ Veuillez sélectionner au moins une zone à nettoyer', 'warning');
                return false;
            }
            
            return true;
        }

        function resetFormulaireNettoyage() {
            document.querySelectorAll('.zone-check').forEach(checkbox => {
                checkbox.checked = false;
            });
            document.getElementById('nett-observations').value = '';
            document.getElementById('nett-photos').innerHTML = '';
        }

        // Gestion de la réception
        function sauvegarderReception() {
            if (!validerFormulaireReception()) return;
            
            const reception = {
                id: Date.now(),
                date: document.getElementById('recep-date').value,
                fournisseur: document.getElementById('recep-fournisseur').value,
                bonLivraison: document.getElementById('recep-bl').value,
                receptionnaire: document.getElementById('recep-nom').value,
                controles: {
                    vehicule: document.getElementById('ctrl-vehicule').checked,
                    temperature: document.getElementById('ctrl-temperature-transport').checked,
                    chauffeur: document.getElementById('ctrl-chauffeur').checked,
                    protection: document.getElementById('ctrl-protection').checked
                },
                decision: document.getElementById('recep-decision').value,
                observations: document.getElementById('recep-observations').value,
                photos: obtenirPhotosParType('reception'),
                created_at: new Date().toISOString()
            };
            
            donneesPMS.receptions.push(reception);
            
            if (sauvegarderDonnees()) {
                resetFormulaireReception();
                afficherAlerte('✅ Réception enregistrée !', 'success');
                mettreAJourStatistiques();
                
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            }
        }

        function validerFormulaireReception() {
            const fournisseur = document.getElementById('recep-fournisseur').value;
            const bl = document.getElementById('recep-bl').value;
            
            if (!fournisseur || fournisseur === '-- Sélectionner --') {
                afficherAlerte('⚠️ Veuillez sélectionner un fournisseur', 'warning');
                return false;
            }
            
            if (!bl) {
                afficherAlerte('⚠️ Veuillez saisir le numéro de bon de livraison', 'warning');
                return false;
            }
            
            return true;
        }

        function resetFormulaireReception() {
            document.getElementById('recep-fournisseur').selectedIndex = 0;
            document.getElementById('recep-bl').value = '';
            document.getElementById('recep-observations').value = '';
            document.getElementById('recep-photos').innerHTML = '';
            document.getElementById('recep-decision').selectedIndex = 0;
            
            ['ctrl-vehicule', 'ctrl-temperature-transport', 'ctrl-chauffeur', 'ctrl-protection'].forEach(id => {
                document.getElementById(id).checked = false;
            });
        }

        // Gestion de la caméra
        function ouvrirCamera(type) {
            currentPhotoType = type;
            document.getElementById('modalCamera').style.display = 'block';
            
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',  // Caméra arrière en priorité
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                })
                .then(function(mediaStream) {
                    stream = mediaStream;
                    const video = document.getElementById('video');
                    video.srcObject = stream;
                    video.play();
                })
                .catch(function(err) {
                    console.error('Erreur caméra:', err);
                    afficherAlerte('❌ Impossible d\'accéder à la caméra. Vérifiez les permissions.', 'danger');
                    fermerCamera();
                });
            } else {
                afficherAlerte('❌ Caméra non supportée sur cet appareil', 'danger');
                fermerCamera();
            }
        }

        function fermerCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            document.getElementById('modalCamera').style.display = 'none';
        }

        function prendrePhoto() {
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');
            const context = canvas.getContext('2d');
            
            // Définir taille optimale pour mobile
            canvas.width = Math.min(video.videoWidth, 800);
            canvas.height = Math.min(video.videoHeight, 600);
            
            // Dessiner l'image
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convertir en base64 avec compression
            const dataURL = canvas.toDataURL('image/jpeg', 0.7);
            
            // Créer objet photo
            const photo = {
                id: Date.now(),
                type: currentPhotoType,
                dataURL: dataURL,
                timestamp: new Date().toISOString(),
                size: Math.round(dataURL.length * 0.75) // Estimation taille
            };
            
            // Ajouter à la collection
            donneesPMS.photos.push(photo);
            
            // Afficher l'aperçu
            ajouterPhotoApercu(photo);
            
            sauvegarderDonnees();
            fermerCamera();
            
            afficherAlerte('📷 Photo ajoutée avec succès !', 'success');
            
            // Vibration succès
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
        }

        function ajouterPhotoApercu(photo) {
            const preview = document.getElementById(`${photo.type}-photos`);
            if (!preview) return;
            
            const photoDiv = document.createElement('div');
            photoDiv.className = 'photo-item';
            photoDiv.innerHTML = `
                <img src="${photo.dataURL}" alt="Photo ${photo.type}" loading="lazy">
                <button class="photo-delete" onclick="supprimerPhoto(${photo.id})" title="Supprimer">×</button>
            `;
            
            preview.appendChild(photoDiv);
        }

        function supprimerPhoto(photoId) {
            // Confirmer suppression
            if (!confirm('Supprimer cette photo ?')) return;
            
            // Supprimer de la collection
            donneesPMS.photos = donneesPMS.photos.filter(photo => photo.id !== photoId);
            
            // Supprimer de l'interface
            document.querySelectorAll('.photo-item').forEach(item => {
                const deleteBtn = item.querySelector('.photo-delete');
                if (deleteBtn && deleteBtn.onclick.toString().includes(photoId.toString())) {
                    item.remove();
                }
            });
            
            sauvegarderDonnees();
            afficherAlerte('🗑️ Photo supprimée', 'warning');
            mettreAJourStatistiques();
        }

        function obtenirPhotosParType(type) {
            return donneesPMS.photos.filter(photo => photo.type === type);
        }

        // Gestion des statistiques
        function mettreAJourStatistiques() {
            const conformes = donneesPMS.temperatures.filter(t => t.statut === 'conforme').length;
            const nonConformes = donneesPMS.temperatures.filter(t => t.statut === 'non-conforme').length;
            const productions = donneesPMS.productions.length;
            const photos = donneesPMS.photos.length;
            
            document.getElementById('stat-conformes').textContent = conformes;
            document.getElementById('stat-non-conformes').textContent = nonConformes;
            document.getElementById('stat-productions').textContent = productions;
            document.getElementById('stat-photos').textContent = photos;
            
            // Mettre à jour les actions du jour
            mettreAJourActionsDuJour();
        }

        function mettreAJourActionsDuJour() {
            const aujourdhui = new Date().toDateString();
            
            // Vérifier si température du matin faite
            const tempMatin = donneesPMS.temperatures.some(t => {
                const date = new Date(t.datetime);
                return date.toDateString() === aujourdhui && date.getHours() < 10;
            });
            document.getElementById('action-temp-matin').checked = tempMatin;
            
            // Vérifier si production saisie
            const prodAujourdhui = donneesPMS.productions.some(p => {
                const date = new Date(p.created_at);
                return date.toDateString() === aujourdhui;
            });
            document.getElementById('action-production').checked = prodAujourdhui;
            
            // Vérifier température midi
            const tempMidi = donneesPMS.temperatures.some(t => {
                const date = new Date(t.datetime);
                return date.toDateString() === aujourdhui && date.getHours() >= 12;
            });
            document.getElementById('action-temp-midi').checked = tempMidi;
            
            // Vérifier nettoyage
            const nettoyageAujourdhui = donneesPMS.nettoyages.some(n => {
                const date = new Date(n.created_at);
                return date.toDateString() === aujourdhui;
            });
            document.getElementById('action-nettoyage').checked = nettoyageAujourdhui;
        }

        // Gestion des alertes
        function afficherAlerte(message, type) {
            const alerteDiv = document.createElement('div');
            alerteDiv.className = `alert alert-${type} floating-alert`;
            alerteDiv.innerHTML = message;
            
            document.body.appendChild(alerteDiv);
            
            // Supprimer après 4 secondes
            setTimeout(() => {
                if (document.body.contains(alerteDiv)) {
                    alerteDiv.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (document.body.contains(alerteDiv)) {
                            document.body.removeChild(alerteDiv);
                        }
                    }, 300);
                }
            }, 4000);
        }

        // Gestion de l'historique
        function chargerHistorique() {
            const tbody = document.getElementById('table-historique');
            tbody.innerHTML = '';
            
            // Combiner tous les contrôles
            const toutesLesEntrees = [
                ...donneesPMS.temperatures.map(t => ({...t, type: 'Températures', icon: '🌡️'})),
                ...donneesPMS.productions.map(p => ({...p, type: 'Production', icon: '🏭'})),
                ...donneesPMS.nettoyages.map(n => ({...n, type: 'Nettoyage', icon: '🧽'})),
                ...donneesPMS.receptions.map(r => ({...r, type: 'Réception', icon: '📦'}))
            ];
            
            // Trier par date (plus récent en premier)
            toutesLesEntrees.sort((a, b) => {
                const dateA = new Date(a.datetime || a.date || a.created_at);
                const dateB = new Date(b.datetime || b.date || b.created_at);
                return dateB - dateA;
            });
            
            // Afficher les 15 derniers
            toutesLesEntrees.slice(0, 15).forEach(item => {
                const row = tbody.insertRow();
                const date = new Date(item.datetime || item.date || item.created_at);
                const dateFormatee = date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const photos = obtenirPhotosParType(item.type.toLowerCase()).length;
                const statut = item.statut || item.decision || 'Terminé';
                const statusClass = statut.includes('conforme') ? 'status-conforme' : 'status-conforme';
                
                row.innerHTML = `
                    <td>${dateFormatee}</td>
                    <td>${item.icon} ${item.type}</td>
                    <td>${item.responsable || item.equipe || item.receptionnaire || 'N/A'}</td>
                    <td><span class="status-badge ${statusClass}">${statut}</span></td>
                    <td>${photos > 0 ? `📷 ${photos}` : '-'}</td>
                `;
            });
        }

        function filtrerHistorique() {
            const debut = document.getElementById('filtre-debut').value;
            const fin = document.getElementById('filtre-fin').value;
            const type = document.getElementById('filtre-type').value;
            
            // Pour cette version simplifiée, on recharge tout
            // Dans une version serveur, on ferait une requête filtrée
            chargerHistorique();
            
            afficherAlerte('🔍 Historique mis à jour', 'success');
        }

        // Fonctions d'export
        function exporterTemperaturesPDF() {
            const data = donneesPMS.temperatures;
            const contenu = genererContenuExport('Températures', data);
            telechargerFichier(contenu, 'temperatures');
        }

        function exporterProductionPDF() {
            const data = donneesPMS.productions;
            const contenu = genererContenuExport('Production', data);
            telechargerFichier(contenu, 'production');
        }

        function exporterNettoyagePDF() {
            const data = donneesPMS.nettoyages;
            const contenu = genererContenuExport('Nettoyage', data);
            telechargerFichier(contenu, 'nettoyage');
        }

        function exporterCompletPDF() {
            const data = {
                entreprise: {
                    nom: 'MADAME COOKIES',
                    siret: '94389212500015',
                    adresse: '36 RUE RAYMOND MONDON 97419 LA POSSESSION',
                    responsable: 'Nylaime MAMODALY BANDJEE'
                },
                periode: {
                    debut: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
                    fin: new Date().toISOString().split('T')[0]
                },
                donnees: donneesPMS,
                statistiques: {
                    totalControles: donneesPMS.temperatures.length,
                    conformes: donneesPMS.temperatures.filter(t => t.statut === 'conforme').length,
                    productions: donneesPMS.productions.length,
                    nettoyages: donneesPMS.nettoyages.length,
                    photos: donneesPMS.photos.length
                },
                genere_le: new Date().toISOString()
            };
            
            const contenu = JSON.stringify(data, null, 2);
            telechargerFichier(contenu, 'PMS-COMPLET-DAAF', 'json');
        }

        function exporterExcel() {
            // Générer CSV simple pour Excel
            let csvContent = "Type,Date,Responsable,Statut,Details\n";
            
            // Températures
            donneesPMS.temperatures.forEach(t => {
                csvContent += `Température,"${t.datetime}","${t.responsable}","${t.statut}","Froide: ${t.temperatures.froide}°C Négative: ${t.temperatures.negative}°C"\n`;
            });
            
            // Productions
            donneesPMS.productions.forEach(p => {
                csvContent += `Production,"${p.created_at}","${p.responsable}","Terminé","Lot: ${p.lot} Variété: ${p.variete} Quantité: ${p.quantite}"\n`;
            });
            
            // Nettoyages
            donneesPMS.nettoyages.forEach(n => {
                csvContent += `Nettoyage,"${n.created_at}","${n.equipe}","Terminé","Type: ${n.type} Zones: ${n.zones.length}"\n`;
            });
            
            telechargerFichier(csvContent, 'donnees-excel', 'csv');
        }

        function genererContenuExport(type, data) {
            return `RAPPORT ${type.toUpperCase()} - MADAME COOKIES
===========================================

Entreprise: MADAME COOKIES
SIRET: 94389212500015
Adresse: 36 RUE RAYMOND MONDON 97419 LA POSSESSION

Période: ${new Date().toLocaleDateString('fr-FR')}
Nombre d'enregistrements: ${data.length}

DONNÉES:
${JSON.stringify(data, null, 2)}

Rapport généré automatiquement le ${new Date().toLocaleString('fr-FR')}
Système PMS v2.0 - Application certifiée DAAF`;
        }

        function telechargerFichier(contenu, nom, extension = 'txt') {
            const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${nom}-${new Date().toISOString().split('T')[0]}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            afficherAlerte(`📄 Export ${nom} téléchargé !`, 'success');
        }

        // Auto-save toutes les 2 minutes
        setInterval(() => {
            if (donneesPMS && Object.values(donneesPMS).some(arr => arr.length > 0)) {
                sauvegarderDonnees();
            }
        }, 2 * 60 * 1000);

        // Gestion des événements tactiles
        document.addEventListener('touchstart', function(e) {
            // Améliorer la réactivité tactile
        }, { passive: true });

        // Prévenir la fermeture accidentelle
        window.addEventListener('beforeunload', function(e) {
            if (Object.values(donneesPMS).some(arr => arr.length > 0)) {
                e.preventDefault();
                e.returnValue = '';
                return 'Des données non sauvegardées pourraient être perdues.';
            }
        });

        // Style pour l'animation de sortie
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

    
// === Fallback Caméra (input capture) ===
function setupCameraFallback(){
    if (!document.getElementById('camera-fallback-input')){
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.id = 'camera-fallback-input';
        input.style.display = 'none';
        input.addEventListener('change', async (e)=>{
            const f = e.target.files && e.target.files[0];
            if(!f) return;
            const r = new FileReader();
            r.onload = ()=>{
                const dataURL = r.result;
                const photo = {
                    id: Date.now(),
                    type: currentPhotoType || 'production',
                    dataURL,
                    timestamp: new Date().toISOString()
                };
                donneesPMS.photos.push(photo);
                if (typeof ajouterPhotoApercu === 'function') ajouterPhotoApercu(photo);
                if (typeof sauvegarderDonnees === 'function') sauvegarderDonnees();
                if (navigator.vibrate) navigator.vibrate(100);
            };
            r.readAsDataURL(f);
        });
        document.body.appendChild(input);
    }
}
function ouvrirCameraFallback(){
    setupCameraFallback();
    const input = document.getElementById('camera-fallback-input');
    if(input) input.click();
}

// === Override ouvrirCamera pour utiliser fallback si getUserMedia échoue ===
(function(){
    const _open = window.ouvrirCamera;
    window.ouvrirCamera = function(type){
        if (typeof _open === 'function'){
            try{
                currentPhotoType = type;
                _open(type);
            }catch(e){
                try{ fermerCamera(); }catch(_){}
                ouvrirCameraFallback();
            }
        }else{
            currentPhotoType = type;
            ouvrirCameraFallback();
        }
    }
})();

// === MP Étiquettes + OCR ===
let etatProductionCourante = { mpEtiquettes: [] };
let currentMPIndex = null;

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
    etatProductionCourante.mpEtiquettes.forEach((mp, i)=>{
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
            </div>
        `;
        list.appendChild(row);
    });
}

function initialiserMPEtiquettesUI(){
    const btn = document.getElementById('btn-add-mp');
    if(btn){ btn.onclick = ()=>{ const nom = prompt('Nom de la matière première ?',''); ajouterMPEtiquette(nom||''); }; }
    rendreMPEtiquettes();
}

function prendrePhotoEtiquette(i){
    currentMPIndex = i;
    ouvrirCamera('mp-label');
}

// OCR utilitaires
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
    const re1 = /(lot|batch|n[°o]\.?|nº)\s*[:\-]?\s*([A-Z0-9\-_\/\.]{3,})/i;
    const m1 = t.match(re1);
    if(m1) return m1[2];
    const re2 = /\b([A-Z0-9][A-Z0-9\-_\/\.]{4,20})\b/g;
    let x, cand='';
    while((x = re2.exec(t))){
        if(/[0-9]/.test(x[1])){ cand = x[1]; break; }
    }
    return cand;
}

// Hook sur prendrePhoto pour OCR si type 'mp-label'
(function(){
    const _prendre = window.prendrePhoto;
    window.prendrePhoto = async function(){
        if(typeof _prendre === 'function'){ _prendre(); }
        try{
            const last = donneesPMS.photos[donneesPMS.photos.length-1];
            if(!last) return;
            if(currentPhotoType === 'mp-label' && currentMPIndex !== null){
                etatProductionCourante.mpEtiquettes[currentMPIndex].photoId = last.id;
                etatProductionCourante.mpEtiquettes[currentMPIndex].dataURL = last.dataURL;
                const txt = await ocrLireTexte(last.dataURL);
                const lot = extraireNumeroLot(txt);
                if(lot){
                    etatProductionCourante.mpEtiquettes[currentMPIndex].lot = lot;
                    const input = document.getElementById('mp-lot-'+currentMPIndex);
                    if(input) input.value = lot;
                    if (typeof afficherAlerte === 'function') afficherAlerte('Lot détecté : '+lot, 'success');
                }
                rendreMPEtiquettes();
                currentMPIndex = null;
            }
        }catch(e){}
    }
})();

// Validation renforcée Production
(function(){
    const _valider = window.validerFormulaireProduction;
    window.validerFormulaireProduction = function(){
        // MPs obligatoires avec photo + lot
        const arr = (etatProductionCourante.mpEtiquettes||[]);
        if(arr.length === 0){
            if (typeof afficherAlerte === 'function') afficherAlerte('Ajoute les étiquettes des matières premières.', 'warning');
            return false;
        }
        const missing = arr.filter(mp=>!mp.photoId || !mp.lot);
        if(missing.length>0){
            if (typeof afficherAlerte === 'function') afficherAlerte('Chaque MP doit avoir une photo + un N° de lot.', 'warning');
            return false;
        }
        return _valider ? _valider() : true;
    }
})();



