// Synchronisation des textes en direct entre les deux vues (RH et Employé)
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

// 🚀 ENVOI MAILS VERS GMAIL / HOTMAIL VIA L'API RESEND
function declencherOnboardingGeneral() {
    const prenom = document.getElementById('empPrenom').value;
    const nom = document.getElementById('empNom').value;
    const poste = document.getElementById('empPoste').value;
    const email = document.getElementById('empEmail').value;
    const boite = document.getElementById('cfgBoite').value;

    // Mise à jour visuelle immédiate de l'organigramme RH
    const rhNode = document.getElementById('rhOrgaDynamicNode');
    rhNode.innerText = `✨ ${prenom.toUpperCase()} ${nom.toUpperCase()} (${poste.split(' ')[0]})`;
    rhNode.classList.remove('hidden');

    // Clé Resend configurée de ton compte
    const RESEND_API_KEY = "re_VBiCKaEy_54ahgNm6Ft6ZhZboBGU2mdbA"; 

    // Envoi de la requête réseau sécurisée à Resend
    fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'onboarding@resend.dev', 
            to: email,
            subject: `Bienvenue chez ${boite} ! Votre espace d'intégration unique`,
            html: `
                <div style="font-family: sans-serif; color: #333; padding: 20px; max-width: 600px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #10b981;">Bienvenue dans l'équipe, ${prenom} ! 🚀</h2>
                    <p>Nous sommes ravis de t'accueillir chez <strong>${boite}</strong> au poste de <strong>${poste}</strong>.</p>
                    <p>Ton espace personnel d'intégration à l'organigramme est prêt à être exploré.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #666;">Généré automatiquement par DayOne OS.</p>
                </div>
            `
        })
    })
    .then(res => {
        if(res.ok) {
            alert(`📨 SUCCÈS NET ! Le flux Resend a bien distribué l'email d'onboarding à : ${email}\n\nL'organigramme a été mis à jour.`);
            basculerVue('Employee');
        } else {
            alert("Erreur lors de la distribution du mail via Resend. Vérifie les quotas de ton compte gratuit.");
        }
    })
    .catch(err => {
        alert("Erreur réseau lors de l'appel à Resend.");
        console.error(err);
    });
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

// Initialisation globale
window.onload = function() {
    synchroTotale();
};
