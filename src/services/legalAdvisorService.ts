/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Service du Conseiller Juridique Virtuel RH RDC (Gemini AI Legal Advisor)
 */

export interface LegalAdviceRequest {
  employeeName: string;
  position: string;
  department: string;
  contractType: string;
  seniorityYears?: number;
  sanctionHistory: Array<{
    date: string;
    type: string;
    reason: string;
  }>;
  proposedInfraction: string;
}

export interface LegalAdviceResponse {
  advice: string;
  recommendedSanction: 'EXPLANATION_REQUEST' | 'WARNING' | 'REPRIMAND' | 'TEMPORARY_SUSPENSION' | 'HEAVY_DISMISSAL';
  recommendedSanctionLabel: string;
  legalRisks: string[];
  proceduralSteps: string[];
  legalArticles: string[];
}

export async function getLegalAdvice(request: LegalAdviceRequest): Promise<LegalAdviceResponse> {
  const historyCount = request.sanctionHistory ? request.sanctionHistory.length : 0;

  try {
    const res = await fetch('/api/gemini/legal-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.advice) {
        let label = 'Demande d\'Explication';
        if (data.recommendedSanction === 'WARNING') label = 'Avertissement Écrit';
        if (data.recommendedSanction === 'REPRIMAND') label = 'Blâme Officiel';
        if (data.recommendedSanction === 'TEMPORARY_SUSPENSION') label = 'Mise à Pied Disciplinaire (1-8j)';
        if (data.recommendedSanction === 'HEAVY_DISMISSAL') label = 'Licenciement Faute Lourde';

        return {
          advice: data.advice,
          recommendedSanction: data.recommendedSanction || 'EXPLANATION_REQUEST',
          recommendedSanctionLabel: label,
          legalRisks: data.legalRisks || ['Respect strict du délai de 48h sous peine de nullité'],
          proceduralSteps: data.proceduralSteps || [
            'Délivrer la demande d\'explication avec preuve de décharge signée',
            'Accorder 48h ouvrables',
            'Consigner la notification au dossier individuel'
          ],
          legalArticles: ['Article 72 Code du Travail RDC', 'Article 73 - Sanctions Autorisées', 'Article 74 - Faute Lourde']
        };
      }
    }
  } catch (err) {
    console.warn('Backend Gemini API call fallback to client rule-based advisor:', err);
  }

  // Client-Side Deterministic Legal Advisor Fallback
  let recommendedSanction: LegalAdviceResponse['recommendedSanction'] = 'EXPLANATION_REQUEST';
  let recommendedSanctionLabel = 'Demande d\'Explication Préalable (48h)';

  if (historyCount === 0) {
    recommendedSanction = 'EXPLANATION_REQUEST';
    recommendedSanctionLabel = 'Demande d\'Explication Préalable (48h légal)';
  } else if (historyCount === 1) {
    recommendedSanction = 'WARNING';
    recommendedSanctionLabel = 'Avertissement Écrit ou Blâme';
  } else if (historyCount === 2) {
    recommendedSanction = 'TEMPORARY_SUSPENSION';
    recommendedSanctionLabel = 'Mise à Pied Disciplinaire (3 à 5 jours sans solde)';
  } else {
    recommendedSanction = 'HEAVY_DISMISSAL';
    recommendedSanctionLabel = 'Licenciement pour Faute Lourde (Art. 74)';
  }

  const adviceText = `[ANALYSE JURIDIQUE RH RDC - CODE DU TRAVAIL ART. 72 & 73]

Employé : ${request.employeeName} (${request.position}, Département ${request.department})
Contrat : ${request.contractType} | Ancienneté : ${request.seniorityYears || 0} an(s)
Antécédents : ${historyCount} sanction(s) enregistrée(s) dans le dossier.

Infraction reprochée : "${request.proposedInfraction}"

Avis de la Réserve Juridique NovarisPay RDC :
1. Principe du Contradictoire (Art. 72) : Aucune sanction ne peut être notifiée sans demande d'explication préalable avec un délai de réponse de 48 heures ouvrables.
2. Délais d'Action : L'employeur dispose d'un délai strict de 15 jours ouvrables à compter de la découverte constatée des faits pour engager la procédure.
3. Gradation des Sanctions : ${
    historyCount === 0
      ? 'Pour un premier manquement, débutez impérativement par une demande d\'explication écrite.'
      : historyCount === 1
      ? 'Étant donné le précédent dossier, vous pouvez prononcer un Avertissement ou un Blâme si les explications sont insatisfaisantes.'
      : historyCount === 2
      ? 'En raison de la récidive, une Mise à Pied Disciplinaire de 3 à 8 jours maximum sans solde est recommandée.'
      : 'Au vu de l\'accumulation de fautes disciplinaires, une rupture immédiate pour faute lourde sans indemnité est envisageable selon l\'Art. 74.'
  }`;

  return {
    advice: adviceText,
    recommendedSanction,
    recommendedSanctionLabel,
    legalRisks: [
      'Omission de la demande d\'explication de 48h = nullité absolue de la procédure devant l\'Inspecteur du Travail.',
      'Mise à pied supérieure à 8 jours ouvrables = qualifiée en licenciement abusif à charge de l\'entreprise.',
      'Dépassement du délai de 15 jours ouvrables après connaissance des faits = prescription de la faute.'
    ],
    proceduralSteps: [
      'Étape 1 : Rédiger et notifier en main propre (avec décharge) la demande d\'explication',
      'Étape 2 : Patienter 48 heures ouvrables après réception',
      'Étape 3 : Analyser la réponse écrite du salarié avec le Directeur RH',
      'Étape 4 : Le cas échéant, émettre la lettre de sanction signée électroniquement et notifiée dans les 15 jours'
    ],
    legalArticles: ['Article 72 Code du Travail RDC', 'Article 73 - Sanctions Autorisées', 'Article 74 - Faute Lourde']
  };
}
