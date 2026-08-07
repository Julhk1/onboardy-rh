// ============================================================
// DAYONE — FICHIER PARTAGÉ (chargé avant chaque script de page)
// ============================================================
const CONFIG = {
    SUPABASE_URL: "https://qaydzplnxjdyyutjyqzy.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_yP4LRCrxH9ke4cuVKWnZbg_LtEGC-qn",
    SEND_EMAIL_ENDPOINT: "/api/send-email"
};

const CONFIGURED = CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_ANON_KEY.startsWith("METS_ICI");
const supabaseClient = CONFIGURED
    ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
    : null;

let currentUser = null;
let currentOrg = null;

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

// Normalise un nom pour le comparer de façon fiable : insensible aux accents,
// à la casse, aux espaces multiples, et ignore tout ce qui est entre
// parenthèses (ex : un poste ajouté par erreur après le nom du manager).
function normaliserNom(s) {
    return (s || '')
        .replace(/\(.*?\)/g, ' ')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function formatDateFR(date) {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMontant(n) {
    if (n === null || n === undefined || n === '') return "—";
    return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + " €";
}

// Vérifie la session et charge/crée l'organisation. Redirige vers index.html
// (page de connexion) si personne n'est connecté. À appeler au chargement
// de chaque page RH sauf index.html elle-même.
async function garantirSessionRH() {
    if (!CONFIGURED) {
        alert("Configuration Supabase manquante dans shared.js.");
        return null;
    }
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
        window.location.href = 'index.html';
        return null;
    }
    currentUser = data.session.user;
    await chargerOuCreerOrganisation();
    return currentUser;
}

async function chargerOuCreerOrganisation() {
    let { data: org } = await supabaseClient
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
}

async function deconnexion() {
    if (supabaseClient) await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// ============================================================
// MODALE DE CONFIRMATION (remplace window.confirm, natif et moche)
// ============================================================
// Usage : const ok = await confirmerAction("Supprimer X ?");
function confirmerAction(message, options = {}) {
    const { titre = "Confirmation", texteOui = "Confirmer", texteNon = "Annuler", danger = true } = options;

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmModalTitre">
                <h4 id="confirmModalTitre" class="confirm-modal-title">${escapeHtml(titre)}</h4>
                <p class="confirm-modal-text">${escapeHtml(message)}</p>
                <div class="confirm-modal-actions">
                    <button type="button" class="btn-secondary confirm-btn-non">${escapeHtml(texteNon)}</button>
                    <button type="button" class="${danger ? 'btn-danger' : 'btn-primary'} confirm-btn-oui">${escapeHtml(texteOui)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const nettoyer = (valeur) => {
            overlay.classList.add('confirm-overlay-out');
            setTimeout(() => overlay.remove(), 120);
            document.removeEventListener('keydown', surTouche);
            resolve(valeur);
        };
        const surTouche = (e) => {
            if (e.key === 'Escape') nettoyer(false);
            if (e.key === 'Enter') nettoyer(true);
        };

        overlay.querySelector('.confirm-btn-non').addEventListener('click', () => nettoyer(false));
        overlay.querySelector('.confirm-btn-oui').addEventListener('click', () => nettoyer(true));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) nettoyer(false); });
        document.addEventListener('keydown', surTouche);

        overlay.querySelector('.confirm-btn-oui').focus();
    });
}
