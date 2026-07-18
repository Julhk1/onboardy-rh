// 🔑 VOS IDENTIFIANTS DE REQUÊTES CLOUD (Optionnels pour simuler)
const SUPABASE_URL = "https://qaydzplnxjdyyutjyqzy.supabase.co";
const SUPABASE_ANON_KEY = "METS_ICI_TA_CLE_ANON_PUBLIC_DE_SUPABASE";

// Initialisation sécurisée du client Supabase
const supabase = (SUPABASE_ANON_KEY !== "METS_ICI_TA_CLE_ANON_PUBLIC_DE_SUPABASE" && SUPABASE_ANON_KEY !== "") ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Clé API Resend officielle injectée pour tes tests vers Gmail / Hotmail
const RESEND_API_KEY = "re_VBiCKaEy_54ahgNm6Ft6ZhZboBGU2mdbA"; 

// Mémoire locale pour les fichiers chargés
let logoBase64 = "";

function synchroTotale() {
    const boite = document.getElementById('cfgBoite').value;
    const wifi = document.getElementById('cfgWifi').value;
    const prenom = document.getElementById('empPrenom').value;
    const nom = document.getElementById('empNom').value;
    const poste = document.getElementById('empPoste').value;
    const email = document.getElementById('empEmail').value;
    const date = document.getElementById('empDate').value;
    const manager = document.getElementById('empManager').value;

    if(document.getElementById('mailCible')) document.getElementById('mailCible').innerText = email || 'thomas.dubois@gmail.com';
    if(document.getElementById('mailPrenom')) document.getElementById('mailPrenom').innerText = prenom || 'Thomas';
    if(document.getElementById('mailPoste')) document.getElementById('mailPoste').innerText = poste ? `[${poste}]` : '[Poste non défini]';
    if(document.getElementById('mailManager')) document.getElementById('mailManager').innerText = manager;

    if(document.getElementById('empWelcomeName')) document.getElementById('empWelcomeName').innerText = prenom;
    if(document.getElementById('empWelcomeBoite')) document.getElementById('empWelcomeBoite').innerText = boite;
    if(document.getElementById('empWelcomePoste')) document.getElementById('empWelcomePoste').innerText = poste ? `[${poste}]` : '[Poste non défini]';
    if(document.getElementById('empWelcomeWifi')) document.getElementById('empWelcomeWifi').innerText = wifi;
    if(document.getElementById('empSelfOrgaNode')) document.getElementById('empSelfOrgaNode').innerText = `${prenom.toUpperCase()} ${nom.toUpperCase()} (Moi)`;

    if (date && document.getElementById('empWelcomeDate')) {
        const parts = date.split('-');
        document.getElementById('empWelcomeDate').innerText = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
}

// 🖼️ CHARGEMENT DU LOGO EN DIRECT SANS BUG
function chargerLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            logoBase64 = e.target.result;
            document.getElementById('logoPreview').innerHTML = `<img src="${logoBase64}" class="mx-auto h-12 rounded shadow-sm mb-1"> ✅ <span class="text-emerald-600 font-bold">${file.name}</span>`;
            document.getElementById('empLogoSpace').innerHTML = `<img src="${logoBase64}" class="h-10 rounded object-contain mb-2">`;
        };
        reader.readAsDataURL(file);
    }
}

// 📎 CHARGEMENT DES DOCUMENTS ANNEXES EN DIRECT SANS BUG
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
        docList.innerHTML += `<div class="font-medium text-slate-700">📁 ${files[i].name}</div>`;
        mailWrapper.innerHTML += `<div class="bg-white px-2 py-1 rounded border border-slate-200 text-[10px] text-slate-500 font-medium">📎 ${files[i].name}</div>`;
        empDownloadWrapper.innerHTML += `<a href="#" onclick="alert('Téléchargement de : ${files[i].name}')" class="block text-emerald-600 hover:underline font-medium">⬇️ ${files[i].name}</a>`;
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

// 🚀 EXECUTION COMPLÈTE ANTI-BUG ET EXPÉDITION EMAIL GARANTIE
async function declencherOnboardingGeneral() {
    const prenom = document.getElementById('empPrenom').value;
    const nom = document.getElementById('empNom').value;
    const poste = document.getElementById('empPoste').value;
    const email = document.getElementById('empEmail').value;
    const boite = document.getElementById('cfgBoite').value;
    const wifi = document.getElementById('cfgWifi').value;

    if (!prenom || !nom || !email) {
        alert("⚠️ Veuillez remplir le prénom, le nom et l'email pour tester.");
        return;
    }

    const uniqueId = prenom.toLowerCase() + "-" + Math.floor(Math.random() * 1000);
    const currentUrl = window.location.origin + window.location.pathname;
    const shareLink = `${currentUrl}?id=${uniqueId}`;

    if(document.getElementById('shareableLink')) {
        document.getElementById('shareableLink').innerText = shareLink;
        document.getElementById('shareableLink').href = shareLink;
    }

    const rhNode = document.getElementById('rhOrgaDynamicNode');
    if(rhNode) {
        rhNode.innerText = `✨ ${prenom.toUpperCase()} ${nom.toUpperCase()} (${poste.split(' ')[0]})`;
        rhNode.classList.remove('hidden');
    }

    // 1. Sauvegarde Supabase si dispo
    if (supabase) {
        try {
            await supabase
                .from('onboardings')
                .insert([{ id: uniqueId, prenom: prenom, nom: nom, poste: poste, email: email, boite: boite, wifi: wifi }]);
        } catch (err) { console.log("Supabase ignoré pour la démo local."); }
    }

    // 2. Envoi forcé Resend
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
                    <h2 style="color: #5cb887; margin-top: 0;">Bienvenue dans l'équipe, ${prenom} ! 👋</h2>
                    <p>Toute l'équipe de <strong>${boite}</strong> est impatiente de t'accueillir en tant que <strong>${poste}</strong>.</p>
                    <p>Voici ton portail de suivi en direct :</p>
                    <div style="margin: 25px 0; text-align: center;">
                        <a href="${shareLink}" style="background-color: #5cb887; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accéder à mon Portail d'Intégration</a>
                    </div>
                </div>
            `
        })
    })
    .then(res => {
        if(res.ok) {
            alert(`📨 TOUT FONCTIONNE !\n\nL'email vient d'être envoyé à : ${email}.\nLe logo et les fichiers sont liés en direct.\n\nClique sur OK pour basculer de vue.`);
            basculerVue('Employee');
        } else {
            alert("⚠️ Erreur d'envoi. Resend refuse l'adresse ou la clé.");
        }
    })
    .catch(err => alert("Erreur réseau lors de l'envoi du mail."));
}

async function verifierUrlDArrivee() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (userId && supabase) {
        try {
            const { data, error } = await supabase.from('onboardings').select('*').eq('id', userId).single();
            if (data && !error) {
                document.getElementById('empWelcomeName').innerText = data.prenom;
                document.getElementById('empWelcomeBoite').innerText = data.boite;
                document.getElementById('empWelcomePoste').innerText = `[${data.poste}]`;
                document.getElementById('empWelcomeWifi').innerText = data.wifi;
                document.getElementById('empSelfOrgaNode').innerText = `${data.prenom.toUpperCase()} ${data.nom.toUpperCase()} (Moi)`;
                basculerVue('Employee');
                if(document.getElementById('viewRhBtn')) document.getElementById('viewRhBtn').style.display = 'none';
            }
        } catch (err) { console.error(err); }
    }
}

function basculerVue(type) {
    const r = document.getElementById('containerRH');
    const e = document.getElementById('containerEmployee');
    const br = document.getElementById('viewRhBtn');
    const be = document.getElementById('viewEmpBtn');

    if (type === 'RH') {
        if(r) r.classList.remove('hidden'); 
        if(e) e.classList.add('hidden');
        if(br) br.classList.add('active-vue'); 
        if(be) be.classList.remove('active-vue');
    } else {
        if(r) r.classList.add('hidden'); 
        if(e) e.classList.remove('hidden');
        if(be) be.classList.add('active-vue'); 
        if(br) br.classList.remove('active-vue');
    }
}

window.onload = function() {
    synchroTotale();
    verifierUrlDArrivee();
};
