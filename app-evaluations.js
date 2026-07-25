// app-evaluations.js — logique de la page Evaluations & Remuneration
// CONFIG, supabaseClient, toast, val, escapeHtml, garantirSessionRH etc. viennent de shared.js

let employees = [];
let reviews = [];
let compensations = [];
let selectedReviewEmployeeId = null;
let selectedCompEmployeeId = null;

// ============================================================
// CHARGEMENT
// ============================================================
async function chargerTout() {
    const [empRes, reviewRes, compRes] = await Promise.all([
        supabaseClient.from('employees').select('id, prenom, nom, poste, service, email, token, date_arrivee').eq('org_id', currentOrg.id).order('created_at', { ascending: false }),
        supabaseClient.from('reviews').select('*').eq('org_id', currentOrg.id).order('date_entretien', { ascending: false }),
        supabaseClient.from('compensations').select('*').eq('org_id', currentOrg.id).order('date_effet', { ascending: false })
    ]);

    if (empRes.error || reviewRes.error || compRes.error) {
        toast("Erreur de chargement des données.", "error");
        return;
    }

    employees = empRes.data || [];
    reviews = reviewRes.data || [];
    compensations = compRes.data || [];
    renderEmployeeReviewList();
}

// ============================================================
// STATUT ENTRETIEN
// ============================================================
function calculerStatutEntretien(emp) {
    const historique = reviews.filter(r => r.employee_id === emp.id).sort((a, b) => new Date(b.date_entretien) - new Date(a.date_entretien));
    const dernier = historique[0];
    const dateReference = dernier ? new Date(dernier.date_entretien) : (emp.date_arrivee ? new Date(emp.date_arrivee) : null);

    if (!dateReference || isNaN(dateReference)) {
        return { label: "Date d'arrivée manquante", classe: 'status-neutral', historique, prochaine: null };
    }

    const prochaine = new Date(dateReference);
    prochaine.setMonth(prochaine.getMonth() + 3);
    const joursRestants = Math.round((prochaine - new Date()) / (1000 * 60 * 60 * 24));

    let label, classe;
    if (joursRestants < 0) { label = `En retard (${Math.abs(joursRestants)} j)`; classe = 'status-late'; }
    else if (joursRestants <= 30) { label = `À prévoir (${joursRestants} j)`; classe = 'status-soon'; }
    else { label = "À jour"; classe = 'status-viewed'; }

    return { label, classe, historique, prochaine };
}

function historiqueRemuneration(empId) {
    return compensations.filter(c => c.employee_id === empId).sort((a, b) => new Date(b.date_effet) - new Date(a.date_effet));
}

function calculerDelta(entree, entreeSuivantePlusAncienne) {
    if (!entreeSuivantePlusAncienne || entreeSuivantePlusAncienne.salaire_fixe == null || entree.salaire_fixe == null) return null;
    const delta = entree.salaire_fixe - entreeSuivantePlusAncienne.salaire_fixe;
    if (delta === 0) return { texte: "Stable", classe: 'status-neutral' };
    const pct = ((delta / entreeSuivantePlusAncienne.salaire_fixe) * 100).toFixed(1);
    const signe = delta > 0 ? '+' : '';
    return {
        texte: `${signe}${formatMontant(delta)} (${signe}${pct}%)`,
        classe: delta > 0 ? 'status-viewed' : 'status-late'
    };
}

// ============================================================
// RENDU PRINCIPAL
// ============================================================
function renderEmployeeReviewList() {
    const container = document.getElementById('employeeReviewList');
    if (employees.length === 0) {
        container.innerHTML = `<p class="empty-hint">Aucun employé pour le moment. Ajoute-le depuis la page <a href="organigramme.html">Organigramme</a>.</p>`;
        return;
    }

    container.innerHTML = employees.map(emp => {
        const { label, classe, historique, prochaine } = calculerStatutEntretien(emp);
        const historiqueComp = historiqueRemuneration(emp.id);

        return `
            <div class="review-row">
                <div class="review-row-main">
                    <div class="employee-info">
                        <span class="employee-name">${escapeHtml(emp.prenom)} ${escapeHtml(emp.nom)}</span>
                        <span class="employee-meta">${prochaine ? 'Prochain entretien : ' + formatDateFR(prochaine) : "Renseigne sa date d'arrivée"}</span>
                    </div>
                    <div class="employee-status ${classe}">${label}</div>
                    <div class="employee-actions">
                        <button class="link-btn" onclick="ouvrirFormulaireEntretien('${emp.id}')">+ Entretien</button>
                        <button class="link-btn" onclick="ouvrirFormulaireRemuneration('${emp.id}')">+ Rémunération</button>
                    </div>
                </div>

                <div class="review-links-row">
                    <button class="link-btn" onclick="copierLienPreparation('${emp.id}')">Copier le lien de préparation</button>
                    <button class="link-btn" onclick="envoyerLienPreparation('${emp.id}')">Envoyer le lien par email</button>
                </div>

                <details class="review-history">
                    <summary>Historique entretiens (${historique.length}) &amp; rémunération (${historiqueComp.length})</summary>

                    ${historique.map(r => `
                        <div class="review-history-item">
                            <strong>${formatDateFR(r.date_entretien)} — Entretien</strong>
                            ${r.points_forts ? `<p>Points forts : ${escapeHtml(r.points_forts)}</p>` : ''}
                            ${r.points_amelioration ? `<p>Axes d'amélioration : ${escapeHtml(r.points_amelioration)}</p>` : ''}
                            ${r.objectifs ? `<p>Objectifs : ${escapeHtml(r.objectifs)}</p>` : ''}
                        </div>
                    `).join('')}

                    ${historiqueComp.map((c, i) => {
                        const delta = calculerDelta(c, historiqueComp[i + 1]);
                        return `
                            <div class="review-history-item comp-history-item">
                                <strong>${formatDateFR(c.date_effet)} — Rémunération</strong>
                                <p>Fixe : ${formatMontant(c.salaire_fixe)}${c.salaire_variable ? ' · Variable : ' + formatMontant(c.salaire_variable) : ''}
                                    ${delta ? `<span class="employee-status ${delta.classe} comp-delta">${delta.texte}</span>` : ''}
                                </p>
                                ${c.note ? `<p>${escapeHtml(c.note)}</p>` : ''}
                            </div>
                        `;
                    }).join('')}

                    ${historique.length === 0 && historiqueComp.length === 0 ? `<p class="empty-hint">Rien d'enregistré pour le moment.</p>` : ''}
                </details>
            </div>
        `;
    }).join('');
}

// ============================================================
// FORMULAIRE ENTRETIEN
// ============================================================
function ouvrirFormulaireEntretien(employeeId) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    selectedReviewEmployeeId = employeeId;
    document.getElementById('reviewFormLabel').innerText = `Compte-rendu pour ${emp.prenom} ${emp.nom}`;
    document.getElementById('reviewDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('reviewPointsForts').value = "";
    document.getElementById('reviewPointsAmelioration').value = "";
    document.getElementById('reviewObjectifs').value = "";
    const section = document.getElementById('reviewFormSection');
    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function fermerFormulaireEntretien() {
    selectedReviewEmployeeId = null;
    document.getElementById('reviewFormSection').classList.add('hidden');
}

async function enregistrerEntretien() {
    if (!selectedReviewEmployeeId) return;
    const date_entretien = val('reviewDate');
    if (!date_entretien) { toast("Renseigne la date de l'entretien.", "error"); return; }

    const { error } = await supabaseClient.from('reviews').insert([{
        employee_id: selectedReviewEmployeeId,
        org_id: currentOrg.id,
        date_entretien,
        points_forts: val('reviewPointsForts'),
        points_amelioration: val('reviewPointsAmelioration'),
        objectifs: val('reviewObjectifs')
    }]);

    if (error) { toast("Erreur lors de l'enregistrement.", "error"); return; }
    toast("Compte-rendu enregistré.");
    fermerFormulaireEntretien();
    await chargerTout();
}

// ============================================================
// FORMULAIRE RÉMUNÉRATION
// ============================================================
function ouvrirFormulaireRemuneration(employeeId) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    selectedCompEmployeeId = employeeId;
    document.getElementById('compFormLabel').innerText = `Nouvelle rémunération pour ${emp.prenom} ${emp.nom}`;
    document.getElementById('compDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('compFixe').value = "";
    document.getElementById('compVariable').value = "";
    document.getElementById('compNote').value = "";
    const section = document.getElementById('compFormSection');
    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function fermerFormulaireRemuneration() {
    selectedCompEmployeeId = null;
    document.getElementById('compFormSection').classList.add('hidden');
}

async function enregistrerRemuneration() {
    if (!selectedCompEmployeeId) return;
    const date_effet = val('compDate');
    const salaire_fixe = val('compFixe');
    if (!date_effet || !salaire_fixe) { toast("Renseigne au moins la date d'effet et le salaire fixe.", "error"); return; }

    const { error } = await supabaseClient.from('compensations').insert([{
        employee_id: selectedCompEmployeeId,
        org_id: currentOrg.id,
        date_effet,
        salaire_fixe: Number(salaire_fixe),
        salaire_variable: val('compVariable') ? Number(val('compVariable')) : null,
        note: val('compNote')
    }]);

    if (error) { toast("Erreur lors de l'enregistrement.", "error"); return; }
    toast("Rémunération enregistrée.");
    fermerFormulaireRemuneration();
    await chargerTout();
}

// ============================================================
// LIEN DE PRÉPARATION D'ENTRETIEN ANNUEL
// ============================================================
function lienPreparation(emp) {
    return `${window.location.origin}/mon-entretien.html?token=${emp.token}`;
}

async function copierLienPreparation(employeeId) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    const lien = lienPreparation(emp);
    try {
        await navigator.clipboard.writeText(lien);
        toast("Lien copié dans le presse-papiers.");
    } catch (err) {
        toast(lien, "error");
    }
}

async function envoyerLienPreparation(employeeId) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    if (!emp.email) { toast("Cet employé n'a pas d'email enregistré (voir la page Organigramme).", "error"); return; }
    const lien = lienPreparation(emp);

    try {
        const res = await fetch(CONFIG.SEND_EMAIL_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: emp.email,
                subject: `Prépare ton prochain entretien`,
                html: `
                    <div style="font-family: Arial, sans-serif; color:#1e2430; padding:24px; max-width:520px; border:1px solid #E4E1D8; border-radius:12px;">
                        <h2 style="color:#B8863B; margin-top:0;">Bonjour ${escapeHtml(emp.prenom)},</h2>
                        <p>Ton prochain entretien approche. Tu peux consulter l'historique de tes entretiens et préparer tes objectifs via ton espace personnel :</p>
                        <div style="text-align:center; margin:24px 0;">
                            <a href="${lien}" style="background:#101828; color:#fff; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">
                                Accéder à mon espace entretien
                            </a>
                        </div>
                    </div>
                `
            })
        });
        if (res.ok) { toast(`Lien envoyé à ${emp.email}`); }
        else { toast("Erreur lors de l'envoi.", "error"); }
    } catch (err) {
        console.error(err);
        toast("Impossible de contacter le serveur d'envoi.", "error");
    }
}

// ============================================================
// DÉMARRAGE
// ============================================================
window.onload = async function () {
    await garantirSessionRH();
    if (!currentOrg) return;
    await chargerTout();
};
