// app-organigramme.js — logique de la page Organigramme
// CONFIG, supabaseClient, toast, val, escapeHtml, garantirSessionRH etc. viennent de shared.js

let employees = [];
let pendingTemplates = [];
let editingEmployeeId = null;
let employeeListSelection = new Set();

const DEFAULT_SERVICES = ["Direction", "Finance", "Tech", "Ventes", "Marketing", "RH", "Opérations"];
const COULEURS_SERVICE = ['#B8863B', '#2F7D5C', '#4A6FA5', '#A5504A', '#6B5B95', '#3E8E8E'];

function couleurService(service) {
    const s = service || "Général";
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return COULEURS_SERVICE[Math.abs(hash) % COULEURS_SERVICE.length];
}

function initiales(prenom, nom) {
    return `${(prenom || '?').charAt(0)}${(nom || '?').charAt(0)}`.toUpperCase();
}

// ============================================================
// MANAGER (menu déroulant fiable)
// ============================================================
function populateManagerSelect() {
    const select = document.getElementById('empManagerSelect');
    if (!select) return;
    const valeurActuelle = select.value;

    const options = employees
        .filter(e => e.id !== editingEmployeeId)
        .map(e => `<option value="${escapeHtml(e.prenom + ' ' + e.nom)}">${escapeHtml(e.prenom)} ${escapeHtml(e.nom)} — ${escapeHtml(e.poste) || '—'}</option>`)
        .join('');

    select.innerHTML = `
        <option value="">${t("— Aucun (sommet de l'organigramme) —")}</option>
        ${options}
        <option value="__externe__">${t("Autre / externe (preciser)...")}</option>
    `;

    if ([...select.options].some(o => o.value === valeurActuelle)) {
        select.value = valeurActuelle;
    }
}

function gererChangementManager() {
    const select = document.getElementById('empManagerSelect');
    const externe = document.getElementById('empManagerExterne');
    externe.classList.toggle('hidden', select.value !== '__externe__');
}

function lireManagerSaisi() {
    const select = document.getElementById('empManagerSelect');
    if (select.value === '__externe__') return val('empManagerExterne');
    return select.value;
}

function setManagerFieldValue(managerText) {
    const select = document.getElementById('empManagerSelect');
    const externe = document.getElementById('empManagerExterne');
    if (!managerText) {
        select.value = "";
        externe.classList.add('hidden');
        externe.value = "";
        return;
    }
    const correspond = [...select.options].some(o => o.value === managerText);
    if (correspond) {
        select.value = managerText;
        externe.classList.add('hidden');
        externe.value = "";
    } else {
        select.value = "__externe__";
        externe.classList.remove('hidden');
        externe.value = managerText;
    }
}

// ============================================================
// FORMULAIRE : AJOUT / ÉDITION
// ============================================================
function viderFormulaireEmploye() {
    ['empPrenom', 'empNom', 'empPoste', 'empService', 'empEmail', 'empDate'].forEach(id => {
        document.getElementById(id).value = "";
    });
    setManagerFieldValue("");
    document.getElementById('editionBanner').classList.add('hidden');
    document.getElementById('templateSelect').value = "";
    editingEmployeeId = null;
    populateManagerSelect();
    document.getElementById('empSubmitBtn').innerText = "Ajouter cet employé";
}

function modifierEmploye(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    editingEmployeeId = id;
    populateManagerSelect();

    document.getElementById('empPrenom').value = emp.prenom || "";
    document.getElementById('empNom').value = emp.nom || "";
    document.getElementById('empPoste').value = emp.poste || "";
    document.getElementById('empService').value = emp.service || "";
    setManagerFieldValue(emp.manager || "");
    document.getElementById('empEmail').value = emp.email || "";
    document.getElementById('empDate').value = emp.date_arrivee || "";

    document.getElementById('editionNomLabel').innerText = `${emp.prenom} ${emp.nom}`;
    document.getElementById('editionBanner').classList.remove('hidden');
    document.getElementById('empSubmitBtn').innerText = "Enregistrer les modifications";

    document.querySelector('.page').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function supprimerEmploye(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const ok = await confirmerAction(t("Supprimer définitivement {nom} ? Son lien d'onboarding cessera de fonctionner.", { nom: `${emp.prenom} ${emp.nom}` }));
    if (!ok) return;

    const { error } = await supabaseClient.from('employees').delete().eq('id', id);
    if (error) { toast(t("Erreur lors de la suppression."), "error"); return; }
    if (editingEmployeeId === id) viderFormulaireEmploye();
    toast(t('{nom} supprimé(e).', { nom: `${emp.prenom} ${emp.nom}` }));
    await chargerEmployes();
}

async function enregistrerEmploye() {
    const prenom = val('empPrenom');
    const nom = val('empNom');
    const poste = val('empPoste');
    const service = val('empService') || "Général";
    const manager = lireManagerSaisi();
    const email = val('empEmail');
    const date = val('empDate');

    if (!prenom || !nom) {
        toast(t("Merci de renseigner au minimum le prénom et le nom."), "error");
        return;
    }
    if (email && !emailEstValide(email)) {
        toast(t("L'adresse email ne semble pas valide."), "error");
        return;
    }

    const btn = document.getElementById('empSubmitBtn');
    btn.disabled = true;

    try {
        if (editingEmployeeId) {
            const { error } = await supabaseClient
                .from('employees')
                .update({ prenom, nom, poste, service, manager, email, date_arrivee: date || null })
                .eq('id', editingEmployeeId);
            if (error) throw error;
            toast(t('Fiche de {nom} mise à jour.', { nom: `${prenom} ${nom}` }));
        } else {
            const token = genererToken();
            const { error } = await supabaseClient
                .from('employees')
                .insert([{ org_id: currentOrg.id, token, prenom, nom, poste, service, manager, email, date_arrivee: date || null }]);
            if (error) throw error;
            toast(t('{nom} ajouté(e) à l\'organigramme.', { nom: `${prenom} ${nom}` }));
        }

        viderFormulaireEmploye();
        await chargerEmployes();
    } catch (err) {
        console.error(err);
        toast(t("Erreur lors de l'enregistrement."), "error");
    } finally {
        btn.disabled = false;
    }
}

// ============================================================
// MODÈLES DE POSTE
// ============================================================
function ajouterModelePoste() {
    const nom = val('templateNom');
    const poste = val('templatePoste');
    const service = val('templateService');
    const manager = val('templateManager');
    if (!nom || !poste) { toast(t("Renseigne au moins un nom de modèle et un poste."), "error"); return; }
    pendingTemplates.push({ nom, poste, service, manager });
    ['templateNom', 'templatePoste', 'templateService', 'templateManager'].forEach(id => document.getElementById(id).value = "");
    renderTemplatesListRH();
    populateTemplateSelect();
    sauvegarderTemplates();
}

function retirerModelePoste(index) {
    pendingTemplates.splice(index, 1);
    renderTemplatesListRH();
    populateTemplateSelect();
    sauvegarderTemplates();
}

async function sauvegarderTemplates() {
    const { error } = await supabaseClient.from('organizations').update({ job_templates: pendingTemplates }).eq('id', currentOrg.id);
    if (error) { toast(t("Erreur lors de l'enregistrement du modèle."), "error"); return; }
    currentOrg.job_templates = pendingTemplates;
}

function renderTemplatesListRH() {
    document.getElementById('templatesListRH').innerHTML = pendingTemplates.map((tpl, i) => `
        <div class="mini-list-row"><span>${escapeHtml(tpl.nom)}</span><button class="link-btn" onclick="retirerModelePoste(${i})">${t('retirer')}</button></div>
    `).join('');
}

function populateTemplateSelect() {
    const select = document.getElementById('templateSelect');
    select.innerHTML = `<option value="">${t("— Aucun modele —")}</option>` +
        pendingTemplates.map((tpl, i) => `<option value="${i}">${escapeHtml(tpl.nom)}</option>`).join('');
}

function appliquerModelePoste() {
    const index = document.getElementById('templateSelect').value;
    if (index === "") return;
    const tpl = pendingTemplates[index];
    if (!tpl) return;
    document.getElementById('empPoste').value = tpl.poste || "";
    document.getElementById('empService').value = tpl.service || "";
    setManagerFieldValue(tpl.manager || "");
}

// ============================================================
// IMPORT CSV
// ============================================================
function telechargerModeleExcel() {
    const lignes = [
        "Prenom,Nom,Poste,Service,Manager,Email,Date",
        "Caroline,Courtel,CEO,Management,,caroline.courtel@exemple.com,2026-01-01",
        "Julien,Hobeika,CFO,Finance,Caroline Courtel,julien.hobeika@exemple.com,2026-09-01",
        "Lucas,Bernard,Developpeur Front,Tech,Julien Hobeika,lucas.bernard@exemple.com,2026-09-01"
    ];
    const csvContent = "data:text/csv;charset=utf-8," + lignes.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Modele_Rootly.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importerCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const lignes = e.target.result.split(/\r?\n/).filter(l => l.trim() !== "");
        if (lignes.length < 2) { toast(t("Le fichier CSV est vide."), "error"); return; }

        const entetes = lignes[0].split(',').map(h => h.trim().toLowerCase());
        const idx = {
            prenom: entetes.indexOf('prenom'), nom: entetes.indexOf('nom'), poste: entetes.indexOf('poste'),
            service: entetes.indexOf('service'), manager: entetes.indexOf('manager'),
            email: entetes.indexOf('email'), date: entetes.indexOf('date')
        };

        if (idx.prenom === -1 || idx.nom === -1) {
            toast(t("Le CSV doit contenir au minimum les colonnes Prenom, Nom."), "error");
            return;
        }

        const nouveaux = lignes.slice(1).map(ligne => {
            const cols = ligne.split(',');
            return {
                org_id: currentOrg.id,
                token: genererToken(),
                prenom: (cols[idx.prenom] || "").trim(),
                nom: (cols[idx.nom] || "").trim(),
                poste: idx.poste > -1 ? (cols[idx.poste] || "").trim() : "",
                service: idx.service > -1 ? (cols[idx.service] || "").trim() || "Général" : "Général",
                manager: idx.manager > -1 ? (cols[idx.manager] || "").trim() : "",
                email: idx.email > -1 ? (cols[idx.email] || "").trim() : "",
                date_arrivee: idx.date > -1 ? (cols[idx.date] || "").trim() || null : null
            };
        }).filter(e => e.prenom && e.nom);

        if (nouveaux.length === 0) { toast(t("Aucune ligne valide trouvée."), "error"); return; }

        const { error } = await supabaseClient.from('employees').insert(nouveaux);
        if (error) { toast(t("Erreur lors de l'import."), "error"); return; }

        // Vérifie que chaque "Manager" renseigné correspond bien à quelqu'un
        // (déjà existant ou tout juste importé) : sinon la personne se
        // retrouverait silencieusement au sommet de l'organigramme par erreur.
        const nomsConnus = new Set(
            employees.concat(nouveaux).map(e => normaliserNom(`${e.prenom} ${e.nom}`))
        );
        const managersInconnus = nouveaux.filter(e =>
            e.manager && !nomsConnus.has(normaliserNom(e.manager))
        );
        // Cas fréquent : quelqu'un indiqué comme son propre manager (ex : le
        // CEO qui se met lui-même dans sa colonne Manager par erreur).
        const autoReferences = nouveaux.filter(e =>
            e.manager && normaliserNom(e.manager) === normaliserNom(`${e.prenom} ${e.nom}`)
        );

        toast(t('{n} employé(s) importé(s) dans l\'organigramme.', { n: nouveaux.length }));
        if (managersInconnus.length > 0) {
            const apercu = managersInconnus.slice(0, 4).map(e => `${e.prenom} ${e.nom}`).join(', ');
            const suite = managersInconnus.length > 4 ? '…' : '';
            toast(
                t("Manager non reconnu pour {n} employé(s) ({apercu}{suite}) — vérifie l'orthographe exacte dans la colonne Manager (ils sont provisoirement au sommet de l'organigramme).",
                    { n: managersInconnus.length, apercu, suite }),
                "error"
            );
        }
        if (autoReferences.length > 0) {
            const apercu = autoReferences.slice(0, 4).map(e => `${e.prenom} ${e.nom}`).join(', ');
            toast(
                t("{apercu} {verbe} comme son propre manager dans le CSV — laisse la case Manager vide pour la/les personne(s) tout en haut de l'organigramme.",
                    { apercu, verbe: autoReferences.length > 1 ? t('sont indiqués') : t('est indiqué') }),
                "error"
            );
        }

        await chargerEmployes();
    };
    reader.readAsText(file);
}

// ============================================================
// CHARGEMENT / AFFICHAGE
// ============================================================
async function chargerEmployes() {
    const { data, error } = await supabaseClient
        .from('employees')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

    if (error) { toast(t("Erreur de chargement des employés."), "error"); return; }
    employees = data || [];
    renderEmployeeList();
    renderOrgChart();
    updateServiceSuggestions();
    populateManagerSelect();
}

function renderEmployeeList() {
    const container = document.getElementById('employeeListContainer');
    const terme = val('employeeListSearch').toLowerCase();
    const liste = employees.filter(e => !terme || `${e.prenom} ${e.nom}`.toLowerCase().includes(terme));

    // Retire de la sélection les employés qui n'existent plus.
    const idsExistants = new Set(employees.map(e => e.id));
    Array.from(employeeListSelection).forEach(id => { if (!idsExistants.has(id)) employeeListSelection.delete(id); });

    if (employees.length === 0) {
        container.innerHTML = `<p class="empty-hint">${t('Aucun employé pour le moment.')}</p>`;
        mettreAJourBarreSelectionEmployes();
        return;
    }
    if (liste.length === 0) {
        container.innerHTML = `<p class="empty-hint">${t('Aucun résultat pour cette recherche.')}</p>`;
        mettreAJourBarreSelectionEmployes();
        return;
    }
    container.innerHTML = liste.map(emp => `
        <div class="employee-row">
            <input type="checkbox" class="pending-checkbox" aria-label="Selectionner ${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}" ${employeeListSelection.has(emp.id) ? 'checked' : ''} onchange="toggleSelectionEmployeListe('${emp.id}', this.checked)">
            <div class="employee-info">
                <span class="employee-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                <span class="employee-meta">${escapeHtml(emp.poste) || '—'} · <span class="service-chip">${escapeHtml(emp.service)}</span></span>
            </div>
            <div class="employee-actions">
                <button class="link-btn" onclick="modifierEmploye('${emp.id}')">${t('Modifier')}</button>
                <button class="link-btn link-btn-danger" onclick="supprimerEmploye('${emp.id}')">${t('Supprimer')}</button>
            </div>
        </div>
    `).join('');

    mettreAJourBarreSelectionEmployes();
}

// Met à jour le compteur, l'état du bouton de suppression groupée et la
// case "tout sélectionner" en fonction de la sélection actuelle.
function mettreAJourBarreSelectionEmployes() {
    const countEl = document.getElementById('employeeSelectedCount');
    const bulkBtn = document.getElementById('employeeBulkDeleteBtn');
    const selectAllBox = document.getElementById('employeeSelectAll');
    if (!countEl || !bulkBtn || !selectAllBox) return;

    const terme = val('employeeListSearch').toLowerCase();
    const liste = employees.filter(e => !terme || `${e.prenom} ${e.nom}`.toLowerCase().includes(terme));

    countEl.innerText = employeeListSelection.size;
    bulkBtn.disabled = employeeListSelection.size === 0;
    selectAllBox.checked = liste.length > 0 && liste.every(e => employeeListSelection.has(e.id));
    selectAllBox.disabled = liste.length === 0;
}

function toggleSelectionEmployeListe(employeeId, coche) {
    if (coche) employeeListSelection.add(employeeId); else employeeListSelection.delete(employeeId);
    mettreAJourBarreSelectionEmployes();
}

function toggleSelectionTousEmployes(coche) {
    const terme = val('employeeListSearch').toLowerCase();
    const liste = employees.filter(e => !terme || `${e.prenom} ${e.nom}`.toLowerCase().includes(terme));
    if (coche) liste.forEach(e => employeeListSelection.add(e.id));
    else liste.forEach(e => employeeListSelection.delete(e.id));
    renderEmployeeList();
}

async function supprimerEmployesSelectionnes() {
    if (employeeListSelection.size === 0) return;
    const ids = Array.from(employeeListSelection);
    const selection = employees.filter(e => ids.includes(e.id));
    if (selection.length === 0) return;

    const noms = selection.length <= 4
        ? selection.map(e => `${e.prenom} ${e.nom}`).join(', ')
        : t('{n} employés', { n: selection.length });
    const ok = await confirmerAction(
        t("Supprimer définitivement {noms} ? Leur lien d'onboarding cessera de fonctionner. Les employés qui les avaient comme manager se retrouveront au sommet de l'organigramme.", { noms })
    );
    if (!ok) return;

    const btn = document.getElementById('employeeBulkDeleteBtn');
    const texteInitial = btn.innerHTML;
    btn.disabled = true;
    btn.innerText = t("Suppression en cours…");

    const { error } = await supabaseClient.from('employees').delete().in('id', ids);
    if (error) {
        toast(t("Erreur lors de la suppression."), "error");
        btn.innerHTML = texteInitial;
        btn.disabled = false;
        return;
    }

    if (ids.includes(editingEmployeeId)) viderFormulaireEmploye();
    employeeListSelection.clear();
    toast(t('{n} employé(s) supprimé(s).', { n: selection.length }));
    await chargerEmployes();
    btn.innerHTML = texteInitial;
    mettreAJourBarreSelectionEmployes();
}

function updateServiceSuggestions() {
    const services = new Set(DEFAULT_SERVICES);
    employees.forEach(e => { if (e.service) services.add(e.service); });
    document.getElementById('serviceSuggestions').innerHTML = Array.from(services).map(s => `<option value="${escapeHtml(s)}">`).join('');
}

// ============================================================
// ORGANIGRAMME VISUEL (arbre avec édition inline)
// ============================================================
// Construit l'arbre manager -> subordonnés. Casse aussi les références
// circulaires (ex : quelqu'un indiqué comme son propre manager, ou une
// chaîne A -> B -> A) en traitant la personne concernée comme un sommet,
// plutôt que de faire échouer tout l'organigramme à cause d'une seule
// ligne mal remplie. Retourne aussi la liste des personnes concernées
// par un souci de ce type, pour pouvoir prévenir la RH.
function construireArbre(liste) {
    const parNom = {};
    liste.forEach(e => { parNom[normaliserNom(`${e.prenom} ${e.nom}`)] = e; });

    function faitPartieDunCycle(emp) {
        const cleDepart = normaliserNom(`${emp.prenom} ${emp.nom}`);
        const vus = new Set();
        let courant = emp;
        while (courant && courant.manager) {
            const cleManager = normaliserNom(courant.manager);
            if (cleManager === cleDepart) return true;
            if (vus.has(cleManager)) return true;
            vus.add(cleManager);
            courant = parNom[cleManager];
        }
        return false;
    }

    const enfantsDe = {};
    const problemes = [];
    liste.forEach(e => {
        const managerReconnu = e.manager && parNom[normaliserNom(e.manager)];
        const dansUnCycle = managerReconnu && faitPartieDunCycle(e);
        if (dansUnCycle) problemes.push(e);

        const cleManager = (managerReconnu && !dansUnCycle) ? normaliserNom(e.manager) : '__racine__';
        if (!enfantsDe[cleManager]) enfantsDe[cleManager] = [];
        enfantsDe[cleManager].push(e);
    });
    return { enfantsDe, problemes };
}

// Mémorise quelles branches sont repliées (par id d'employé), pour que
// l'état survive aux ré-affichages successifs.
const orgNoeudsReplies = new Set();

function toggleNoeudOrganigramme(id) {
    if (orgNoeudsReplies.has(id)) orgNoeudsReplies.delete(id);
    else orgNoeudsReplies.add(id);
    renderOrgChart();
}

function renderNoeudArbre(emp, enfantsDe, visites, profondeur) {
    const cle = normaliserNom(`${emp.prenom} ${emp.nom}`);
    if (visites.has(cle)) return '';
    visites.add(cle);
    const enfants = enfantsDe[cle] || [];
    const couleur = couleurService(emp.service);
    const aDesEnfants = enfants.length > 0;
    const estReplie = orgNoeudsReplies.has(emp.id);

    return `
        <div class="org-node">
            <div class="org-node-row">
                ${aDesEnfants
                    ? `<button class="org-toggle-btn" title="${estReplie ? t('Deplier') : t('Replier')}" onclick="toggleNoeudOrganigramme('${emp.id}')">${estReplie ? '+' : '−'}</button>`
                    : `<span class="org-toggle-spacer"></span>`}
                <span class="tree-avatar" style="background:${couleur}">${initiales(emp.prenom, emp.nom)}</span>
                <div class="org-node-text">
                    <span class="tree-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                    <span class="tree-role">${escapeHtml(emp.poste) || '—'}</span>
                </div>
                <span class="service-chip org-service" style="background:${couleur}22; color:${couleur}">${escapeHtml(emp.service)}</span>
                ${aDesEnfants ? `<span class="org-child-count">${enfants.length}</span>` : ''}
                <span class="org-node-icons">
                    <button class="tree-icon-btn" title="${t('Modifier')}" onclick="modifierEmploye('${emp.id}')">✎</button>
                    <button class="tree-icon-btn" title="${t('Supprimer')}" onclick="supprimerEmploye('${emp.id}')">✕</button>
                </span>
            </div>
            ${aDesEnfants && !estReplie
                ? `<div class="org-children">${enfants.map(e => renderNoeudArbre(e, enfantsDe, visites, profondeur + 1)).join('')}</div>`
                : ''}
        </div>
    `;
}

function renderOrgChart() {
    const container = document.getElementById('orgChartContainer');

    if (employees.length === 0) {
        container.innerHTML = `<p class="empty-hint">${t("Ajoute des employes pour voir apparaitre l'organigramme.")}</p>`;
        return;
    }
    const { enfantsDe, problemes } = construireArbre(employees);
    const racines = enfantsDe['__racine__'] || [];
    if (racines.length === 0) {
        container.innerHTML = `<p class="empty-hint">${t("Impossible de construire l'organigramme (vérifie les champs Manager).")}</p>`;
        return;
    }
    const visites = new Set();
    container.innerHTML = `<div class="org-tree-list">${racines.map(r => renderNoeudArbre(r, enfantsDe, visites, 0)).join('')}</div>`;

    if (problemes.length > 0) {
        const apercu = problemes.slice(0, 4).map(e => `${e.prenom} ${e.nom}`).join(', ');
        const suite = problemes.length > 4 ? '…' : '';
        toast(
            `${problemes.length} employé(s) (${apercu}${suite}) ont un Manager qui forme une boucle (ex : indiqué comme son propre manager) — ils sont provisoirement affichés au sommet. Corrige la colonne Manager sur leur fiche.`,
            "error"
        );
    }
}

// ============================================================
// DÉMARRAGE
// ============================================================
window.onload = async function () {
    await garantirSessionRH();
    if (!currentOrg) return;
    pendingTemplates = currentOrg.job_templates || [];
    renderTemplatesListRH();
    populateTemplateSelect();
    await chargerEmployes();
};

// Appelé par i18n.js après un changement de langue.
function onLanguageChangeRerender() {
    if (typeof employees !== 'undefined' && employees.length) {
        renderOrgChart();
        renderEmployeeList();
    }
    if (typeof populateManagerSelect === 'function') populateManagerSelect();
}
