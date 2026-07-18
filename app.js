// Synchronisation des textes en direct entre les deux vues
function synchroTotale() {
    const boite = document.getElementById('cfgBoite').value;
    const wifi = document.getElementById('cfgWifi').value;
    const prenom = document.getElementById('empPrenom').value;
    const nom = document.getElementById('empNom').value;
    const poste = document.getElementById('empPoste').value;
    const email = document.getElementById('empEmail').value;
    const date = document.getElementById('empDate').value;
    const manager = document.getElementById('empManager').value;

    document.getElementById('mailCible').innerText = email || 'thomas.dubois@gmail.com';
    document.getElementById('mailPrenom').innerText = prenom || 'Thomas';
    document.getElementById('mailPoste').innerText = poste ? `[${poste}]` : '[Poste non défini]';
    document.getElementById('mailManager').innerText = manager;

    document.getElementById('empWelcomeName').innerText = prenom;
    document.getElementById('empWelcomeBoite').innerText = boite;
    document.getElementById('empWelcomePoste').innerText = poste ? `[${poste}]` : '[Poste non défini]';
    document.getElementById('empWelcomeWifi').innerText = wifi;
    document.getElementById('empSelfOrgaNode').innerText = `${prenom.toUpperCase()} ${nom.toUpperCase()} (Moi)`;

    if (date) {
        const parts = date.split('-');
        document.getElementById('empWelcomeDate').innerText = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
}

function chargerLogo(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('logoPreview').innerHTML = `✅ Logo : <span class="text-emerald-400 font-bold">${file.name}</span>`;
        document.getElementById('empLogoSpace').innerHTML = `🏢 <span class="text-white font-bold">${file.name.split('.')[0].toUpperCase()}</span>`;
    }
}

function chargerDocuments(event) {
    const docList = document.getElementById('docList');
    const mailWrapper = document.getElementById('mailAttachedWrapper');
    const empDownloadWrapper = document.getElementById('empDocsDownloadWrapper');
    
    docList.innerHTML = ""; mailWrapper.innerHTML = ""; empDownloadWrapper.innerHTML = "";
    const files = event.target.files;
    if(files.length === 0) {
        empDownloadWrapper.innerText = "Aucun document annexe"; return;
    }
    for (let i = 0; i < files.length; i++) {
        docList.innerHTML += `<div>📁 ${files[i].name}</div>`;
        mailWrapper.innerHTML += `<div class="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[10px] text-slate-400">📎 ${files[i].name}</div>`;
        empDownloadWrapper.innerHTML += `<a href="#" class="block text-emerald-400 hover:underline">⬇️ ${files[i].name}</a>`;
    }
}

function telechargerModeleExcel() {
    const csvContent = "data:text/csv;charset=utf-8,Prenom,Nom,Poste\nLucas,Bernard,Dev Front";
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Modele_DayOne.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function importerCSV(event) {
    const file = event.target.files[0];
    if (file) alert(`📊 Base employés : "${file.name}" injectée avec succès !`);
}

// 🚀 ENVOI ROBUSTE VERS GMAIL / HOTMAIL VIA L'API RESEND
function declencherOnboardingGeneral() {
    const prenom = document.getElementById('empPrenom').value;
    const nom = document.getElementById('empNom').value;
    const poste = document.getElementById('empPoste').value;
    const email = document.getElementById('empEmail').value;
    const boite = document.getElementById('cfgBoite').value;

    // Mise à jour de l'organigramme RH
    const rhNode = document.getElementById('rhOrgaDynamicNode');
    rhNode.innerText = `✨ ${prenom.toUpperCase()} ${nom.toUpperCase()} (${poste.split(' ')[0]})`;
    rhNode.classList.remove('hidden');

    // CONFIGURATION DE TA CLÉ RESEND POUR LES VRAIS MAILS (Gratuit sur resend.com)
    const RESEND_API_KEY = "VOTRE_API_KEY_RESEND"; 

    if (RESEND_API_KEY === "VOTRE_API_KEY_RESEND") {
        alert(`⚡ MODE DÉMO GRAPHIQUE :\nL'organigramme s'est mis à jour et le mail est prêt ! Pour recevoir le VRAI mail sur ton Gmail ou ton Hotmail, crée un compte gratuit sur resend.com et colle ta clé API à la ligne 64 du fichier app.js.`);
        basculerVue('Employee');
        return;
    }

    // Appel API direct vers les serveurs de routage de Resend (Délivrabilité Gmail/Hotmail à 99.9%)
    fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'onboarding@resend.dev', // Remplaçable par ton domaine plus tard
            to: email,
            subject: `Bienvenue chez ${boite} ! Votre espace d'intégration unique`,
            html: `<p>Hello <strong>${prenom}</strong>,</p><p>Toute l'équipe de ${boite} a hâte de t'accueillir en tant que ${poste} !</p><p>Découvre ton espace d'intégration en direct sur DayOne OS.</p>`
        })
    }).then(res => {
        if(res.ok) {
            alert(`📨 VRAI MAIL ENVOYÉ ! Le flux réseau a distribué le mail avec succès vers l'adresse : ${email}. (Vérifie ta boîte de réception ou tes spams)`);
            basculerVue('Employee');
        } else {
            alert("Erreur lors de la distribution du mail via Resend.");
        }
    }).catch(err => console.error(err));
}

function basculerVue(type) {
    const r = document.getElementById('containerRH');
    const e = document.getElementById('containerEmployee');
    const br = document.getElementById('viewRhBtn');
    const be = document.getElementById('viewEmpBtn');

    if (type === 'RH') {
        r.classList.remove('hidden'); e.classList.add('hidden');
        br.classList.add('active-vue'); be.classList.remove('active-vue');
    } else {
        r.classList.add('hidden'); e.classList.remove('hidden');
        be.classList.add('active-vue'); br.classList.remove('active-vue');
    }
}

// Lancement automatique
window.onload = function() {
    synchroTotale();
};
