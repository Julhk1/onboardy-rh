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
        .select('prenom, nom, poste, service, manager, email, date_arrivee, org_id')
        .eq('token', token)
        .single();

    if (error || !employee) {
        return res.status(404).json({ error: 'Lien invalide ou expiré' });
    }

    const { data: organization } = await supabase
        .from('organizations')
        .select('nom, wifi, logo_data_url, documents')
        .eq('id', employee.org_id)
        .single();

    const { data: colleagues } = await supabase
        .from('employees')
        .select('prenom, nom, poste')
        .eq('org_id', employee.org_id)
        .eq('service', employee.service);

    const { org_id, ...employeeSansOrgId } = employee;

    return res.status(200).json({
        employee: employeeSansOrgId,
        organization: organization || null,
        colleagues: colleagues || []
    });
}
