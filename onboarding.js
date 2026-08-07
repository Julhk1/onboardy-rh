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
        const { employee, organization, colleagues, chaineHierarchique, organigrammeComplet } = await res.json();
        afficherContenu(employee, organization, colleagues, chaineHierarchique || [], organigrammeComplet);
    } catch (err) {
        console.error(err);
        afficherErreur();
    }
}

function afficherErreur() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
}

function afficherContenu(employee, organization, colleagues, chaineHierarchique, organigrammeComplet) {
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

    if (organigrammeComplet && organigrammeComplet.length > 0) {
        document.getElementById('fullChartSection').classList.remove('hidden');
        document.getElementById('fullChartContainer').innerHTML = construireEtRendreArbre(organigrammeComplet);
        ajusterEchelleOrganigramme(document.getElementById('fullChartContainer'));
    }
}

// ---- Organigramme complet : mêmes règles de construction que côté RH ----
function normaliserNomPersonne(s) {
    return (s || '')
        .replace(/\(.*?\)/g, ' ')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function construireEtRendreArbre(liste) {
    const parNom = {};
    liste.forEach(e => { parNom[normaliserNomPersonne(`${e.prenom} ${e.nom}`)] = e; });

    const enfantsDe = {};
    liste.forEach(e => {
        const cle = e.manager && parNom[normaliserNomPersonne(e.manager)] ? normaliserNomPersonne(e.manager) : '__racine__';
        if (!enfantsDe[cle]) enfantsDe[cle] = [];
        enfantsDe[cle].push(e);
    });

    const racines = enfantsDe['__racine__'] || [];
    if (racines.length === 0) return `<p class="empty-hint">Organigramme indisponible.</p>`;

    const visites = new Set();
    function rendre(e) {
        const cle = normaliserNomPersonne(`${e.prenom} ${e.nom}`);
        if (visites.has(cle)) return '';
        visites.add(cle);
        const enfants = enfantsDe[cle] || [];
        return `
            <li>
                <div class="tree-box">
                    <div class="tree-box-header">
                        <span class="tree-avatar">${(e.prenom || '?').charAt(0)}${(e.nom || '?').charAt(0)}</span>
                        <div class="tree-box-text">
                            <span class="tree-name">${escapeHtml(e.prenom)} ${escapeHtml(e.nom)}</span>
                            <span class="tree-role">${escapeHtml(e.poste) || '—'}</span>
                        </div>
                    </div>
                    <span class="service-chip tree-service">${escapeHtml(e.service)}</span>
                </div>
                ${enfants.length ? `<ul>${enfants.map(rendre).join('')}</ul>` : ''}
            </li>
        `;
    }

    return `<div class="orgtree-scale-wrapper"><div class="orgtree"><ul>${racines.map(rendre).join('')}</ul></div></div>`;
}

function ajusterEchelleOrganigramme(container) {
    const tree = container.querySelector('.orgtree');
    if (!tree) return;
    tree.style.transform = 'none';

    const boites = tree.querySelectorAll('.tree-box');
    if (boites.length === 0) return;

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

window.onload = chargerEspacePersonnel;
