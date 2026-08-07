function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function formatDateFR(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMontant(n) {
    if (n === null || n === undefined || n === '') return "—";
    return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + " €";
}

let currentToken = null;
let saveTimer = null;
let dernieresDonneesEntretien = null;

async function chargerEspaceEntretien() {
    currentToken = new URLSearchParams(window.location.search).get('token');
    if (!currentToken) { afficherErreur(); return; }

    try {
        const res = await fetch(`/api/employee-reviews?token=${encodeURIComponent(currentToken)}`);
        if (!res.ok) { afficherErreur(); return; }
        const { employee, reviews, compensations } = await res.json();
        dernieresDonneesEntretien = { employee, reviews, compensations };
        afficherContenu(employee, reviews, compensations);
    } catch (err) {
        console.error(err);
        afficherErreur();
    }
}

// Appelé par i18n.js après un changement de langue.
function onLanguageChangeRerender() {
    if (!dernieresDonneesEntretien) return;
    const { employee, reviews, compensations } = dernieresDonneesEntretien;
    afficherContenu(employee, reviews, compensations);
}

function afficherErreur() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
}

function afficherContenu(employee, reviews, compensations) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('contentState').classList.remove('hidden');

    document.getElementById('empNom').innerText = `${employee.prenom} ${employee.nom}`;
    document.getElementById('empPoste').innerText = employee.poste || '';
    document.getElementById('prepNotes').value = employee.prep_notes || '';

    const reviewsContainer = document.getElementById('reviewsContainer');
    reviewsContainer.innerHTML = reviews.length ? reviews.map(r => `
        <div class="chain-item chain-item-block">
            <strong>${formatDateFR(r.date_entretien)}</strong>
            ${r.points_forts ? `<p>${t('Points forts')} : ${escapeHtml(r.points_forts)}</p>` : ''}
            ${r.points_amelioration ? `<p>${t("Axes d'amélioration")} : ${escapeHtml(r.points_amelioration)}</p>` : ''}
            ${r.objectifs ? `<p>${t('Objectifs')} : ${escapeHtml(r.objectifs)}</p>` : ''}
        </div>
    `).join('') : `<p class="empty-hint">${t('Aucun entretien enregistré pour le moment.')}</p>`;

    const compContainer = document.getElementById('compContainer');
    compContainer.innerHTML = compensations.length ? compensations.map((c, i) => {
        const precedent = compensations[i + 1];
        let delta = '';
        if (precedent && precedent.salaire_fixe && c.salaire_fixe != null) {
            const diff = c.salaire_fixe - precedent.salaire_fixe;
            if (diff !== 0) {
                const pct = ((diff / precedent.salaire_fixe) * 100).toFixed(1);
                delta = ` <span class="${diff > 0 ? 'accent' : ''}">(${diff > 0 ? '+' : ''}${formatMontant(diff)}, ${diff > 0 ? '+' : ''}${pct}%)</span>`;
            }
        }
        return `
            <div class="chain-item chain-item-block">
                <strong>${formatDateFR(c.date_effet)}</strong>
                <p>${t('Fixe')} : ${formatMontant(c.salaire_fixe)}${c.salaire_variable ? ' · ' + t('Variable') + ' : ' + formatMontant(c.salaire_variable) : ''}${delta}</p>
                ${c.note ? `<p>${escapeHtml(c.note)}</p>` : ''}
            </div>
        `;
    }).join('') : `<p class="empty-hint">${t('Aucune rémunération enregistrée pour le moment.')}</p>`;
}

function planifierSauvegardeNotes() {
    clearTimeout(saveTimer);
    document.getElementById('saveStatus').innerText = t("Frappe en cours…");
    saveTimer = setTimeout(sauvegarderNotes, 1200);
}

async function sauvegarderNotes() {
    const statusEl = document.getElementById('saveStatus');
    try {
        const res = await fetch('/api/employee-reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken, prep_notes: document.getElementById('prepNotes').value })
        });
        statusEl.innerText = res.ok ? t("Enregistré.") : t("Erreur d'enregistrement.");
    } catch (err) {
        statusEl.innerText = t("Erreur d'enregistrement.");
    }
    setTimeout(() => { statusEl.innerText = ""; }, 2500);
}

window.onload = function () {
    chargerEspaceEntretien();
    document.getElementById('prepNotes').addEventListener('input', planifierSauvegardeNotes);
};
