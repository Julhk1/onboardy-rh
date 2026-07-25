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

function normaliserNom(s) {
    return (s || '').trim().toLowerCase();
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
