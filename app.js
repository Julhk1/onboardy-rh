// 🔑 VOS IDENTIFIANTS DE REQUÊTES CLOUD SUPABASE
const SUPABASE_URL = "https://qaydzplnxjdyyutjyqzy.supabase.co";
const SUPABASE_ANON_KEY = "METS_ICI_TA_CLE_ANON_PUBLIC_DE_SUPABASE"; // Pense à coller ta clé anon public ici !

const supabase = (SUPABASE_ANON_KEY !== "METS_ICI_TA_CLE_ANON_PUBLIC_DE_SUPABASE") ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const RESEND_API_KEY = "re_VBiCKaEy_54ahgNm6Ft6ZhZboBGU2mdbA"; 

// 🕵️‍♂️ ÉTAPE CLÉ : Extraire le nom de la boîte depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const NOM_BOITE_COURANTE = urlParams.get('boite') || 'demo'; // Si rien dans l'URL, on charge un environnement 'demo'

function synchroTotale() {
    const prenom = document.getElementById('empPrenom').value;
    const email = document.getElementById('empEmail').value;
    document.getElementById('mailCible').innerText = email || 'salarie@gmail.com';
    document.getElementById('mailPrenom').innerText = prenom || 'Thomas';
}

// 📂 CHARGEMENT EXCLUSIF DES EMPLOYÉS DE CETTE BOÎTE
async function chargerEmployesDeLaBoite() {
    if (!supabase) return;
    
    document.getElementById('rhBoiteTitle').innerText = NOM_BOITE_COURANTE.toUpperCase();

    const { data, error } = await supabase
        .from('onboardings')
        .select('*')
        .eq('boite', NOM_BOITE_COURANTE); // 👈 LE FILTRE MAGIQUE : Sécurise l'accès !

    const conteneur = document.getElementById('listeEmployesBoite');
    if (data && data.length > 0 && !error) {
        conteneur.innerHTML = "";
        data.forEach(emp => {
            conteneur.innerHTML += `
                <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
                    <div><strong>👤 ${emp.prenom} ${emp.nom}</strong> — <span class="text-slate-500">${emp.poste}</span></div>
                    <a href="?id=${emp.id}" class="text-blue-500 font-bold hover:underline text-[10px]">Voir son espace →</a>
                </div>`;
        });
    } else {
        conteneur.innerHTML = `<p class="text-slate-400 italic">Aucun employé pour l'entreprise "${NOM_BOITE_COURANTE}". Prêt pour le premier onboarding !</p>`;
    }
}

// 🚀 ENREGISTREMENT ET CLOISONNEMENT DANS LE CLOUD
async function declencherOnboardingGeneral() {
    const prenom = document.getElementById('empPrenom').value;
    const nom = document.getElementById('empNom').value;
    const poste = document.getElementById('empPoste').value;
    const email = document.getElementById('empEmail').value;
    const wifi = document.getElementById('cfgWifi').value;

    if (!prenom || !nom || !email) {
        alert("Champs requis manquants !"); return;
    }

    const uniqueId = prenom.toLowerCase() + "-" + Math.floor(Math.random() * 1000);
    const currentUrl = window.location.origin + window.location.pathname;
    // Le lien intègre la boîte + l'identifiant du salarié
    const shareLink = `${currentUrl}?boite=${NOM_BOITE_COURANTE}&id=${uniqueId}`;

    if (!supabase) {
        alert("Base de données non configurée à la ligne 3 du fichier app.js !");
        return;
    }

    // Sauvegarde en lui collant l'étiquette de la boîte courante
    const { error } = await supabase
        .from('onboardings')
        .insert([{ id: uniqueId, prenom: prenom, nom: nom, poste: poste, email: email, boite: NOM_BOITE_COURANTE, wifi: wifi }]);
    
    if (error) {
        alert("Erreur Supabase lors du stockage."); return;
    }

    // Routage du mail via Resend
    fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: 'onboarding@resend.dev', 
            to: email,
            subject: `Bienvenue chez ${NOM_BOITE_COURANTE.toUpperCase()} !`,
            html: `<p>Hello ${prenom}, accède à ton espace d'accueil ici : <a href="${shareLink}">${shareLink}</a></p>`
        })
    }).then(() => {
        alert("🚀 Enregistré dans le Cloud & Mail expédié !");
        chargerEmployesDeLaBoite(); // Recharger la liste
    });
}

// 🔍 VÉRIFICATEUR DE LIENS À L'ARRIVÉE
async function verifierUrlDArrivee() {
    const userId = urlParams.get('id');

    if (userId && supabase) {
        const { data, error } = await supabase
            .from('onboardings')
            .select('*')
            .eq('id', userId)
            .eq('boite', NOM_BOITE_COURANTE) // Double vérification de sécurité
            .single();

        if (data && !error) {
            document.getElementById('empWelcomeName').innerText = data.prenom;
            document.getElementById('empWelcomeBoite').innerText = data.boite.toUpperCase();
            document.getElementById('empWelcomePoste').innerText = `[${data.poste}]`;
            document.getElementById('empWelcomeWifi').innerText = data.wifi;
            document.getElementById('empSelfOrgaNode').innerText = `${data.prenom.toUpperCase()} (Moi)`;
            
            basculerVue('Employee');
            document.getElementById('viewRhBtn').style.display = 'none';
        }
    }
}

function basculerVue(type) {
    const r = document.getElementById('containerRH'); const e = document.getElementById('containerEmployee');
    const br = document.getElementById('viewRhBtn'); const be = document.getElementById('viewEmpBtn');
    if (type === 'RH') {
        r.classList.remove('hidden'); e.classList.add('hidden');
        br.classList.add('active-vue'); be.classList.remove('active-vue');
    } else {
        r.classList.add('hidden'); e.classList.remove('hidden');
        be.classList.add('active-vue'); br.classList.remove('active-vue');
    }
}

window.onload = function() {
    chargerEmployesDeLaBoite();
    verifierUrlDArrivee();
};
