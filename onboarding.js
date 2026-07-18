function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

async function chargerEspacePersonnel() {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { afficherErreur(); return; }

    try {
        const res = await fetch(`/api/employee-view?token=${encodeURIComponent(token)}`);
        if (!res.ok) { afficherErreur(); return; }
        const { employee, organization, colleagues } = await res.json();
        afficherContenu(employee, organization, colleagues);
    } catch (err) {
        console.error(err);
        afficherErreur();
    }
}

function afficherErreur() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
}

function afficherContenu(employee, organization, colleagues) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('contentState').classList.remove('hidden');

    document.getElementById('empWelcomeName').innerText = employee.prenom;
    document.getElementById('empWelcomeDate').innerText = formatDate(employee.date_arrivee);
    document.getElementById('empWelcomeBoite').innerText = organization?.nom || "";
    document.getElementById('empWelcomePoste').innerText = employee.poste ? `[${employee.poste}]` : "";
    document.getElementById('empWelcomeWifi').innerText = organization?.wifi || "—";

    if (organization?.logo_data_url) {
        const slot = document.getElementById('empLogoSpace');
        slot.innerHTML = `<img src="${organization.logo_data_url}" style="height:34px;border-radius:6px;">`;
        slot.classList.remove('hidden');
    }

    const docsWrapper = document.getElementById('empDocsDownloadWrapper');
    const docs = organization?.documents || [];
    docsWrapper.innerHTML = docs.length
        ? docs.map(d => `<a href="${d.dataUrl}" download="${escapeHtml(d.name)}">⬇ ${escapeHtml(d.name)}</a>`).join('<br>')
        : "Aucun document annexe";

    const teamContainer = document.getElementById('teamContainer');
    const equipe = (colleagues || []).filter(c => !(c.prenom === employee.prenom && c.nom === employee.nom));

    let html = "";
    if (employee.manager) {
        html += `<div class="team-manager">👔 ${escapeHtml(employee.manager)} — ton manager</div>`;
    }
    html += `<div class="team-self">✨ ${escapeHtml(employee.prenom)} ${escapeHtml(employee.nom)} (toi) — ${escapeHtml(employee.poste) || '—'}</div>`;
    if (equipe.length > 0) {
        html += `<div class="team-others-label">Collègues du service ${escapeHtml(employee.service || '')}</div>`;
        html += equipe.map(c => `<div class="team-other">${escapeHtml(c.prenom)} ${escapeHtml(c.nom)} — ${escapeHtml(c.poste) || '—'}</div>`).join('');
    }
    teamContainer.innerHTML = html;
}

window.onload = chargerEspacePersonnel;
