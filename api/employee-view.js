// api/employee-view.js
// Fonction serverless (Vercel). Utilise la clé SECRÈTE Supabase
// (service_role) pour contourner les règles RLS côté serveur,
// mais ne renvoie JAMAIS que les données du token demandé —
// jamais la table entière, jamais les infos d'autres entreprises.
//
// Variables d'environnement à ajouter sur Vercel :
//   SUPABASE_URL              (identique à CONFIG.SUPABASE_URL dans app.js)
//   SUPABASE_SERVICE_ROLE_KEY (Supabase > Project Settings > API > service_role)
//
// ⚠️ SUPABASE_SERVICE_ROLE_KEY ne doit JAMAIS être mise dans un fichier
// servi au navigateur (app.js, index.html...). Uniquement ici, côté serveur.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ error: 'Token manquant' });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: "Variables d'environnement Supabase manquantes côté serveur." });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, prenom, nom, poste, service, manager, email, date_arrivee, org_id, viewed_at')
        .eq('token', token)
        .single();

    if (error || !employee) {
        return res.status(404).json({ error: 'Lien invalide ou expiré' });
    }

    // Marque la première consultation (visible côté RH dans la liste des employés)
    if (!employee.viewed_at) {
        await supabase.from('employees').update({ viewed_at: new Date().toISOString() }).eq('id', employee.id);
    }

    const { data: organization } = await supabase
        .from('organizations')
        .select('nom, wifi, logo_data_url, documents, useful_links, key_contacts, checklist')
        .eq('id', employee.org_id)
        .single();

    const { data: colleagues } = await supabase
        .from('employees')
        .select('prenom, nom, poste')
        .eq('org_id', employee.org_id)
        .eq('service', employee.service);

    // Reconstruit la chaîne hiérarchique (N+1, N+2, N+3...) en remontant
    // le champ "manager" de proche en proche parmi les employés de la même entreprise.
    const { data: touteLEquipe } = await supabase
        .from('employees')
        .select('prenom, nom, poste, manager')
        .eq('org_id', employee.org_id);

    const normaliser = (s) => (s || '').trim().toLowerCase();
    const parNom = {};
    (touteLEquipe || []).forEach(e => { parNom[normaliser(`${e.prenom} ${e.nom}`)] = e; });

    const chaineHierarchique = [];
    const visites = new Set([normaliser(`${employee.prenom} ${employee.nom}`)]);
    let managerActuel = employee.manager;
    let garde = 0;

    while (managerActuel && garde < 8) {
        const cle = normaliser(managerActuel);
        if (visites.has(cle)) break; // anti-boucle
        visites.add(cle);
        const trouve = parNom[cle];
        if (trouve) {
            chaineHierarchique.push({ prenom: trouve.prenom, nom: trouve.nom, poste: trouve.poste, externe: false });
            managerActuel = trouve.manager;
        } else {
            chaineHierarchique.push({ prenom: managerActuel, nom: '', poste: '', externe: true });
            managerActuel = null;
        }
        garde++;
    }

    const { org_id, id, viewed_at, ...employeeSansChampsInternes } = employee;

    return res.status(200).json({
        employee: employeeSansChampsInternes,
        organization: organization || null,
        colleagues: colleagues || [],
        chaineHierarchique
    });
}
