// api/send-email.js
// Fonction serverless (Vercel) : garde la clé Resend côté serveur.
// Le navigateur ne voit JAMAIS cette clé.
//
// Déploiement :
// 1. Pousse ce repo sur GitHub.
// 2. Sur vercel.com → "Add New Project" → importe le repo.
// 3. Dans Project Settings > Environment Variables, ajoute :
//      RESEND_API_KEY = ta_cle_resend_secrete
//      FROM_EMAIL     = onboarding@tondomaine.com (adresse vérifiée sur Resend)
// 4. Redeploy. Ton app appelle automatiquement /api/send-email.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Champs manquants : to, subject, html' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "RESEND_API_KEY n'est pas configurée sur le serveur." });
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
                to,
                subject,
                html
            })
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ error: data });
        }
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
