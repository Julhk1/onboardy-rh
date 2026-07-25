// app.js — logique de la page Onboarding (index.html)
// CONFIG, supabaseClient, toast, val, escapeHtml, etc. viennent de shared.js (charge avant ce fichier)

let pendingLogoDataUrl = "";
let pendingDocuments = [];
let pendingLinks = [];
let pendingContacts = [];
let pendingChecklist = [];
let employees = [];

// ============================================================
// AUTHENTIFICATION RH
// ============================================================
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
        afficherErreurLogin("Le projet Supabase n'est pas encore configuré (voir CONFIG dans shared.js).");
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

// ============================================================
// ENTRÉE DANS LE DASHBOARD
// ============================================================
async function entrerDashboard(user) {
    currentUser = user;
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('dashboardView').classList.remove('hidden');
    await chargerOuCreerOrganisation();
    remplirFormulaireOrganisation();
    await chargerEmployes();
}

function remplirFormulaireOrganisation() {
    const org = currentOrg;
    document.getElementById('cfgBoite').value = org.nom || "";
    document.getElementById('cfgWifi').value = org.wifi || "";
    document.getElementById('cfgEmailSubject').value = org.email_subject || "";
    document.getElementById('cfgEmailMessage').value = org.email_message || "";
    pendingLogoDataUrl = org.logo_data_url || "";
    pendingDocuments = org.documents || [];
    pendingLinks = org.useful_links || [];
    pendingContacts = org.key_contacts || [];
    pendingChecklist = org.checklist || [];

    if (pendingLogoDataUrl) {
        document.getElementById('logoPreview').innerHTML =
            `<img src="${pendingLogoDataUrl}" style="height:36px;border-radius:6px;">`;
    }
    renderDocList();
    renderLinksListRH();
    renderContactsListRH();
    renderChecklistListRH();
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
            `<div>${escapeHtml(d.name)} <button class="link-btn" onclick="retirerDocument(${i})">retirer</button></div>`
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
    const email_subject = val('cfgEmailSubject');
    const email_message = val('cfgEmailMessage');

    const { error } = await supabaseClient
        .from('organizations')
        .update({ nom, wifi, logo_data_url: pendingLogoDataUrl, documents: pendingDocuments, email_subject, email_message })
        .eq('id', currentOrg.id);

    if (error) { toast("Erreur lors de l'enregistrement.", "error"); return; }
    currentOrg = { ...currentOrg, nom, wifi, logo_data_url: pendingLogoDataUrl, documents: pendingDocuments, email_subject, email_message };
    toast("Informations entreprise enregistrées.");
}

// ============================================================
// CONTENUS OPTIONNELS : LIENS / CONTACTS / CHECKLIST
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
function retirerLien(index) { pendingLinks.splice(index, 1); renderLinksListRH(); }
function renderLinksListRH() {
    document.getElementById('linksListRH').innerHTML = pendingLinks.map((l, i) => `
        <div class="mini-list-row"><span>${escapeHtml(l.nom)}</span><button class="link-btn" onclick="retirerLien(${i})">retirer</button></div>
    `).join('');
}

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
function retirerContact(index) { pendingContacts.splice(index, 1); renderContactsListRH(); }
function renderContactsListRH() {
    document.getElementById('contactsListRH').innerHTML = pendingContacts.map((c, i) => `
        <div class="mini-list-row"><span>${escapeHtml(c.nom)} — ${escapeHtml(c.role)}</span><button class="link-btn" onclick="retirerContact(${i})">retirer</button></div>
    `).join('');
}

function ajouterEtapeChecklist() {
    const titre = val('checklistTitre');
    const description = val('checklistDesc');
    if (!titre) { toast("Renseigne au moins un titre d'étape.", "error"); return; }
    pendingChecklist.push({ titre, description });
    document.getElementById('checklistTitre').value = "";
    document.getElementById('checklistDesc').value = "";
    renderChecklistListRH();
}
function retirerEtapeChecklist(index) { pendingChecklist.splice(index, 1); renderChecklistListRH(); }
function renderChecklistListRH() {
    document.getElementById('checklistListRH').innerHTML = pendingChecklist.map((e, i) => `
        <div class="mini-list-row"><span>${i + 1}. ${escapeHtml(e.titre)}</span><button class="link-btn" onclick="retirerEtapeChecklist(${i})">retirer</button></div>
    `).join('');
}

async function enregistrerContenusOptionnels() {
    if (!currentOrg) return;
    const { error } = await supabaseClient
        .from('organizations')
        .update({ useful_links: pendingLinks, key_contacts: pendingContacts, checklist: pendingChecklist })
        .eq('id', currentOrg.id);
    if (error) { toast("Erreur lors de l'enregistrement.", "error"); return; }
    currentOrg = { ...currentOrg, useful_links: pendingLinks, key_contacts: pendingContacts, checklist: pendingChecklist };
    toast("Contenus enregistrés — visibles sur les prochaines pages employé.");
}

async function viderContenusOptionnels() {
    if (!currentOrg) return;
    const ok = confirm("Vider les liens, contacts et checklist ? Cette action est immédiate.");
    if (!ok) return;
    pendingLinks = []; pendingContacts = []; pendingChecklist = [];
    const { error } = await supabaseClient
        .from('organizations')
        .update({ useful_links: [], key_contacts: [], checklist: [] })
        .eq('id', currentOrg.id);
    if (error) { toast("Erreur lors de la suppression.", "error"); return; }
    currentOrg = { ...currentOrg, useful_links: [], key_contacts: [], checklist: [] };
    renderLinksListRH(); renderContactsListRH(); renderChecklistListRH();
    toast("Contenus optionnels vidés.");
}

// ============================================================
// LISTE DES EMPLOYÉS : À ONBOARDER / DÉJÀ ENVOYÉS
// ============================================================
async function chargerEmployes() {
    const { data, error } = await supabaseClient
        .from('employees')
        .select('id, prenom, nom, poste, service, email, invite_sent, viewed_at, token, chart_visibility, created_at')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

    if (error) { toast("Erreur de chargement des employés.", "error"); return; }
    employees = data || [];
    renderPendingList();
    renderSentList();
}

function renderPendingList() {
    const container = document.getElementById('pendingListContainer');
    const pending = employees.filter(e => !e.invite_sent);
    if (pending.length === 0) {
        container.innerHTML = `<p class="empty-hint">Aucun employé en attente d'invitation.</p>`;
        return;
    }
    container.innerHTML = pending.map(emp => `
        <div class="employee-row employee-row-pending">
            <div class="employee-info">
                <span class="employee-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                <span class="employee-meta">${escapeHtml(emp.poste) || '—'} · <span class="service-chip">${escapeHtml(emp.service)}</span></span>
            </div>
            <select class="visibility-select" onchange="changerVisibilite('${emp.id}', this.value)">
                <option value="equipe" ${emp.chart_visibility !== 'complet' ? 'selected' : ''}>Organigramme : équipe + N+1</option>
                <option value="complet" ${emp.chart_visibility === 'complet' ? 'selected' : ''}>Organigramme : complet</option>
            </select>
            <div class="employee-actions">
                <button class="link-btn" onclick="envoyerInvitationDepuisListe('${emp.id}')">Envoyer l'invitation</button>
            </div>
        </div>
    `).join('');
}

function renderSentList() {
    const container = document.getElementById('sentListContainer');
    const sent = employees.filter(e => e.invite_sent);
    if (sent.length === 0) {
        container.innerHTML = `<p class="empty-hint">Aucune invitation envoyée pour le moment.</p>`;
        return;
    }
    container.innerHTML = sent.map(emp => `
        <div class="employee-row">
            <div class="employee-info">
                <span class="employee-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                <span class="employee-meta">${escapeHtml(emp.poste) || '—'} · <span class="service-chip">${escapeHtml(emp.service)}</span></span>
            </div>
            <div class="employee-status ${emp.viewed_at ? 'status-viewed' : 'status-neutral'}">
                ${emp.viewed_at ? 'Consulté' : 'Envoyé'}
            </div>
            <div class="employee-actions">
                <button class="link-btn" onclick="envoyerInvitationDepuisListe('${emp.id}')">Renvoyer</button>
            </div>
        </div>
    `).join('');
}

async function changerVisibilite(employeeId, valeur) {
    const { error } = await supabaseClient.from('employees').update({ chart_visibility: valeur }).eq('id', employeeId);
    if (error) { toast("Erreur lors de la mise à jour.", "error"); return; }
    const emp = employees.find(e => e.id === employeeId);
    if (emp) emp.chart_visibility = valeur;
}

async function envoyerInvitationDepuisListe(employeeId) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    await envoyerInvitation(emp);
    await chargerEmployes();
}

async function envoyerInvitation(emp) {
    const shareLink = `${window.location.origin}/onboarding.html?token=${emp.token}`;
    const sujet = (currentOrg.email_subject && currentOrg.email_subject.trim())
        ? currentOrg.email_subject.trim()
        : `Bienvenue chez ${currentOrg.nom} !`;
    const messageAccueil = (currentOrg.email_message && currentOrg.email_message.trim())
        ? escapeHtml(currentOrg.email_message.trim()).replace(/\n/g, '<br>')
        : `Toute l'équipe de <strong>${escapeHtml(currentOrg.nom)}</strong> est ravie de t'accueillir en tant que <strong>${escapeHtml(emp.poste)}</strong>.`;

    try {
        const res = await fetch(CONFIG.SEND_EMAIL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: emp.email,
                subject: sujet,
                html: `
                    <div style="font-family: Arial, sans-serif; color:#1e2430; padding:24px; max-width:520px; border:1px solid #E4E1D8; border-radius:12px;">
                        <h2 style="color:#B8863B; margin-top:0;">Bienvenue, ${escapeHtml(emp.prenom)} !</h2>
                        <p>${messageAccueil}</p>
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

// ============================================================
// DÉMARRAGE
// ============================================================
window.onload = async function () {
    if (!CONFIGURED) {
        document.getElementById('loginError').classList.remove('hidden');
        document.getElementById('loginError').innerText = "Configuration Supabase manquante dans shared.js.";
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

    await new Promise(r => setTimeout(r, 150));
    if (recoveryEnCours) return;

    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        await entrerDashboard(data.session.user);
    }
};
