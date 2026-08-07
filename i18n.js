// ============================================================
// ROOTLY — SYSTÈME DE TRADUCTION (FR par défaut / EN au choix)
// ============================================================
// Principe : le français (déjà présent dans le HTML/JS) sert directement
// de clé. Pas besoin d'un dictionnaire FR séparé — seul l'anglais est
// listé ici. t("Un texte en français") renvoie sa traduction si la
// langue active est 'en', sinon renvoie le texte français tel quel.

const EN_DICT = {
    // --- Navigation / commun ---
    "Organigramme": "Org Chart",
    "Onboarding": "Onboarding",
    "Evaluations & Remuneration": "Reviews & Compensation",
    "Deconnexion": "Log out",
    "Rechercher...": "Search...",
    "Tout selectionner": "Select all",
    "Modifier": "Edit",
    "Supprimer": "Delete",
    "Annuler": "Cancel",
    "Enregistrer": "Save",
    "Confirmer": "Confirm",
    "Aucun employe pour le moment.": "No employees yet.",

    // --- Connexion / inscription ---
    "Connexion": "Log in",
    "Espace Ressources Humaines": "HR Space",
    "Reserve a l'equipe RH. Chaque entreprise dispose de son propre espace prive.": "Reserved for the HR team. Each company has its own private space.",
    "Email professionnel": "Work email",
    "rh@monentreprise.com": "hr@yourcompany.com",
    "Mot de passe": "Password",
    "8 caractères minimum, avec au moins un chiffre.": "At least 8 characters, including one digit.",
    "Confirmer le mot de passe": "Confirm password",
    "Mot de passe oublie ?": "Forgot password?",
    "Se connecter": "Log in",
    "Pas encore de compte ? Creer un espace RH": "No account yet? Create an HR space",
    "Retour a la connexion": "Back to login",
    "Nouveau mot de passe": "New password",
    "Choisis un nouveau mot de passe pour ton compte RH.": "Choose a new password for your HR account.",
    "Mettre a jour le mot de passe": "Update password",
    "Créer un espace RH": "Create an HR space",
    "Créer mon espace": "Create my space",
    "Déjà un compte ? Se connecter": "Already have an account? Log in",
    "Mot de passe oublié": "Forgot password",
    "Envoyer le lien de réinitialisation": "Send reset link",
    "Afficher le mot de passe": "Show password",
    "Le mot de passe doit contenir au moins 8 caractères, dont un chiffre.": "Password must be at least 8 characters long and include a digit.",
    "Les deux mots de passe ne correspondent pas.": "The two passwords don't match.",
    "Un compte existe déjà avec cet email — connecte-toi plutôt.": "An account already exists with this email — log in instead.",
    "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.": "Account created. Check your inbox to confirm your address, then log in.",

    // --- Organigramme ---
    "Ajouter / modifier un employe": "Add / edit an employee",
    "Annuler la modification": "Cancel the edit",
    "Modification de": "Editing",
    "Utiliser un modele de poste (optionnel)": "Use a role template (optional)",
    "— Aucun modele —": "— No template —",
    "Prenom": "First name",
    "Nom": "Last name",
    "Intitule du poste": "Job title",
    "Service": "Department",
    "Finance, Tech, Ventes...": "Finance, Tech, Sales...",
    "Manager direct": "Direct manager",
    "— Aucun (sommet de l'organigramme) —": "— None (top of the org chart) —",
    "Autre / externe (preciser)...": "Other / external (specify)...",
    "Nom du manager externe": "External manager's name",
    "Email personnel": "Personal email",
    "Date d'arrivee": "Start date",
    "Ajouter cet employe": "Add this employee",
    "Import en masse": "Bulk import",
    "Modele CSV": "CSV template",
    "Importer une liste d'employes": "Import a list of employees",
    "Cree ou met a jour la structure uniquement — n'envoie aucun email.<br>Colonnes attendues : Prenom, Nom, Poste, Service, Manager, Email, Date (AAAA-MM-JJ).<br><strong>Manager</strong> : ecris juste le prenom et le nom du manager (ex : Caroline Courtel), exactement comme dans ses propres colonnes Prenom/Nom sur son autre ligne — pas besoin d'ajouter son poste. Laisse la case vide si la personne est tout en haut de l'organigramme.":
        "Creates or updates the structure only — sends no email.<br>Expected columns: First name, Last name, Job title, Department, Manager, Email, Date (YYYY-MM-DD).<br><strong>Manager</strong>: just write the manager's first and last name (e.g. Caroline Courtel), exactly as on their own First name/Last name columns — no need to add their job title. Leave it empty for whoever is at the very top of the org chart.",
    "Modeles de poste": "Role templates",    "Cree un modele une fois, reutilise-le pour chaque futur recrutement sur ce poste.": "Create a template once, reuse it for every future hire on this role.",
    "Nom du modele (ex : Dev Front)": "Template name (e.g. Front-end Dev)",
    "Manager par defaut": "Default manager",
    "+ Enregistrer le modele": "+ Save template",
    "Clique sur les icones d'un profil pour le modifier ou le supprimer directement.": "Click a profile's icons to edit or delete it directly.",
    "Ajoute des employes pour voir apparaitre l'organigramme.": "Add employees to see the org chart appear.",
    "Impossible de construire l'organigramme (vérifie les champs Manager).": "Couldn't build the org chart (check the Manager fields).",
    "Liste des employes": "Employee list",
    "Supprimer les selectionnes": "Delete selected",
    "Aucun résultat pour cette recherche.": "No results for this search.",
    "Aucun employé pour le moment.": "No employees yet.",
    "Deplier": "Expand",
    "Replier": "Collapse",
    "Selectionner": "Select",

    // --- Onboarding (tableau de bord RH) ---
    "Configuration entreprise": "Company setup",
    "Nom de l'entreprise": "Company name",
    "Code Wi-Fi bureaux": "Office Wi-Fi code",
    "Logo officiel": "Company logo",
    "Cliquer pour importer un logo": "Click to upload a logo",
    "Documents communs (reglement, charte...)": "Shared documents (policy, handbook...)",
    "Ajouter des documents": "Add documents",
    "Objet de l'email d'invitation": "Invitation email subject",
    "Bienvenue chez [Entreprise] !": "Welcome to [Company]!",
    "Message d'accueil personnalise": "Personalized welcome message",
    "Toute l'equipe est ravie de t'accueillir en tant que [poste]. A tres vite !": "The whole team is thrilled to welcome you as [role]. See you soon!",
    "Laisse vide pour garder le message par defaut.": "Leave empty to keep the default message.",
    "Enregistrer les infos entreprise": "Save company info",
    "Contenus optionnels de la page employe": "Optional content on the employee page",
    "Laisse une section vide si tu ne veux pas qu'elle apparaisse chez l'employe.": "Leave a section empty if you don't want it to appear for the employee.",
    "Liens utiles": "Useful links",
    "Nom (ex : Intranet)": "Name (e.g. Intranet)",
    "+ Ajouter le lien": "+ Add link",
    "Contacts cles": "Key contacts",
    "Role (ex : Support IT)": "Role (e.g. IT Support)",
    "Email ou telephone": "Email or phone",
    "+ Ajouter le contact": "+ Add contact",
    "Checklist d'integration": "Onboarding checklist",
    "Etape (ex : Jour 1 - Accueil)": "Step (e.g. Day 1 - Welcome)",
    "Description courte": "Short description",
    "+ Ajouter l'etape": "+ Add step",
    "Enregistrer ces contenus": "Save this content",
    "Vider ces contenus": "Clear this content",
    "Employes a onboarder": "Employees to onboard",
    'Cree les fiches employes depuis la page <a href="organigramme.html">Organigramme</a>. Elles apparaissent ici pretes a etre invitees.':
        'Create employee records from the <a href="organigramme.html">Org Chart</a> page. They\'ll show up here ready to be invited.',
    "Marquer sans invitation": "Mark without invitation",
    "Envoyer l'invitation": "Send invitation",
    "Aucun employe en attente d'invitation.": "No employees pending invitation.",
    "Suivi des invitations envoyees": "Sent invitations tracking",
    "Aucune invitation envoyee pour le moment.": "No invitations sent yet.",
    "Ne pas inviter": "Don't invite",
    "selectionne(s)": "selected",
    "retirer": "remove",
    "Invitation envoyée à {email}": "Invitation sent to {email}",
    "{n} invitation(s) envoyée(s).": "{n} invitation(s) sent.",
    "{n} invitation(s) n'ont pas pu être envoyée(s).": "{n} invitation(s) couldn't be sent.",
    "Fiche de {nom} mise à jour.": "{nom}'s record updated.",
    "{nom} ajouté(e) à l'organigramme.": "{nom} added to the org chart.",
    "{n} employé(s) importé(s) dans l'organigramme.": "{n} employee(s) imported into the org chart.",
    "Date fixée pour cet employé.": "Date set for this employee.",
    "Retour à la fréquence par défaut.": "Back to default frequency.",
    "Entretien mis à jour.": "Review updated.",
    "Compte-rendu enregistré.": "Review summary saved.",
    "Rémunération mise à jour.": "Compensation updated.",
    "Rémunération enregistrée.": "Compensation saved.",
    "Lien envoyé à {email}": "Link sent to {email}",
    "Aucune ligne valide trouvée.": "No valid rows found.",
    "Cet employé n'a pas d'email enregistré (voir la page Organigramme).": "This employee has no email on file (see the Org Chart page).",
    "Contenus enregistrés — visibles sur les prochaines pages employé.": "Content saved — visible on future employee pages.",
    "Contenus optionnels vidés.": "Optional content cleared.",
    "Email envoyé — vérifie ta boîte mail (et les spams).": "Email sent — check your inbox (and spam folder).",
    "Entretien supprimé.": "Review deleted.",
    "Erreur de chargement des données.": "Failed to load data.",
    "Erreur de chargement des employés.": "Failed to load employees.",
    "Erreur lors de l'enregistrement du modèle.": "Failed to save the template.",
    "Erreur lors de l'enregistrement.": "Save failed.",
    "Erreur lors de l'envoi.": "Send failed.",
    "Erreur lors de l'import.": "Import failed.",
    "Erreur lors de la mise à jour.": "Update failed.",
    "Erreur lors de la suppression.": "Delete failed.",
    "Fréquence mise à jour pour tous les employés sans date fixée manuellement.": "Frequency updated for all employees without a manually set date.",
    "Impossible de contacter le serveur d'envoi.": "Couldn't reach the sending server.",
    "Informations entreprise enregistrées.": "Company info saved.",
    "L'adresse email ne semble pas valide.": "This email address doesn't look valid.",
    "La fonction /api/send-email n'est pas encore déployée — voir le README.": "The /api/send-email function isn't deployed yet — see the README.",
    "Le CSV doit contenir au minimum les colonnes Prenom, Nom.": "The CSV must at least contain the First name, Last name columns.",
    "Le fichier CSV est vide.": "The CSV file is empty.",
    "Lien copié dans le presse-papiers.": "Link copied to clipboard.",
    "Merci de renseigner au minimum le prénom et le nom.": "Please provide at least the first and last name.",
    "Mot de passe mis à jour. Te voilà connecté(e).": "Password updated. You're now logged in.",
    "Notes vidées.": "Notes cleared.",
    "Renseigne au moins la date d'effet et le salaire fixe.": "Provide at least the effective date and base salary.",
    "Renseigne au moins un nom de modèle et un poste.": "Provide at least a template name and a job title.",
    "Renseigne au moins un nom et un rôle.": "Provide at least a name and a role.",
    "Renseigne au moins un titre d'étape.": "Provide at least a step title.",
    "Renseigne la date de l'entretien.": "Provide the review date.",
    "Renseigne un nom et une URL.": "Provide a name and a URL.",
    "Rémunération supprimée.": "Compensation deleted.",
    "Erreur lors de la mise à jour.": "Update failed.",
    'Marquer {nom} comme "déjà onboardé(e)" sans lui envoyer d\'invitation ?': 'Mark {nom} as "already onboarded" without sending an invitation?',
    "Marquer sans invitation": "Mark without invitation",
    "{nom} marqué(e) comme onboardé(e), sans invitation.": "{nom} marked as onboarded, without invitation.",
    "{n} employés": "{n} employees",
    'Marquer {noms} comme "déjà onboardé(s)" sans leur envoyer d\'invitation ?': 'Mark {noms} as "already onboarded" without sending an invitation?',
    "Mise à jour…": "Updating…",
    "{n} employé(s) marqué(s) comme onboardé(s), sans invitation.": "{n} employee(s) marked as onboarded, without invitation.",
    "Vider les liens, contacts et checklist ? Cette action est immédiate.": "Clear links, contacts and checklist? This happens immediately.",
    "Supprimer définitivement {nom} ? Son lien d'onboarding cessera de fonctionner.": "Permanently delete {nom}? Their onboarding link will stop working.",
    "Erreur lors de la suppression.": "Delete failed.",
    "{nom} supprimé(e).": "{nom} deleted.",
    "Supprimer définitivement {noms} ? Leur lien d'onboarding cessera de fonctionner. Les employés qui les avaient comme manager se retrouveront au sommet de l'organigramme.":
        "Permanently delete {noms}? Their onboarding link(s) will stop working. Employees who had them as manager will move to the top of the org chart.",
    "Suppression en cours…": "Deleting…",
    "{n} employé(s) supprimé(s).": "{n} employee(s) deleted.",
    "Organigramme : équipe + N+1": "Org chart: team + N+1",
    "Organigramme : complet": "Org chart: full",
    "Consulté": "Viewed",
    "Envoyé": "Sent",
    "Renvoyer": "Resend",

    // --- Evaluations & Remuneration ---
    "Frequence des entretiens": "Review frequency",
    "S'applique par defaut a tous les employes, sauf si tu fixes une date precise pour l'un d'eux ci-dessous.": "Applies by default to all employees, unless you set a specific date for one of them below.",
    "Tous les 3 mois": "Every 3 months",
    "Tous les 4 mois": "Every 4 months",
    "Tous les 6 mois": "Every 6 months",
    "Une fois par an": "Once a year",
    "Compte-rendu": "Review summary",
    "Date de l'entretien": "Review date",
    "Points forts": "Strengths",
    "Axes d'amelioration": "Areas for improvement",
    "Objectifs pour le prochain trimestre": "Goals for next quarter",
    "Commentaire RH (prive, jamais visible par l'employe)": "HR comment (private, never visible to the employee)",
    "Enregistrer l'entretien": "Save review",
    "Nouvelle remuneration": "New compensation",
    "Date d'effet": "Effective date",
    "Salaire fixe annuel brut (€)": "Annual gross base salary (€)",
    "Part variable annuelle (€, optionnel)": "Annual variable pay (€, optional)",
    "Note (ex : Augmentation annuelle, ajustement marche...)": "Note (e.g. Annual raise, market adjustment...)",
    "Suivi par employe": "Per-employee tracking",
    "La remuneration reste strictement reservee a la RH, sauf pour le lien de preparation envoye a l'employe concerne, qui voit sa propre evolution.": "Compensation stays strictly HR-only, except for the prep link sent to the employee concerned, who sees their own progression.",
    "Rechercher un employe par nom...": "Search an employee by name...",

    "Aucun employé pour le moment. Ajoute-le depuis la page": "No employees yet. Add one from the",
    "Aucun employé ne correspond à cette recherche.": "No employee matches this search.",
    "Prochain entretien : ": "Next review: ",
    "Renseigne sa date d'arrivée": "Set their start date",
    "+ Entretien": "+ Review",
    "+ Rémunération": "+ Compensation",
    "Date précise du prochain entretien :": "Specific date for the next review:",
    "Réinitialiser (utiliser la fréquence par défaut)": "Reset (use default frequency)",
    "Notes de préparation écrites par l'employé": "Prep notes written by the employee",
    "Vider ces notes": "Clear these notes",
    "Copier le lien de préparation": "Copy the prep link",
    "Envoyer le lien par email": "Send the link by email",
    "Historique entretiens": "Review history",
    "rémunération": "compensation",
    "Entretien": "Review",
    "Points forts": "Strengths",
    "Axes d'amélioration": "Areas for improvement",
    "Objectifs": "Goals",
    "Commentaire RH (privé)": "HR comment (private)",
    "Rémunération": "Compensation",
    "Fixe": "Base",
    "Variable": "Variable",
    "Rien d'enregistré pour le moment.": "Nothing recorded yet.",
    "Vider les notes de préparation de cet employé ? Il pourra en réécrire de nouvelles avant son prochain entretien.":
        "Clear this employee's prep notes? They'll be able to write new ones before their next review.",
    "Vider": "Clear",
    "Supprimer définitivement cet entretien ?": "Permanently delete this review?",
    "Supprimer définitivement cette entrée de rémunération ?": "Permanently delete this compensation entry?",

    // --- Page employé (onboarding public) ---
    "Chargement de ton espace…": "Loading your space…",
    "Lien invalide ou expiré": "Invalid or expired link",
    "Ce lien d'intégration n'existe pas ou a été révoqué. Contacte ton service RH pour en recevoir un nouveau.": "This onboarding link doesn't exist or has been revoked. Contact your HR team for a new one.",
    "Bienvenue,": "Welcome,",
    "Tu es attendu le": "You're expected on",
    "chez": "at",
    "en tant que": "as",
    "Wi-Fi des bureaux": "Office Wi-Fi",
    "Documents à consulter": "Documents to review",
    "Aucun document annexe": "No additional documents",
    "Ton équipe": "Your team",
    "Organigramme de l'entreprise": "Company org chart",
    "Ta feuille de route": "Your roadmap",
    "Contacts clés": "Key contacts",
    "Organigramme indisponible.": "Org chart unavailable.",
    "Toi": "You",
    "Collègues du service {service}": "Colleagues in {service}",

    // --- Mon espace entretien ---
    "Contacte ton service RH pour en recevoir un nouveau.": "Contact your HR team for a new one.",
    "Télécharger en PDF": "Download as PDF",
    "Prépare ton entretien,": "Prepare for your review,",
    "Notes de préparation": "Preparation notes",
    "Note ici ce que tu veux aborder — enregistré automatiquement, visible uniquement par toi et ta RH.": "Note what you want to discuss here — saved automatically, visible only to you and HR.",
    "Points que je veux aborder, questions, objectifs...": "Points to raise, questions, goals...",
    "Historique de mes entretiens": "My review history",
    "Mon évolution salariale": "My salary progression",
    "Aucun entretien enregistré pour le moment.": "No reviews recorded yet.",
    "Aucune rémunération enregistrée pour le moment.": "No compensation recorded yet.",
    "Frappe en cours…": "Typing…",
    "Enregistré.": "Saved.",
    "Erreur d'enregistrement.": "Save failed.",

    // --- Pied de page ---
    "Plateforme RH & Onboarding": "HR & Onboarding platform",
};

function langueActuelle() {
    return localStorage.getItem('rootly_lang') || 'fr';
}

// t("texte français") -> traduction anglaise si dispo et langue = en, sinon le texte tel quel.
function t(texteFr, remplacements) {
    const lang = langueActuelle();
    let texte = (lang === 'en' && EN_DICT[texteFr]) ? EN_DICT[texteFr] : texteFr;
    if (remplacements) {
        Object.keys(remplacements).forEach((cle) => {
            texte = texte.split(`{${cle}}`).join(remplacements[cle]);
        });
    }
    return texte;
}

function appliquerLangue() {
    const lang = langueActuelle();
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
        el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    document.querySelectorAll('.lang-toggle-btn').forEach((btn) => {
        btn.textContent = lang === 'fr' ? 'EN' : 'FR';
    });

    // Permet à chaque page de ré-afficher son contenu dynamique (listes,
    // organigramme, toasts déjà affichés...) dans la nouvelle langue.
    if (typeof onLanguageChangeRerender === 'function') onLanguageChangeRerender();
}

function basculerLangue() {
    localStorage.setItem('rootly_lang', langueActuelle() === 'fr' ? 'en' : 'fr');
    appliquerLangue();
}

document.addEventListener('DOMContentLoaded', appliquerLangue);
