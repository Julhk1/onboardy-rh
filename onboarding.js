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
        const { employee, organization, colleagues, chaineHierarchique } = await res.json();
        afficherContenu(employee, organization, colleagues, chaineHierarchique || []);
    } catch (err) {
        console.error(err);
        afficherErreur();
    }
}

function afficherErreur() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
}

function afficherContenu(employee, organization, colleagues, chaineHierarchique) {
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

    // La chaîne remonte : N+1, N+2, N+3... on l'affiche donc du sommet vers toi.
    const chaineOrdreDescendant = [...chaineHierarchique].reverse();

    let html = `<div class="chain-list">`;
    chaineOrdreDescendant.forEach((personne, i) => {
        const niveau = chaineHierarchique.length - i; // niveau N+x le plus haut affiché en premier
        html += `
            <div class="chain-item">
                <span class="chain-level">N+${niveau}</span>
                <span>${escapeHtml(personne.prenom)}${personne.nom ? ' ' + escapeHtml(personne.nom) : ''}${personne.poste ? ' — ' + escapeHtml(personne.poste) : ''}</span>
            </div>
        `;
    });
    html += `
        <div class="chain-item is-self">
            <span class="chain-level">Toi</span>
            <span>${escapeHtml(employee.prenom)} ${escapeHtml(employee.nom)} — ${escapeHtml(employee.poste) || '—'}</span>
        </div>
    </div>`;

    if (equipe.length > 0) {
        html += `<div class="team-others-label">Collègues du service ${escapeHtml(employee.service || '')}</div>`;
        html += `<div class="team-list">` + equipe.map(c =>
            `<div class="team-other">${escapeHtml(c.prenom)} ${escapeHtml(c.nom)} — ${escapeHtml(c.poste) || '—'}</div>`
        ).join('') + `</div>`;
    }

    teamContainer.innerHTML = html;

    // ---- Sections optionnelles : n'apparaissent que si la RH les a remplies ----
    const checklist = organization?.checklist || [];
    if (checklist.length > 0) {
        document.getElementById('checklistSection').classList.remove('hidden');
        document.getElementById('checklistContainer').innerHTML = checklist.map((etape, i) => `
            <div class="checklist-employee-item">
                <span class="checklist-employee-num">${i + 1}</span>
                <div>
                    <h4>${escapeHtml(etape.titre)}</h4>
                    ${etape.description ? `<p>${escapeHtml(etape.description)}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    const liens = organization?.useful_links || [];
    if (liens.length > 0) {
        document.getElementById('linksSection').classList.remove('hidden');
        document.getElementById('linksContainer').innerHTML = liens.map(l => `
            <a class="mini-list-item" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">
                🔗 ${escapeHtml(l.nom)}
            </a>
        `).join('');
    }

    const contacts = organization?.key_contacts || [];
    if (contacts.length > 0) {
        document.getElementById('contactsSection').classList.remove('hidden');
        document.getElementById('contactsContainer').innerHTML = contacts.map(c => `
            <div class="mini-list-item">
                <strong>${escapeHtml(c.nom)}</strong> — ${escapeHtml(c.role)}<br>
                <span class="mono">${escapeHtml(c.contact)}</span>
            </div>
        `).join('');
    }
}

window.onload = chargerEspacePersonnel;
