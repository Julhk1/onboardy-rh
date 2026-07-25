// api/employee-reviews.js
// Fonction serverless (Vercel). GET : renvoie l'historique des entretiens
// et de la remuneration d'UN SEUL employe identifie par son token.
// POST : enregistre uniquement ses notes de preparation (aucun autre champ
// n'est modifiable par ce point d'entree).
//
// Variables d'environnement necessaires (deja utilisees par employee-view.js) :
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: "Variables d'environnement Supabase manquantes cote serveur." });
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (req.method === 'GET') return handleGet(req, res, supabase);
    if (req.method === 'POST') return handlePost(req, res, supabase);
    return res.status(405).json({ error: 'Methode non autorisee' });
}

async function trouverEmployeParToken(supabase, token) {
    const { data, error } = await supabase
        .from('employees')
        .select('id, prenom, nom, poste, prep_notes')
        .eq('token', token)
        .single();
    if (error || !data) return null;
    return data;
}

async function handleGet(req, res, supabase) {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token manquant' });

    const employee = await trouverEmployeParToken(supabase, token);
    if (!employee) return res.status(404).json({ error: 'Lien invalide ou expire' });

    const { data: reviews } = await supabase
        .from('reviews')
        .select('date_entretien, points_forts, points_amelioration, objectifs')
        .eq('employee_id', employee.id)
        .order('date_entretien', { ascending: false });

    const { data: compensations } = await supabase
        .from('compensations')
        .select('date_effet, salaire_fixe, salaire_variable, note')
        .eq('employee_id', employee.id)
        .order('date_effet', { ascending: false });

    return res.status(200).json({
        employee: { prenom: employee.prenom, nom: employee.nom, poste: employee.poste, prep_notes: employee.prep_notes || '' },
        reviews: reviews || [],
        compensations: compensations || []
    });
}

async function handlePost(req, res, supabase) {
    const { token, prep_notes } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Token manquant' });

    const employee = await trouverEmployeParToken(supabase, token);
    if (!employee) return res.status(404).json({ error: 'Lien invalide ou expire' });

    // Seul le champ prep_notes est modifiable ici, avec une limite de taille raisonnable.
    const texte = String(prep_notes || '').slice(0, 5000);

    const { error } = await supabase.from('employees').update({ prep_notes: texte }).eq('id', employee.id);
    if (error) return res.status(500).json({ error: "Erreur d'enregistrement" });

    return res.status(200).json({ success: true });
}
