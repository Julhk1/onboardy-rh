// app-organigramme.js — logique de la page Organigramme
// CONFIG, supabaseClient, toast, val, escapeHtml, garantirSessionRH etc. viennent de shared.js

let employees = [];
let pendingTemplates = [];
let editingEmployeeId = null;

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
        <option value="">— Aucun (sommet de l'organigramme) —</option>
        ${options}
        <option value="__externe__">Autre / externe (préciser)…</option>
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
    const ok = confirm(`Supprimer définitivement ${emp.prenom} ${emp.nom} ? Son lien d'onboarding cessera de fonctionner.`);
    if (!ok) return;

    const { error } = await supabaseClient.from('employees').delete().eq('id', id);
    if (error) { toast("Erreur lors de la suppression.", "error"); return; }
    if (editingEmployeeId === id) viderFormulaireEmploye();
    toast(`${emp.prenom} ${emp.nom} supprimé(e).`);
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
        toast("Merci de renseigner au minimum le prénom et le nom.", "error");
        return;
    }
    if (email && !emailEstValide(email)) {
        toast("L'adresse email ne semble pas valide.", "error");
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
            toast(`Fiche de ${prenom} ${nom} mise à jour.`);
        } else {
            const token = genererToken();
            const { error } = await supabaseClient
                .from('employees')
                .insert([{ org_id: currentOrg.id, token, prenom, nom, poste, service, manager, email, date_arrivee: date || null }]);
            if (error) throw error;
            toast(`${prenom} ${nom} ajouté(e) à l'organigramme.`);
        }

        viderFormulaireEmploye();
        await chargerEmployes();
    } catch (err) {
        console.error(err);
        toast("Erreur lors de l'enregistrement.", "error");
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
    if (!nom || !poste) { toast("Renseigne au moins un nom de modèle et un poste.", "error"); return; }
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
    if (error) { toast("Erreur lors de l'enregistrement du modèle.", "error"); return; }
    currentOrg.job_templates = pendingTemplates;
}

function renderTemplatesListRH() {
    document.getElementById('templatesListRH').innerHTML = pendingTemplates.map((t, i) => `
        <div class="mini-list-row"><span>${escapeHtml(t.nom)}</span><button class="link-btn" onclick="retirerModelePoste(${i})">retirer</button></div>
    `).join('');
}

function populateTemplateSelect() {
    const select = document.getElementById('templateSelect');
    select.innerHTML = `<option value="">— Aucun modèle —</option>` +
        pendingTemplates.map((t, i) => `<option value="${i}">${escapeHtml(t.nom)}</option>`).join('');
}

function appliquerModelePoste() {
    const index = document.getElementById('templateSelect').value;
    if (index === "") return;
    const t = pendingTemplates[index];
    if (!t) return;
    document.getElementById('empPoste').value = t.poste || "";
    document.getElementById('empService').value = t.service || "";
    setManagerFieldValue(t.manager || "");
}

// ============================================================
// IMPORT CSV
// ============================================================
function telechargerModeleExcel() {
    const csvContent = "data:text/csv;charset=utf-8,Prenom,Nom,Poste,Service,Manager,Email,Date\nLucas,Bernard,Développeur Front,Tech,Pierre Leroy (CTO),lucas.bernard@exemple.com,2026-09-01";
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Modele_DayOne.csv");
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
        if (lignes.length < 2) { toast("Le fichier CSV est vide.", "error"); return; }

        const entetes = lignes[0].split(',').map(h => h.trim().toLowerCase());
        const idx = {
            prenom: entetes.indexOf('prenom'), nom: entetes.indexOf('nom'), poste: entetes.indexOf('poste'),
            service: entetes.indexOf('service'), manager: entetes.indexOf('manager'),
            email: entetes.indexOf('email'), date: entetes.indexOf('date')
        };

        if (idx.prenom === -1 || idx.nom === -1) {
            toast("Le CSV doit contenir au minimum les colonnes Prenom, Nom.", "error");
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

        if (nouveaux.length === 0) { toast("Aucune ligne valide trouvée.", "error"); return; }

        const { error } = await supabaseClient.from('employees').insert(nouveaux);
        if (error) { toast("Erreur lors de l'import.", "error"); return; }

        toast(`${nouveaux.length} employé(s) importé(s) dans l'organigramme.`);
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

    if (error) { toast("Erreur de chargement des employés.", "error"); return; }
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

    if (employees.length === 0) {
        container.innerHTML = `<p class="empty-hint">Aucun employé pour le moment.</p>`;
        return;
    }
    if (liste.length === 0) {
        container.innerHTML = `<p class="empty-hint">Aucun résultat pour cette recherche.</p>`;
        return;
    }
    container.innerHTML = liste.map(emp => `
        <div class="employee-row">
            <div class="employee-info">
                <span class="employee-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                <span class="employee-meta">${escapeHtml(emp.poste) || '—'} · <span class="service-chip">${escapeHtml(emp.service)}</span></span>
            </div>
            <div class="employee-actions">
                <button class="link-btn" onclick="modifierEmploye('${emp.id}')">Modifier</button>
                <button class="link-btn link-btn-danger" onclick="supprimerEmploye('${emp.id}')">Supprimer</button>
            </div>
        </div>
    `).join('');
}

function updateServiceSuggestions() {
    const services = new Set(DEFAULT_SERVICES);
    employees.forEach(e => { if (e.service) services.add(e.service); });
    document.getElementById('serviceSuggestions').innerHTML = Array.from(services).map(s => `<option value="${escapeHtml(s)}">`).join('');
}

// ============================================================
// ORGANIGRAMME VISUEL (arbre avec édition inline)
// ============================================================
function construireArbre(liste) {
    const parNom = {};
    liste.forEach(e => { parNom[normaliserNom(`${e.prenom} ${e.nom}`)] = e; });
    const enfantsDe = {};
    liste.forEach(e => {
        const cleManager = e.manager && parNom[normaliserNom(e.manager)] ? normaliserNom(e.manager) : '__racine__';
        if (!enfantsDe[cleManager]) enfantsDe[cleManager] = [];
        enfantsDe[cleManager].push(e);
    });
    return enfantsDe;
}

function renderNoeudArbre(emp, enfantsDe, visites) {
    const cle = normaliserNom(`${emp.prenom} ${emp.nom}`);
    if (visites.has(cle)) return '';
    visites.add(cle);
    const enfants = enfantsDe[cle] || [];
    const couleur = couleurService(emp.service);

    return `
        <li>
            <div class="tree-box" style="border-top-color:${couleur}">
                <div class="tree-box-header">
                    <span class="tree-avatar" style="background:${couleur}">${initiales(emp.prenom, emp.nom)}</span>
                    <div class="tree-box-text">
                        <span class="tree-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                        <span class="tree-role">${escapeHtml(emp.poste) || '—'}</span>
                    </div>
                </div>
                <div class="tree-box-footer">
                    <span class="service-chip tree-service" style="background:${couleur}22; color:${couleur}">${escapeHtml(emp.service)}</span>
                    <span class="tree-icons">
                        <button class="tree-icon-btn" title="Modifier" onclick="modifierEmploye('${emp.id}')">✎</button>
                        <button class="tree-icon-btn" title="Supprimer" onclick="supprimerEmploye('${emp.id}')">✕</button>
                    </span>
                </div>
            </div>
            ${enfants.length ? `<ul>${enfants.map(e => renderNoeudArbre(e, enfantsDe, visites)).join('')}</ul>` : ''}
        </li>
    `;
}

function renderOrgChart() {
    const container = document.getElementById('orgChartContainer');

    if (employees.length === 0) {
        container.innerHTML = `<p class="empty-hint">Ajoute des employés pour voir apparaître l'organigramme.</p>`;
        return;
    }
    const enfantsDe = construireArbre(employees);
    const racines = enfantsDe['__racine__'] || [];
    if (racines.length === 0) {
        container.innerHTML = `<p class="empty-hint">Impossible de construire l'organigramme (vérifie les champs Manager).</p>`;
        return;
    }
    const visites = new Set();
    container.innerHTML = `<div class="orgtree-scale-wrapper"><div class="orgtree"><ul>${racines.map(r => renderNoeudArbre(r, enfantsDe, visites)).join('')}</ul></div></div>`;

    ajusterEchelleOrganigramme(container);
}

// Mesure la taille réelle de l'organigramme rendu et l'échelle pour qu'il
// remplisse le cadre fixe, que l'entreprise compte 3 ou 300 employés.
function ajusterEchelleOrganigramme(container) {
    const tree = container.querySelector('.orgtree');
    if (!tree) return;

    tree.style.transform = 'none';

    const boites = tree.querySelectorAll('.tree-box');
    if (boites.length === 0) return;

    // Mesure la boîte englobante réelle des profils (plus fiable que scrollWidth/Height,
    // qui peut être faussé par la mise en page en tableau utilisée pour les connecteurs).
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const refRect = container.getBoundingClientRect();
    boites.forEach(boite => {
        const r = boite.getBoundingClientRect();
        minX = Math.min(minX, r.left - refRect.left);
        minY = Math.min(minY, r.top - refRect.top);
        maxX = Math.max(maxX, r.right - refRect.left);
        maxY = Math.max(maxY, r.bottom - refRect.top);
    });

    const largeurNaturelle = maxX - minX;
    const hauteurNaturelle = maxY - minY;
    if (largeurNaturelle <= 0 || hauteurNaturelle <= 0) return;

    const largeurDisponible = container.clientWidth - 20;
    const hauteurDisponible = container.clientHeight - 20;

    let echelle = Math.min(largeurDisponible / largeurNaturelle, hauteurDisponible / hauteurNaturelle);
    echelle = Math.max(0.4, Math.min(echelle, 1.6));

    tree.style.transform = `scale(${echelle})`;
}

let redimensionnementTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(redimensionnementTimer);
    redimensionnementTimer = setTimeout(() => {
        const container = document.getElementById('orgChartContainer');
        if (container) ajusterEchelleOrganigramme(container);
    }, 200);
});

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
