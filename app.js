// ============================================
// DAYONE — CONFIGURATION
// ============================================
// La clé Resend N'EST PLUS ICI : elle vit côté serveur dans
// la fonction /api/send-email.js (variable d'environnement).
// Ne jamais remettre de clé API secrète dans un fichier .js
// servi au navigateur — c'est visible par n'importe qui.
const CONFIG = {
    SUPABASE_URL: "https://qaydzplnxjdyyutjyqzy.supabase.co",
    SUPABASE_ANON_KEY: "METS_ICI_TA_CLE_ANON_PUBLIC_DE_SUPABASE", // La clé "anon" Supabase est publique par design (protégée par les règles RLS)
    SEND_EMAIL_ENDPOINT: "/api/send-email"
};

const supabase = (CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_ANON_KEY.startsWith("METS_ICI"))
    ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
    : null;

let logoBase64 = "";
let attachedDocs = [];

// ============================================
// TOASTS
// ============================================
function toast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

// ============================================
// SYNCHRONISATION DES CHAMPS + CHECKLIST
// ============================================
function synchroTotale() {
    const boite = val('cfgBoite');
    const wifi = val('cfgWifi');
    const prenom = val('empPrenom');
    const nom = val('empNom');
    const poste = val('empPoste');
    const email = val('empEmail');
    const date = val('empDate');
    const manager = val('empManager');

    setText('mailCible', email || 'exemple@email.com');
    setText('mailPrenom', prenom || '—');
    setText('mailPoste', poste ? `[${poste}]` : '[Poste non défini]');
    setText('mailManager', manager);

    setText('empWelcomeName', prenom);
    setText('empWelcomeBoite', boite);
    setText('empWelcomePoste', poste ? `[${poste}]` : '[Poste non défini]');
    setText('empWelcomeWifi', wifi);
    setText('empSelfOrgaNode', `${prenom.toUpperCase()} ${nom.toUpperCase()} (Moi)`);

    if (date) {
        const [y, m, d] = date.split('-');
        setText('empWelcomeDate', `${d}/${m}/${y}`);
    }

    mettreAJourChecklist();
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function emailEstValide(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mettreAJourChecklist() {
    const ficheComplete = val('empPrenom') && val('empNom') && val('empPoste') && val('empDate');
    const emailValide = emailEstValide(val('empEmail'));
    const logoCharge = !!logoBase64;
    const docsJoints = attachedDocs.length > 0;

    setChecklistItem('chkFiche', ficheComplete);
    setChecklistItem('chkEmail', emailValide);
    setChecklistItem('chkLogo', logoCharge);
    setChecklistItem('chkDocs', docsJoints);

    const total = [ficheComplete, emailValide, logoCharge, docsJoints].filter(Boolean).length;
    const pct = Math.round((total / 4) * 100);

    const bar = document.getElementById('progressBar');
    const pctLabel = document.getElementById('progressPct');
    if (bar) bar.style.width = pct + '%';
    if (pctLabel) pctLabel.innerText = pct + '%';
}

function setChecklistItem(id, done) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('is-complete', !!done);
}

// ============================================
// LOGO & DOCUMENTS
// ============================================
function chargerLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        logoBase64 = e.target.result;
        const preview = document.getElementById('logoPreview');
        if (preview) {
            preview.innerHTML = `<img src="${logoBase64}" style="height:36px;border-radius:6px;margin-bottom:4px;"><br><span style="color:var(--success);font-weight:600;">${file.name}</span>`;
        }
        const empSlot = document.getElementById('empLogoSpace');
        if (empSlot) empSlot.innerHTML = `<img src="${logoBase64}" style="height:32px;border-radius:6px;">`;
        mettreAJourChecklist();
    };
    reader.readAsDataURL(file);
}

function chargerDocuments(event) {
    const docList = document.getElementById('docList');
    const mailWrapper = document.getElementById('mailAttachedWrapper');
    const empWrapper = document.getElementById('empDocsDownloadWrapper');

    docList.innerHTML = "";
    mailWrapper.innerHTML = "";
    empWrapper.innerHTML = "";

    const files = event.target.files;
    attachedDocs = Array.from(files).map(f => f.name);

    if (files.length === 0) {
        empWrapper.innerText = "Aucun document annexe";
        mettreAJourChecklist();
        return;
    }

    for (const file of files) {
        docList.innerHTML += `<div>📁 ${file.name}</div>`;
        mailWrapper.innerHTML += `<span class="attachment-chip">${file.name}</span>`;
        empWrapper.innerHTML += `<a href="#" onclick="event.preventDefault(); toast('Téléchargement : ${file.name}')">⬇ ${file.name}</a><br>`;
    }

    mettreAJourChecklist();
}

function telechargerModeleExcel() {
    const csvContent = "data:text/csv;charset=utf-8,Prenom,Nom,Poste\nLucas,Bernard,Dev Front";
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Modele_DayOne.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importerCSV(event) {
    const file = event.target.files[0];
    if (file) toast(`Base employés "${file.name}" importée`, "success");
}

// ============================================
// LANCEMENT DE L'ONBOARDING (sauvegarde + email)
// ============================================
async function declencherOnboardingGeneral() {
    const prenom = val('empPrenom');
    const nom = val('empNom');
    const poste = val('empPoste');
    const email = val('empEmail');
    const boite = val('cfgBoite');
    const wifi = val('cfgWifi');
    const manager = val('empManager');

    if (!prenom || !nom || !email) {
        toast("Merci de renseigner au minimum le prénom, le nom et l'email.", "error");
        return;
    }
    if (!emailEstValide(email)) {
        toast("L'adresse email ne semble pas valide.", "error");
        return;
    }

    const btn = document.querySelector('.btn-primary');
    if (btn) { btn.disabled = true; btn.innerText = "Envoi en cours…"; }

    const uniqueId = `${prenom.toLowerCase()}-${Math.floor(Math.random() * 10000)}`;
    const shareLink = `${window.location.origin}${window.location.pathname}?id=${uniqueId}`;

    const linkEl = document.getElementById('shareableLink');
    if (linkEl) { linkEl.innerText = shareLink; linkEl.href = shareLink; }

    const rhNode = document.getElementById('rhOrgaDynamicNode');
    if (rhNode) {
        rhNode.innerText = `${prenom.toUpperCase()} ${nom.toUpperCase()} — ${poste.split(' ')[0]}`;
        rhNode.classList.remove('hidden');
    }

    // 1. Sauvegarde Supabase (si configuré)
    if (supabase) {
        try {
            await supabase.from('onboardings').insert([{
                id: uniqueId, prenom, nom, poste, email, boite, wifi, manager
            }]);
        } catch (err) {
            console.warn("Supabase non configuré, sauvegarde ignorée:", err);
        }
    }

    // 2. Envoi de l'email — passe par notre fonction serverless,
    // jamais d'appel direct à l'API Resend depuis le navigateur.
    try {
        const res = await fetch(CONFIG.SEND_EMAIL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: email,
                subject: `Bienvenue chez ${boite} !`,
                html: `
                    <div style="font-family: Arial, sans-serif; color:#1e2430; padding:24px; max-width:520px; border:1px solid #E4E1D8; border-radius:12px;">
                        <h2 style="color:#B8863B; margin-top:0;">Bienvenue, ${prenom} !</h2>
                        <p>Toute l'équipe de <strong>${boite}</strong> est ravie de t'accueillir en tant que <strong>${poste}</strong>.</p>
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
            toast(`Invitation envoyée à ${email}`, "success");
            basculerVue('Employee');
        } else {
            const data = await res.json().catch(() => ({}));
            console.error(data);
            toast("La fonction /api/send-email n'est pas encore déployée — voir le README.", "error");
        }
    } catch (err) {
        console.error(err);
        toast("Impossible de contacter le serveur d'envoi. As-tu déployé la fonction /api/send-email ?", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Enregistrer et envoyer l'invitation"; }
    }
}

// ============================================
// ARRIVÉE VIA LIEN PARTAGÉ
// ============================================
async function verifierUrlDArrivee() {
    const userId = new URLSearchParams(window.location.search).get('id');
    if (!userId || !supabase) return;

    try {
        const { data, error } = await supabase.from('onboardings').select('*').eq('id', userId).single();
        if (data && !error) {
            setText('empWelcomeName', data.prenom);
            setText('empWelcomeBoite', data.boite);
            setText('empWelcomePoste', `[${data.poste}]`);
            setText('empWelcomeWifi', data.wifi);
            setText('empSelfOrgaNode', `${data.prenom.toUpperCase()} ${data.nom.toUpperCase()} (Moi)`);
            basculerVue('Employee');
            const rhBtn = document.getElementById('viewRhBtn');
            if (rhBtn) rhBtn.style.display = 'none';
        }
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// BASCULE DE VUE
// ============================================
function basculerVue(type) {
    const rh = document.getElementById('containerRH');
    const emp = document.getElementById('containerEmployee');
    const btnRh = document.getElementById('viewRhBtn');
    const btnEmp = document.getElementById('viewEmpBtn');

    const isRh = type === 'RH';
    rh?.classList.toggle('hidden', !isRh);
    emp?.classList.toggle('hidden', isRh);
    btnRh?.classList.toggle('is-active', isRh);
    btnEmp?.classList.toggle('is-active', !isRh);
    btnRh?.setAttribute('aria-selected', isRh);
    btnEmp?.setAttribute('aria-selected', !isRh);
}

window.onload = function () {
    synchroTotale();
    verifierUrlDArrivee();
};
