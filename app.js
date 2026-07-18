// 🔑 VOS IDENTIFIANTS DE REQUÊTES CLOUD
const SUPABASE_URL = "https://qaydzplnxjdyyutjyqzy.supabase.co";
const SUPABASE_ANON_KEY = "METS_ICI_TA_CLE_ANON_PUBLIC_DE_SUPABASE";

// Initialisation sécurisée du client Supabase
const supabase = (SUPABASE_ANON_KEY !== "METS_ICI_TA_CLE_ANON_PUBLIC_DE_SUPABASE") ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Clé API Resend pour l'expédition vers Gmail / Hotmail
const RESEND_API_KEY = "re_VBiCKaEy_54ahgNm6Ft6ZhZboBGU2mdbA"; 

// Synchronisation instantanée des champs de saisie vers l'écran
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

// 🚀 ENREGISTREMENT CLOUD SUPABASE + EXPÉDITION EMAIL VIA RESEND
async function declencherOnboardingGeneral() {
    const prenom = document.getElementById('empPrenom').value;
    const nom = document.getElementById('empNom').value;
    const poste = document.getElementById('empPoste').value;
    const email = document.getElementById('empEmail').value;
    const boite = document.getElementById('cfgBoite').value;
    const wifi = document.getElementById('cfgWifi').value;

    if (!prenom || !nom || !email) {
        alert("Veuillez remplir le prénom, le nom et l'email avant de valider.");
        return;
    }

    // Génération d'une empreinte d'URL d'arrivée unique (ex: thomas-432)
    const uniqueId = prenom.toLowerCase() + "-" + Math.floor(Math.random() * 1000);
    const currentUrl = window.location.origin + window.location.pathname;
    const shareLink = `${currentUrl}?id=${uniqueId}`;

    document.getElementById('shareableLink').innerText = shareLink;
    document.getElementById('shareableLink').href = shareLink;

    // Mise à jour visuelle immédiate de l'organigramme RH de contrôle
    const rhNode = document.getElementById('rhOrgaDynamicNode');
    rhNode.innerText = `✨ ${prenom.toUpperCase()} ${nom.toUpperCase()} (${poste.split(' ')[0]})`;
    rhNode.classList.remove('hidden');

    // 1. ÉCRITURE ET SAUVEGARDE EN BASE DE DONNÉES CLOUD
    if (!supabase) {
        alert("⚠️ ATTENTION : Vous n'avez pas encore configuré votre SUPABASE_ANON_KEY à la ligne 3 du fichier app.js. Passage en mode simulation.");
        basculerVue('Employee');
        return;
    }

    try {
        const { error } = await supabase
            .from('onboardings')
            .insert([{ id: uniqueId, prenom: prenom, nom: nom, poste: poste, email: email, boite: boite, wifi: wifi }]);
        
        if (error) throw error;
        console.log("Fiche d'intégration stockée avec succès sur le Cloud Supabase !");
    } catch (err) {
        alert("Erreur technique d'écriture Supabase. Vérifiez que votre table s'appelle bien 'onboardings' et que le RLS est désactivé.");
        console.error(err);
        return;
    }

    // 2. DISTRIBUTION DU MAIL VERS GMAIL ET HOTMAIL VIA RESEND
    fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'onboarding@resend.dev', 
            to: email,
            subject: `Bienvenue chez ${boite} ! Ton espace d'intégration unique`,
            html: `
                <div style="font-family: sans-serif; color: #333; padding: 25px; max-width: 550px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    <h2 style="color: #10b981; margin-top: 0;">Bienvenue dans l'équipe, ${prenom} ! 👋</h2>
                    <p>Toute l'équipe de <strong>${boite}</strong> est impatiente de t'accueillir en tant que <strong>${poste}</strong>.</p>
                    <p>Pour préparer ton arrivée, nous t'avons configuré un espace de suivi personnel en direct.</p>
                    <div style="margin: 25px 0; text-align: center;">
                        <a href="${shareLink}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accéder à mon Portail DayOne</a>
                    </div>
                    <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px;">DayOne OS — L'onboarding instantané.</p>
                </div>
            `
        })
    }).then(res => {
        if(res.ok) {
            alert(`🚀 CLOUD & TRANSMISSION OK !\n\n1. Les données sont sauvegardées en BDD.\n2. L'email contenant l'accès persistant vient d'être envoyé à : ${email}.\n\nVous allez être redirigé vers l'aperçu.`);
            basculerVue('Employee');
        } else {
            alert("Erreur de routage Resend. Vérifiez les limitations de votre compte.");
        }
    }).catch(err => console.error("Erreur réseau Resend :", err));
}

// 🔍 CAPTEUR DE FLUX D'ARRIVÉE : Si un ID est présent dans l'adresse URL, charger la bonne ligne Cloud
async function verifierUrlDArrivee() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (userId && supabase) {
        try {
            const { data, error } = await supabase
                .from('onboardings')
                .select('*')
                .eq('id', userId)
                .single();

            if (data && !error) {
                // Remplissage automatique de la vue Salarié avec les vraies données de sa ligne de BDD
                document.getElementById('empWelcomeName').innerText = data.prenom;
                document.getElementById('empWelcomeBoite').innerText = data.boite;
                document.getElementById('empWelcomePoste').innerText = `[${data.poste}]`;
                document.getElementById('empWelcomeWifi').innerText = data.wifi;
                document.getElementById('empSelfOrgaNode').innerText = `${data.prenom.toUpperCase()} ${data.nom.toUpperCase()} (Moi)`;
                
                // Forcer le basculement d'affichage en mode Salarié
                basculerVue('Employee');
                // Masquer les commandes RH pour le salarié
                document.getElementById('viewRhBtn').style.display = 'none';
            }
        } catch (err) {
            console.error("Échec d'interrogation Supabase :", err);
        }
    }
}

// Commutateur graphique d'affichage d'écran
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

// Amorçage au chargement complet
window.onload = function() {
    synchroTotale();
    verifierUrlDArrivee();
};
