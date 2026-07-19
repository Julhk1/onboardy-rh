// ============================================================
// DAYONE — CONFIGURATION
// ============================================================
// SUPABASE_ANON_KEY est une clé PUBLIQUE par design (protégée par
// les règles RLS définies dans supabase-schema.sql). La clé secrète
// (service_role) ne doit JAMAIS apparaître ici — elle vit uniquement
// dans les variables d'environnement Vercel, lues par /api/*.js.
const CONFIG = {
    SUPABASE_URL: "https://qaydzplnxjdyyutjyqzy.supabase.co",
    SUPABASE_ANON_KEY: "METS_ICI_TA_CLE_ANON_PUBLIC_DE_SUPABASE",
    SEND_EMAIL_ENDPOINT: "/api/send-email"
};

const CONFIGURED = CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_ANON_KEY.startsWith("METS_ICI");
const supabaseClient = CONFIGURED
    ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
    : null;

// État en mémoire
let currentUser = null;
let currentOrg = null;
let employees = [];
let pendingLogoDataUrl = "";
let pendingDocuments = []; // [{name, dataUrl}]
let pendingLinks = [];       // [{nom, url}]
let pendingContacts = [];    // [{nom, role, contact}]
let pendingChecklist = [];   // [{titre, description}]
let pendingTemplates = [];   // [{nom, poste, service, manager}]

const DEFAULT_SERVICES = ["Direction", "Finance", "Tech", "Ventes", "Marketing", "RH", "Opérations"];

// ============================================================
// UTILITAIRES
// ============================================================
function toast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4500);
}

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function emailEstValide(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function genererToken() {
    return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/-/g, '');
}

// ============================================================
// AUTHENTIFICATION RH
// ============================================================
// loginMode : 'login' | 'signup' | 'forgot'
let loginMode = 'login';

function setLoginMode(mode) {
    loginMode = mode;
    const passwordWrapper = document.getElementById('passwordFieldWrapper');
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    const toggleBtn = document.getElementById('loginToggleBtn');
    const backBtn = document.getElementById('backToLoginBtn');
    const titleEl = document.getElementById('loginModeLabel');
    const submitBtn = document.getElementById('loginSubmitBtn');

    document.getElementById('loginError').classList.add('hidden');

    if (mode === 'login') {
        titleEl.innerText = "Connexion";
        submitBtn.innerText = "Se connecter";
        passwordWrapper.classList.remove('hidden');
        forgotBtn.classList.remove('hidden');
        toggleBtn.classList.remove('hidden');
        toggleBtn.innerText = "Pas encore de compte ? Créer un espace RH";
        backBtn.classList.add('hidden');
    } else if (mode === 'signup') {
        titleEl.innerText = "Créer un espace RH";
        submitBtn.innerText = "Créer mon espace";
        passwordWrapper.classList.remove('hidden');
        forgotBtn.classList.add('hidden');
        toggleBtn.classList.remove('hidden');
        toggleBtn.innerText = "Déjà un compte ? Se connecter";
        backBtn.classList.add('hidden');
    } else if (mode === 'forgot') {
        titleEl.innerText = "Mot de passe oublié";
        submitBtn.innerText = "Envoyer le lien de réinitialisation";
        passwordWrapper.classList.add('hidden');
        forgotBtn.classList.add('hidden');
        toggleBtn.classList.add('hidden');
        backBtn.classList.remove('hidden');
    }
}

function basculerModeLogin() {
    setLoginMode(loginMode === 'signup' ? 'login' : 'signup');
}

function basculerModeMotDePasseOublie() {
    setLoginMode('forgot');
}

function revenirALaConnexion() {
    setLoginMode('login');
}

async function soumettreLogin() {
    if (!CONFIGURED) {
        afficherErreurLogin("Le projet Supabase n'est pas encore configuré (voir CONFIG dans app.js).");
        return;
    }
    const email = val('loginEmail');

    if (loginMode === 'forgot') {
        if (!email) { afficherErreurLogin("Renseigne ton email pour recevoir le lien."); return; }
        const btn = document.getElementById('loginSubmitBtn');
        btn.disabled = true;
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });
            if (error) throw error;
            toast("Email envoyé — vérifie ta boîte mail (et les spams).");
            setLoginMode('login');
        } catch (err) {
            afficherErreurLogin(traduireErreurAuth(err.message));
        } finally {
            btn.disabled = false;
        }
        return;
    }

    const password = val('loginPassword');
    if (!email || !password) {
        afficherErreurLogin("Merci de renseigner ton email et ton mot de passe.");
        return;
    }

    const btn = document.getElementById('loginSubmitBtn');
    btn.disabled = true;
    btn.innerText = "Un instant…";

    try {
        if (loginMode === 'signup') {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;

            // Supabase renvoie "identities: []" quand l'email existe déjà
            // (comportement volontaire pour ne pas révéler les emails existants
            // à un tiers malveillant — mais ici c'est bien TOI qui viens de taper
            // ton propre email, donc on peut te le dire clairement).
            if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                afficherErreurLogin("Un compte existe déjà avec cet email.");
                setLoginMode('login');
                document.getElementById('loginEmail').value = email;
                return;
            }

            if (data.session) {
                await entrerDashboard(data.user);
            } else {
                afficherErreurLogin("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
                setLoginMode('login');
            }
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            await entrerDashboard(data.user);
        }
    } catch (err) {
        afficherErreurLogin(traduireErreurAuth(err.message));
    } finally {
        btn.disabled = false;
        btn.innerText = loginMode === 'signup' ? "Créer mon espace" : "Se connecter";
    }
}

async function soumettreNouveauMotDePasse() {
    const newPassword = val('newPassword');
    if (!newPassword || newPassword.length < 6) {
        const el = document.getElementById('resetError');
        el.innerText = "Le mot de passe doit contenir au moins 6 caractères.";
        el.classList.remove('hidden');
        return;
    }
    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast("Mot de passe mis à jour. Te voilà connecté(e).");
        document.getElementById('resetPasswordView').classList.add('hidden');
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) await entrerDashboard(data.session.user);
    } catch (err) {
        const el = document.getElementById('resetError');
        el.innerText = traduireErreurAuth(err.message);
        el.classList.remove('hidden');
    }
}

function traduireErreurAuth(msg) {
    if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
    if (/already registered/i.test(msg)) return "Un compte existe déjà avec cet email — connecte-toi plutôt.";
    if (/password/i.test(msg) && /6/i.test(msg)) return "Le mot de passe doit contenir au moins 6 caractères.";
    return msg;
}

function afficherErreurLogin(msg) {
    const el = document.getElementById('loginError');
    el.innerText = msg;
    el.classList.remove('hidden');
}

async function deconnexion() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    location.reload();
}

// ============================================================
// ENTRÉE DANS LE DASHBOARD
// ============================================================
async function entrerDashboard(user) {
    currentUser = user;
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('dashboardView').classList.remove('hidden');
    await chargerOuCreerOrganisation();
    await chargerEmployes();
}

async function chargerOuCreerOrganisation() {
    let { data: org, error } = await supabaseClient
        .from('organizations')
        .select('*')
        .eq('owner_id', currentUser.id)
        .maybeSingle();

    if (!org) {
        const { data: created, error: createError } = await supabaseClient
            .from('organizations')
            .insert([{ owner_id: currentUser.id }])
            .select()
            .single();
        if (createError) { toast("Erreur de création de l'organisation.", "error"); return; }
        org = created;
    }

    currentOrg = org;
    document.getElementById('cfgBoite').value = org.nom || "";
    document.getElementById('cfgWifi').value = org.wifi || "";
    pendingLogoDataUrl = org.logo_data_url || "";
    pendingDocuments = org.documents || [];
    pendingLinks = org.useful_links || [];
    pendingContacts = org.key_contacts || [];
    pendingChecklist = org.checklist || [];
    pendingTemplates = org.job_templates || [];

    if (pendingLogoDataUrl) {
        document.getElementById('logoPreview').innerHTML =
            `<img src="${pendingLogoDataUrl}" style="height:36px;border-radius:6px;">`;
    }
    renderDocList();
    renderLinksListRH();
    renderContactsListRH();
    renderChecklistListRH();
    renderTemplatesListRH();
    populateTemplateSelect();
}

// ============================================================
// CONFIGURATION ENTREPRISE
// ============================================================
function chargerLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingLogoDataUrl = e.target.result;
        document.getElementById('logoPreview').innerHTML =
            `<img src="${pendingLogoDataUrl}" style="height:36px;border-radius:6px;margin-bottom:4px;"><br><span style="color:var(--success);font-weight:600;">${escapeHtml(file.name)}</span>`;
    };
    reader.readAsDataURL(file);
}

function chargerDocuments(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    Promise.all(files.map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ name: file.name, dataUrl: e.target.result });
        reader.readAsDataURL(file);
    }))).then((results) => {
        pendingDocuments = pendingDocuments.concat(results);
        renderDocList();
    });
}

function renderDocList() {
    const docList = document.getElementById('docList');
    docList.innerHTML = pendingDocuments.length
        ? pendingDocuments.map((d, i) =>
            `<div>📁 ${escapeHtml(d.name)} <button class="link-btn" onclick="retirerDocument(${i})">retirer</button></div>`
          ).join('')
        : "";
}

function retirerDocument(index) {
    pendingDocuments.splice(index, 1);
    renderDocList();
}

async function enregistrerOrganisation() {
    if (!currentOrg) return;
    const nom = val('cfgBoite') || "Mon entreprise";
    const wifi = val('cfgWifi');

    const { error } = await supabaseClient
        .from('organizations')
        .update({ nom, wifi, logo_data_url: pendingLogoDataUrl, documents: pendingDocuments })
        .eq('id', currentOrg.id);

    if (error) { toast("Erreur lors de l'enregistrement.", "error"); return; }
    currentOrg = { ...currentOrg, nom, wifi, logo_data_url: pendingLogoDataUrl, documents: pendingDocuments };
    toast("Informations entreprise enregistrées.");
}

// ============================================================
// CONTENUS OPTIONNELS : LIENS UTILES
// ============================================================
function ajouterLien() {
    const nom = val('linkNom');
    const url = val('linkUrl');
    if (!nom || !url) { toast("Renseigne un nom et une URL.", "error"); return; }
    pendingLinks.push({ nom, url });
    document.getElementById('linkNom').value = "";
    document.getElementById('linkUrl').value = "";
    renderLinksListRH();
}

function retirerLien(index) {
    pendingLinks.splice(index, 1);
    renderLinksListRH();
}

function renderLinksListRH() {
    const el = document.getElementById('linksListRH');
    el.innerHTML = pendingLinks.map((l, i) => `
        <div class="mini-list-row">
            <span>🔗 ${escapeHtml(l.nom)}</span>
            <button class="link-btn" onclick="retirerLien(${i})">retirer</button>
        </div>
    `).join('');
}

// ============================================================
// CONTENUS OPTIONNELS : CONTACTS CLÉS
// ============================================================
function ajouterContact() {
    const nom = val('contactNom');
    const role = val('contactRole');
    const contact = val('contactInfo');
    if (!nom || !role) { toast("Renseigne au moins un nom et un rôle.", "error"); return; }
    pendingContacts.push({ nom, role, contact });
    document.getElementById('contactNom').value = "";
    document.getElementById('contactRole').value = "";
    document.getElementById('contactInfo').value = "";
    renderContactsListRH();
}

function retirerContact(index) {
    pendingContacts.splice(index, 1);
    renderContactsListRH();
}

function renderContactsListRH() {
    const el = document.getElementById('contactsListRH');
    el.innerHTML = pendingContacts.map((c, i) => `
        <div class="mini-list-row">
            <span>${escapeHtml(c.nom)} — ${escapeHtml(c.role)}</span>
            <button class="link-btn" onclick="retirerContact(${i})">retirer</button>
        </div>
    `).join('');
}

// ============================================================
// CONTENUS OPTIONNELS : CHECKLIST D'INTÉGRATION
// ============================================================
function ajouterEtapeChecklist() {
    const titre = val('checklistTitre');
    const description = val('checklistDesc');
    if (!titre) { toast("Renseigne au moins un titre d'étape.", "error"); return; }
    pendingChecklist.push({ titre, description });
    document.getElementById('checklistTitre').value = "";
    document.getElementById('checklistDesc').value = "";
    renderChecklistListRH();
}

function retirerEtapeChecklist(index) {
    pendingChecklist.splice(index, 1);
    renderChecklistListRH();
}

function renderChecklistListRH() {
    const el = document.getElementById('checklistListRH');
    el.innerHTML = pendingChecklist.map((e, i) => `
        <div class="mini-list-row">
            <span>${i + 1}. ${escapeHtml(e.titre)}</span>
            <button class="link-btn" onclick="retirerEtapeChecklist(${i})">retirer</button>
        </div>
    `).join('');
}

// ============================================================
// CONTENUS OPTIONNELS : MODÈLES DE POSTE
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
}

function retirerModelePoste(index) {
    pendingTemplates.splice(index, 1);
    renderTemplatesListRH();
    populateTemplateSelect();
}

function renderTemplatesListRH() {
    const el = document.getElementById('templatesListRH');
    el.innerHTML = pendingTemplates.map((t, i) => `
        <div class="mini-list-row">
            <span>🧩 ${escapeHtml(t.nom)}</span>
            <button class="link-btn" onclick="retirerModelePoste(${i})">retirer</button>
        </div>
    `).join('');
}

function populateTemplateSelect() {
    const select = document.getElementById('templateSelect');
    if (!select) return;
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
    document.getElementById('empManager').value = t.manager || "";
    mettreAJourChecklist();
}

async function enregistrerContenusOptionnels() {
    if (!currentOrg) return;
    const { error } = await supabaseClient
        .from('organizations')
        .update({
            useful_links: pendingLinks,
            key_contacts: pendingContacts,
            checklist: pendingChecklist,
            job_templates: pendingTemplates
        })
        .eq('id', currentOrg.id);

    if (error) { toast("Erreur lors de l'enregistrement.", "error"); return; }
    currentOrg = {
        ...currentOrg,
        useful_links: pendingLinks,
        key_contacts: pendingContacts,
        checklist: pendingChecklist,
        job_templates: pendingTemplates
    };
    toast("Contenus enregistrés — visibles sur les prochaines pages employé.");
}

// ============================================================
// CHECKLIST FORMULAIRE EMPLOYÉ
// ============================================================
function mettreAJourChecklist() {
    const ficheComplete = !!(val('empPrenom') && val('empNom') && val('empPoste'));
    const emailValide = emailEstValide(val('empEmail'));
    document.getElementById('chkFiche')?.classList.toggle('is-complete', ficheComplete);
    document.getElementById('chkEmail')?.classList.toggle('is-complete', emailValide);
}

function viderFormulaireEmploye() {
    ['empPrenom', 'empNom', 'empPoste', 'empService', 'empManager', 'empEmail', 'empDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    document.getElementById('duplicateBanner').classList.add('hidden');
    mettreAJourChecklist();
}

function dupliquerEmploye(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    document.getElementById('empPoste').value = emp.poste || "";
    document.getElementById('empService').value = emp.service || "";
    document.getElementById('empManager').value = emp.manager || "";
    document.getElementById('empPrenom').value = "";
    document.getElementById('empNom').value = "";
    document.getElementById('empEmail').value = "";
    document.getElementById('empDate').value = "";
    document.getElementById('duplicateBanner').classList.remove('hidden');
    document.getElementById('empPrenom').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('empPrenom').focus();
    mettreAJourChecklist();
}

// ============================================================
// CRÉATION D'UN ONBOARDING
// ============================================================
async function declencherOnboardingGeneral() {
    const prenom = val('empPrenom');
    const nom = val('empNom');
    const poste = val('empPoste');
    const service = val('empService') || "Général";
    const manager = val('empManager');
    const email = val('empEmail');
    const date = val('empDate');

    if (!prenom || !nom || !email) {
        toast("Merci de renseigner au minimum le prénom, le nom et l'email.", "error");
        return;
    }
    if (!emailEstValide(email)) {
        toast("L'adresse email ne semble pas valide.", "error");
        return;
    }

    const btn = document.getElementById('empSubmitBtn');
    btn.disabled = true;
    btn.innerText = "Envoi en cours…";

    try {
        const token = genererToken();
        const { data: inserted, error } = await supabaseClient
            .from('employees')
            .insert([{
                org_id: currentOrg.id, token, prenom, nom, poste, service, manager, email,
                date_arrivee: date || null
            }])
            .select()
            .single();

        if (error) throw error;

        await envoyerInvitation(inserted);
        viderFormulaireEmploye();
        await chargerEmployes();
    } catch (err) {
        console.error(err);
        toast("Erreur lors de la création de l'onboarding.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Enregistrer et envoyer l'invitation";
    }
}

async function envoyerInvitation(emp) {
    const shareLink = `${window.location.origin}/onboarding.html?token=${emp.token}`;
    try {
        const res = await fetch(CONFIG.SEND_EMAIL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: emp.email,
                subject: `Bienvenue chez ${currentOrg.nom} !`,
                html: `
                    <div style="font-family: Arial, sans-serif; color:#1e2430; padding:24px; max-width:520px; border:1px solid #E4E1D8; border-radius:12px;">
                        <h2 style="color:#B8863B; margin-top:0;">Bienvenue, ${escapeHtml(emp.prenom)} !</h2>
                        <p>Toute l'équipe de <strong>${escapeHtml(currentOrg.nom)}</strong> est ravie de t'accueillir en tant que <strong>${escapeHtml(emp.poste)}</strong>.</p>
                        <p>Ton portail d'intégration personnel :</p>
                        <div style="text-align:center; margin:24px 0;">
                            <a href="${shareLink}" style="background:#101828; color:#fff; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">
                                Accéder à mon espace
                            </a>
                        </div>
                    </div>
                `
            })
        });

        if (res.ok) {
            await supabaseClient.from('employees').update({ invite_sent: true }).eq('id', emp.id);
            toast(`Invitation envoyée à ${emp.email}`);
        } else {
            toast("La fonction /api/send-email n'est pas encore déployée — voir le README.", "error");
        }
    } catch (err) {
        console.error(err);
        toast("Impossible de contacter le serveur d'envoi.", "error");
    }
}

async function renvoyerInvitation(id) {
    const emp = employees.find(e => e.id === id);
    if (emp) await envoyerInvitation(emp);
    await chargerEmployes();
}

// ============================================================
// LISTE DES EMPLOYÉS + ORGANIGRAMME
// ============================================================
async function chargerEmployes() {
    const { data, error } = await supabaseClient
        .from('employees')
        .select('id, prenom, nom, poste, service, manager, email, date_arrivee, invite_sent, viewed_at, token, created_at')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

    if (error) { toast("Erreur de chargement des employés.", "error"); return; }
    employees = data || [];
    renderEmployeeList();
    renderOrgChart();
    updateServiceSuggestions();
    updateManagerSuggestions();
}

function renderEmployeeList() {
    const container = document.getElementById('employeeListContainer');
    if (employees.length === 0) {
        container.innerHTML = `<p class="empty-hint">Aucun employé pour le moment.</p>`;
        return;
    }
    container.innerHTML = employees.map(emp => `
        <div class="employee-row">
            <div class="employee-info">
                <span class="employee-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                <span class="employee-meta">${escapeHtml(emp.poste) || '—'} · <span class="service-chip">${escapeHtml(emp.service)}</span></span>
            </div>
            <div class="employee-status ${statutClasse(emp)}">
                ${statutLabel(emp)}
            </div>
            <div class="employee-actions">
                ${!emp.invite_sent ? `<button class="link-btn" onclick="renvoyerInvitation('${emp.id}')">Envoyer</button>` : ''}
                <button class="link-btn" onclick="dupliquerEmploye('${emp.id}')">Dupliquer</button>
            </div>
        </div>
    `).join('');
}

function statutClasse(emp) {
    if (emp.viewed_at) return 'status-viewed';
    if (emp.invite_sent) return 'status-neutral';
    return 'status-pending';
}

function statutLabel(emp) {
    if (emp.viewed_at) return 'Consulté';
    if (emp.invite_sent) return 'Envoyé';
    return 'En attente';
}

function normaliserNom(s) {
    return (s || '').trim().toLowerCase();
}

// Construit l'arbre hiérarchique à partir du champ "manager" (texte "Prénom Nom").
// Un employé dont le manager ne correspond à personne dans la liste devient une racine
// (ex: le PDG, ou un manager externe pas encore enregistré comme employé).
function construireArbre(liste) {
    const parNom = {};
    liste.forEach(e => { parNom[normaliserNom(`${e.prenom} ${e.nom}`)] = e; });

    const enfantsDe = {};
    liste.forEach(e => {
        const cleManager = e.manager && parNom[normaliserNom(e.manager)]
            ? normaliserNom(e.manager)
            : '__racine__';
        if (!enfantsDe[cleManager]) enfantsDe[cleManager] = [];
        enfantsDe[cleManager].push(e);
    });

    return enfantsDe;
}

function renderNoeudArbre(emp, enfantsDe, visites) {
    const cle = normaliserNom(`${emp.prenom} ${emp.nom}`);
    if (visites.has(cle)) return ''; // sécurité anti-boucle (manager circulaire)
    visites.add(cle);

    const enfants = enfantsDe[cle] || [];
    return `
        <div class="tree-node">
            <div class="tree-box">
                <span class="tree-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                <span class="tree-role">${escapeHtml(emp.poste) || '—'}</span>
                <span class="service-chip tree-service">${escapeHtml(emp.service)}</span>
            </div>
            ${enfants.length ? `
                <div class="tree-children">
                    ${enfants.map(e => renderNoeudArbre(e, enfantsDe, visites)).join('')}
                </div>
            ` : ''}
        </div>
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
    container.innerHTML = `<div class="tree-roots">${racines.map(r => renderNoeudArbre(r, enfantsDe, visites)).join('')}</div>`;
}

function updateManagerSuggestions() {
    const datalist = document.getElementById('managerSuggestions');
    if (!datalist) return;
    datalist.innerHTML = employees.map(e => `<option value="${escapeHtml(e.prenom + ' ' + e.nom)}">`).join('');
}

function updateServiceSuggestions() {
    const services = new Set(DEFAULT_SERVICES);
    employees.forEach(e => { if (e.service) services.add(e.service); });
    const datalist = document.getElementById('serviceSuggestions');
    datalist.innerHTML = Array.from(services).map(s => `<option value="${escapeHtml(s)}">`).join('');
}

// ============================================================
// MODÈLE CSV / IMPORT
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
            prenom: entetes.indexOf('prenom'),
            nom: entetes.indexOf('nom'),
            poste: entetes.indexOf('poste'),
            service: entetes.indexOf('service'),
            manager: entetes.indexOf('manager'),
            email: entetes.indexOf('email'),
            date: entetes.indexOf('date')
        };

        if (idx.prenom === -1 || idx.nom === -1 || idx.email === -1) {
            toast("Le CSV doit contenir au minimum les colonnes Prenom, Nom, Email.", "error");
            return;
        }

        const nouveauxEmployes = lignes.slice(1).map(ligne => {
            const cols = ligne.split(',');
            return {
                org_id: currentOrg.id,
                token: genererToken(),
                prenom: (cols[idx.prenom] || "").trim(),
                nom: (cols[idx.nom] || "").trim(),
                poste: idx.poste > -1 ? (cols[idx.poste] || "").trim() : "",
                service: idx.service > -1 ? (cols[idx.service] || "").trim() || "Général" : "Général",
                manager: idx.manager > -1 ? (cols[idx.manager] || "").trim() : "",
                email: (cols[idx.email] || "").trim(),
                date_arrivee: idx.date > -1 ? (cols[idx.date] || "").trim() || null : null
            };
        }).filter(e => e.prenom && e.nom && e.email);

        if (nouveauxEmployes.length === 0) {
            toast("Aucune ligne valide trouvée dans le fichier.", "error");
            return;
        }

        const { error } = await supabaseClient.from('employees').insert(nouveauxEmployes);
        if (error) { toast("Erreur lors de l'import.", "error"); return; }

        toast(`${nouveauxEmployes.length} employé(s) importé(s). Envoie leurs invitations depuis la liste.`);
        await chargerEmployes();
    };
    reader.readAsText(file);
}

// ============================================================
// DÉMARRAGE
// ============================================================
window.onload = async function () {
    if (!CONFIGURED) {
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('loginError').innerText = "Configuration Supabase manquante dans app.js (CONFIG.SUPABASE_ANON_KEY).";
        return;
    }

    let recoveryEnCours = false;
    supabaseClient.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
            recoveryEnCours = true;
            document.getElementById('loginView').classList.add('hidden');
            document.getElementById('dashboardView').classList.add('hidden');
            document.getElementById('resetPasswordView').classList.remove('hidden');
        }
    });

    // Laisse le SDK Supabase le temps de détecter un éventuel lien de récupération dans l'URL
    await new Promise(r => setTimeout(r, 150));
    if (recoveryEnCours) return;

    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        await entrerDashboard(data.session.user);
    }
};
