/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 * Base de Données des Textes de Loi, Code du Travail & Décrets RDC
 */

export interface LawArticle {
  article: string;
  source: string;
  title: string;
  summary: string;
  fullText: string;
}

export const RDC_LABOUR_LAW_ARTICLES: Record<string, LawArticle[]> = {
  EMPLOYEES: [
    {
      article: 'Article 39',
      source: 'Code du Travail RDC (Loi n° 15/013)',
      title: 'Types de Contrats de Travail (CDI & CDD)',
      summary: 'Tout contrat conclu pour une durée déterminée ne peut excéder 2 ans (ou 1 an si travailleur marié/déplacé). À défaut, il devient un CDI.',
      fullText: `Tout contrat de travail est conclu soit pour une durée déterminée, soit pour une durée indéterminée. Le contrat à durée déterminée ne peut dépasser deux ans. Si les parties poursuivent l'exécution du contrat après l'échéance du terme sans stipulation expresse, le contrat devient de plein droit à durée indéterminée.`
    },
    {
      article: 'Article 43',
      source: 'Code du Travail RDC',
      title: 'Clause d\'Essai & Durée Maximale',
      summary: 'L\'essai ne peut dépasser 1 mois pour un travailleur manœuvre et 6 mois pour un cadre. Il doit être constaté par écrit.',
      fullText: `Le contrat d'essai doit être constaté par écrit. Sa durée ne peut être supérieure au temps nécessaire pour mettre à l'épreuve le personnel engagé, compte tenu de la technique et des usages de la profession. En aucun cas, la période d'essai ne peut excéder : 1 mois pour les travailleurs manœuvres ; 6 mois pour les cadres.`
    },
    {
      article: 'Stage & Consultance',
      source: 'Arrêté Ministériel n° 068/2008 & Code Général des Impôts RDC',
      title: 'Régime des Stagiaires et Consultants Indépendants',
      summary: 'Les stagiaires sous convention académique perçoivent une gratification. Les consultants indépendants sont soumis à la retenue à la source de 15% pour prestations de services.',
      fullText: `Les stagiaires effectuant un stage académique ou professionnel sous convention officielle bénéficient d'une gratification de stage exonérée des cotisations sociales patronales si elle respecte les barèmes légaux. Les prestations des consultants externes sans lien de subordination sont régies par le Code des Obligations et soumises au précompte d'impôt sur les prestations de services.`
    }
  ],
  DISCIPLINE: [
    {
      article: 'Article 72',
      source: 'Code du Travail RDC (Loi n° 15/013)',
      title: 'Procédure Disciplinaire & Droit de Défense',
      summary: 'Délai de 15 jours ouvrables pour notifier la sanction après connaissance des faits. Obligation de demande d\'explication préalable (48h).',
      fullText: `Aucune sanction disciplinaire ne peut être infligée au travailleur sans que celui-ci n'ait été préalablement entendu ou invité à fournir ses explications écrites dans un délai de 48 heures. La sanction doit être notifiée par écrit au travailleur dans un délai maximum de 15 jours ouvrables à compter de la date où l'employeur a eu connaissance de la faute.`
    },
    {
      article: 'Article 73',
      source: 'Code du Travail RDC',
      title: 'Typologie des Sanctions & Mise à Pied',
      summary: 'Les sanctions légales sont le blâme, l\'avertissement, la mise à pied disciplinaire (1 à 8 jours max) et le licenciement pour faute lourde.',
      fullText: `Sont seules autorisées les sanctions suivantes : le blâme, l'avertissement écrit, la mise à pied sans solde d'une durée maximale de 8 jours ouvrables, et le licenciement. Toute amende ou retenue sur salaire à titre de pénalité disciplinaire est strictement interdite.`
    },
    {
      article: 'Article 74 - Faute Lourde',
      source: 'Code du Travail RDC',
      title: 'Licenciement sans Préavis pour Faute Lourde',
      summary: 'Rupture immédiate sans préavis ni indemnité en cas de faute rendant impossible le maintien de la relation de travail.',
      fullText: `Toute faute lourde commise par l'une des parties autorise l'autre à rompre immédiatement le contrat de travail sans préavis ni indemnités. Est considérée comme faute lourde toute infraction rendant la poursuite des relations de travail immédiatement et définitivement impossible.`
    }
  ],
  PAYROLL: [
    {
      article: 'Loi n° 16/009',
      source: 'Loi fixant les règles relatives au régime général de sécurité sociale (CNSS RDC)',
      title: 'Cotisations CNSS (Branche Pensions, Risques Pro & Famille)',
      summary: 'Cotisation part salariale: 5%. Part patronale: 13% (Risques Pro 1.5%, Famille 6.5%, Pension 5%). Total = 18%.',
      fullText: `L'employeur est tenu de prélever à la source la part du salarié (5%) et de verser la cotisation patronale globale (13%) auprès de la Caisse Nationale de Sécurité Sociale (CNSS) au plus tard le 15 du mois suivant.`
    },
    {
      article: 'Ordonnance-Loi n° 69/009',
      source: 'Code des Impôts RDC',
      title: 'Impôt sur le Revenu Professionnel (IPR Progressif)',
      summary: 'Barème progressif par tranches de 0% à 40%, avec abattement de 2% par personne à charge (max 9 personnes = 18%). Min 1% du brut.',
      fullText: `L'IPR est calculé sur le salaire imposable net de cotisations CNSS. Le taux effectif d'imposition global est plafonné et réduit de 2% par personne à charge régulièrement déclarée.`
    },
    {
      article: 'Décret n° 18/017',
      source: 'Gouvernement RDC',
      title: 'Fixation du Salaire Minimum Interprofessionnel Garanti (SMIG)',
      summary: 'Fixe le SMIG légal journalier pour les travailleurs en RDC selon les zones géographiques et secteurs d\'activité.',
      fullText: `Le SMIG s'impose à tout employeur exerçant sur le territoire national de la RDC. Aucun salaire brut contractuel ne peut être inférieur au taux légal du SMIG revalorisé.`
    }
  ],
  LEAVE: [
    {
      article: 'Article 140-143',
      source: 'Code du Travail RDC',
      title: 'Droit au Congé Payé Annuel',
      summary: '1 jour ouvrable par mois de service effectif (soit 18 jours ouvrables par an) + 1 jour supplémentaire par tranche de 5 ans d\'ancienneté.',
      fullText: `Le travailleur acquiert le droit au congé payé après un an de services effectifs chez le même employeur. La durée du congé est d'au moins 1 jour ouvrable par mois de service pour les travailleurs de plus de 18 ans.`
    },
    {
      article: 'Article 146',
      source: 'Code du Travail RDC',
      title: 'Congés de Circonstance (Événements Familiaux)',
      summary: 'Mariage du salarié (2 jours), Naissance (2 jours), Décès conjoint/enfant (4 jours), Décès parent (2 jours).',
      fullText: `Le travailleur a droit à des congés payés de circonstance à l'occasion d'événements familiaux touchant son foyer sur présentation de pièces justificatives officielles.`
    }
  ]
};
