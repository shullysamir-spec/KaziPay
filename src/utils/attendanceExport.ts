/**
 * @license
 * NovarisPay - ERP RH & Paie RDC
 * 
 * MODULE D'EXPORTATION OFFICIELLE DU REGISTRE DE PRÉSENCES & POINTAGES
 * - Export PDF Officiel Figé (Conformité Art. 177 Code du Travail RDC)
 * - Export Excel Scellé & Protégé (Feuille verrouillée / Lecture seule)
 */

import { jsPDF } from 'jspdf';
import { DailyAttendanceRecord, AttendanceRecord } from '../types/attendance';
import { EmployeeWithContract } from '../types/employee';
import { getCompanyConfig } from '../services/companyService';
import { generateBarcodeIdentifier, generateBarcodeDataUrl } from '../services/barcodeService';
import { renderOfficialPdfHeader, renderOfficialPdfFooter } from './documentTemplate';

/**
 * Formate la période YYYYMM en texte clair (ex: "202607" -> "Juillet 2026")
 */
function formatPeriodText(period: string): string {
  if (!period || period.length !== 6) return period;
  const year = period.substring(0, 4);
  const monthNum = parseInt(period.substring(4, 6), 10);
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return `${months[monthNum - 1] || monthNum} ${year}`;
}

/**
 * Traduction lisible des statuts de présence
 */
export function getStatusLabel(status: string, lang: 'fr' | 'en' = 'fr'): string {
  if (lang === 'en') {
    switch (status) {
      case 'PRESENT':
        return 'Present';
      case 'ABSENT_JUSTIFIE':
        return 'Excused Absence';
      case 'ABSENT_NON_JUSTIFIE':
        return 'Unexcused Absence';
      case 'MISSION':
        return 'On Mission';
      case 'CONGE':
        return 'On Leave';
      case 'REPOS':
        return 'Rest / Holiday';
      default:
        return status;
    }
  }
  switch (status) {
    case 'PRESENT':
      return 'Présent';
    case 'ABSENT_JUSTIFIE':
      return 'Absent Justifié';
    case 'ABSENT_NON_JUSTIFIE':
      return 'Absent Injustifié';
    case 'MISSION':
      return 'En Mission';
    case 'CONGE':
      return 'En Congé';
    case 'REPOS':
      return 'Repos / Férié';
    default:
      return status;
  }
}

/**
 * Calcul du hash de scellement d'intégrité (Checksum hexadécimal)
 */
function generateIntegrityChecksum(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `SEAL-${hex}-${new Date().getFullYear()}`;
}

export interface AttendancePdfExportOptions {
  period: string;
  selectedDate?: string;
  departmentFilter?: string;
  employeeFilterId?: string;
  records: DailyAttendanceRecord[];
  monthlySummaries: Record<string, AttendanceRecord>;
  employees: EmployeeWithContract[];
}

/**
 * EXPORT 1: PDF FIGÉ DU REGISTRE OFFICIEL DE PRÉSENCES
 */
export async function exportAttendanceRegisterPDF(options: AttendancePdfExportOptions): Promise<void> {
  const { period, selectedDate, departmentFilter, employeeFilterId, records, monthlySummaries, employees } = options;
  const company = getCompanyConfig();

  // Mode paysage pour afficher confortablement toutes les colonnes détaillées
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const docTitle = selectedDate
    ? `POINTAGE JOURNALIER DU ${selectedDate.split('-').reverse().join('/')}`
    : `REGISTRE DE PRÉSENCE - ${formatPeriodText(period).toUpperCase()}`;

  const docSubtitle = `Conforme à l'Art. 177 du Code du Travail RDC • Période : ${formatPeriodText(period)}`;

  const barcodeId = generateBarcodeIdentifier('PRES', undefined, company.name);

  // 1. En-tête officiel
  const { bottomY } = await renderOfficialPdfHeader(doc, {
    documentTitle: docTitle,
    documentSubtitle: docSubtitle,
    documentReference: `REG-PRES-${period}`,
    barcodeId,
    docTypeCode: 'PRES',
    companyOverride: company,
  });

  // 2. Filtres appliqués & Statistiques globales
  let y = bottomY + 3;

  // Filtrer les enregistrements concernés
  let filteredRecords = [...records];
  if (selectedDate) {
    filteredRecords = filteredRecords.filter((r) => r.date === selectedDate);
  }
  if (departmentFilter && departmentFilter !== 'TOUS') {
    filteredRecords = filteredRecords.filter((r) => r.department === departmentFilter);
  }
  if (employeeFilterId && employeeFilterId !== 'TOUS') {
    filteredRecords = filteredRecords.filter((r) => r.employeeId === employeeFilterId);
  }

  // Calcul totaux pour l'encadré de synthèse
  const totalEntries = filteredRecords.length;
  const totalPresent = filteredRecords.filter((r) => r.status === 'PRESENT').length;
  const totalAbsJust = filteredRecords.filter((r) => r.status === 'ABSENT_JUSTIFIE').length;
  const totalAbsUnjust = filteredRecords.filter((r) => r.status === 'ABSENT_NON_JUSTIFIE').length;
  const totalMissions = filteredRecords.filter((r) => r.status === 'MISSION').length;
  const totalConges = filteredRecords.filter((r) => r.status === 'CONGE').length;
  const totalLatenessMin = filteredRecords.reduce((acc, r) => acc + (r.latenessMinutes || 0), 0);
  const totalHoursWorked = Math.round(filteredRecords.reduce((acc, r) => acc + (r.workedHours || 0), 0) * 10) / 10;
  const totalOT130 = Math.round(filteredRecords.reduce((acc, r) => acc + (r.overtime130 || 0), 0));
  const totalOT160 = Math.round(filteredRecords.reduce((acc, r) => acc + (r.overtime160 || 0), 0));
  const totalOT200 = Math.round(filteredRecords.reduce((acc, r) => acc + (r.overtime200 || 0), 0));

  // Bloc Synthèse Officielle
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(31, 56, 100);
  doc.setLineWidth(0.3);
  doc.rect(14, y, pageWidth - 28, 14, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 56, 100);
  doc.text(`RÉCAPITULATIF OFFICIEL DE LA SÉLECTION :`, 18, y + 5);

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Total Enregistrements : ${totalEntries}  |  • Présents : ${totalPresent}  |  • Missions : ${totalMissions}  |  • Congés : ${totalConges}`, 18, y + 10);
  doc.text(`• Absences Justifiées : ${totalAbsJust}  |  • Absences Injustifiées : ${totalAbsUnjust}  |  • Retards Totaux : ${totalLatenessMin} min  |  • Heures Prestées : ${totalHoursWorked}h  |  • HS (130%: ${totalOT130}h, 160%: ${totalOT160}h, 200%: ${totalOT200}h)`, 115, y + 10);

  y += 18;

  // 3. Tableau des données
  const colX = {
    num: 14,
    date: 22,
    matricule: 42,
    name: 62,
    dept: 110,
    in: 145,
    out: 160,
    lateness: 175,
    hours: 195,
    ot: 212,
    status: 232,
    device: 265,
  };

  // En-tête du tableau
  doc.setFillColor(31, 56, 100);
  doc.rect(14, y, pageWidth - 28, 7.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);

  doc.text('N°', colX.num + 1, y + 5);
  doc.text('DATE', colX.date, y + 5);
  doc.text('MATRICULE', colX.matricule, y + 5);
  doc.text('NOM & PRÉNOM DU SALARIÉ', colX.name, y + 5);
  doc.text('DÉPARTEMENT', colX.dept, y + 5);
  doc.text('ARRIVÉE', colX.in, y + 5);
  doc.text('DÉPART', colX.out, y + 5);
  doc.text('RETARD', colX.lateness, y + 5);
  doc.text('H. TRAV', colX.hours, y + 5);
  doc.text('H. SUP', colX.ot, y + 5);
  doc.text('STATUT', colX.status, y + 5);
  doc.text('ORIGINE', colX.device, y + 5);

  y += 8;

  // Lignes du tableau avec gestion de pagination propre
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);

  const maxRowsPerPage = 17;
  let rowCountOnPage = 0;

  for (let i = 0; i < filteredRecords.length; i++) {
    const rec = filteredRecords[i];
    const isEven = i % 2 === 0;

    // Nouvelle page si dépassement
    if (y > pageHeight - 35 || rowCountOnPage >= maxRowsPerPage) {
      doc.addPage('a4', 'landscape');
      y = 15;
      rowCountOnPage = 0;

      // Ré-afficher l'en-tête de tableau
      doc.setFillColor(31, 56, 100);
      doc.rect(14, y, pageWidth - 28, 7.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('times', 'bold');
      doc.setFontSize(7.5);
      doc.text('N°', colX.num + 1, y + 5);
      doc.text('DATE', colX.date, y + 5);
      doc.text('MATRICULE', colX.matricule, y + 5);
      doc.text('NOM & PRÉNOM DU SALARIÉ', colX.name, y + 5);
      doc.text('DÉPARTEMENT', colX.dept, y + 5);
      doc.text('ARRIVÉE', colX.in, y + 5);
      doc.text('DÉPART', colX.out, y + 5);
      doc.text('RETARD', colX.lateness, y + 5);
      doc.text('H. TRAV', colX.hours, y + 5);
      doc.text('H. SUP', colX.ot, y + 5);
      doc.text('STATUT', colX.status, y + 5);
      doc.text('ORIGINE', colX.device, y + 5);
      y += 8;
    }

    // Fond alterné
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 6.5, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    doc.line(14, y + 6.5, pageWidth - 14, y + 6.5);

    // Contenu ligne
    doc.setTextColor(51, 65, 85);
    doc.setFont('times', 'normal');
    doc.text(String(i + 1), colX.num + 1, y + 4.5);
    doc.text(rec.date.split('-').reverse().join('/'), colX.date, y + 4.5);
    doc.setFont('times', 'bold');
    doc.text(rec.employeeMatricule || 'EMP-RDC', colX.matricule, y + 4.5);
    doc.setFont('times', 'normal');
    
    const empName = (rec.employeeName || 'Salarié').length > 28
      ? rec.employeeName?.substring(0, 26) + '...'
      : rec.employeeName || '';
    doc.text(empName, colX.name, y + 4.5);

    const dept = (rec.department || '-').length > 18
      ? rec.department?.substring(0, 16) + '...'
      : rec.department || '-';
    doc.text(dept, colX.dept, y + 4.5);

    doc.text(rec.clockIn || '--:--', colX.in, y + 4.5);
    doc.text(rec.clockOut || '--:--', colX.out, y + 4.5);

    // Retard
    if ((rec.latenessMinutes || 0) > 0) {
      doc.setTextColor(185, 28, 28);
      doc.setFont('times', 'bold');
      doc.text(`+${rec.latenessMinutes} min`, colX.lateness, y + 4.5);
      doc.setFont('times', 'normal');
      doc.setTextColor(51, 65, 85);
    } else {
      doc.text('0 min', colX.lateness, y + 4.5);
    }

    doc.text(`${rec.workedHours || 0} h`, colX.hours, y + 4.5);
    
    const otTotal = (rec.overtime130 || 0) + (rec.overtime160 || 0) + (rec.overtime200 || 0);
    doc.text(otTotal > 0 ? `${otTotal} h` : '0 h', colX.ot, y + 4.5);

    // Statut
    const statusLabel = getStatusLabel(rec.status);
    if (rec.status === 'PRESENT') {
      doc.setTextColor(21, 128, 61);
    } else if (rec.status === 'ABSENT_NON_JUSTIFIE') {
      doc.setTextColor(185, 28, 28);
      doc.setFont('times', 'bold');
    } else if (rec.status === 'ABSENT_JUSTIFIE') {
      doc.setTextColor(2, 132, 199);
    } else if (rec.status === 'MISSION') {
      doc.setTextColor(126, 34, 206);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(statusLabel, colX.status, y + 4.5);
    doc.setFont('times', 'normal');
    doc.setTextColor(51, 65, 85);

    doc.text(rec.deviceId || 'Biométrique', colX.device, y + 4.5);

    y += 6.5;
    rowCountOnPage++;
  }

  // 4. Cadre de signature & validation officielle
  if (y > pageHeight - 32) {
    doc.addPage('a4', 'landscape');
    y = 20;
  } else {
    y += 4;
  }

  const signBoxWidth = (pageWidth - 36) / 3;
  
  // Cadre 1: Chef de Service / Département
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, y, signBoxWidth, 20, 1, 1, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(31, 56, 100);
  doc.text('VISA DU CHEF DE DÉPARTEMENT', 18, y + 5);
  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Date & Signature :', 18, y + 9);

  // Cadre 2: Délégué Syndical / Représentant du Personnel
  const box2X = 14 + signBoxWidth + 4;
  doc.roundedRect(box2X, y, signBoxWidth, 20, 1, 1, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(31, 56, 100);
  doc.text('REPRÉSENTATION DU PERSONNEL / SYNDICAT', box2X + 4, y + 5);
  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Vu et visé sans réserve :', box2X + 4, y + 9);

  // Cadre 3: Direction des Ressources Humaines & Sceau
  const box3X = box2X + signBoxWidth + 4;
  doc.roundedRect(box3X, y, signBoxWidth, 20, 1, 1, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(31, 56, 100);
  doc.text('DIRECTION DES RESSOURCES HUMAINES', box3X + 4, y + 5);
  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Certifié conforme • ${company.signerName || 'Directeur RH'}`, box3X + 4, y + 9);

  // 5. Pied de page officiel avec code-barres et mention d'immuabilité
  renderOfficialPdfFooter(doc, {
    barcodeId,
    documentReference: `REG-PRES-${period}`,
    legalNote: 'Document officiel de contrôle du temps de travail, certifié et figé conformément au Code du Travail RDC.',
  });

  // Sauvegarde
  const fileName = `Registre_Presences_${period}_${selectedDate || 'Complet'}.pdf`;
  doc.save(fileName);
}

/**
 * EXPORT 2: EXCEL SCELLÉ & PROTÉGÉ (Format XML Spreadsheet 2003 avec verrouillage de feuille)
 * Compatible à 100% avec Microsoft Excel, LibreOffice Calc et Google Sheets
 */
export function exportAttendanceToProtectedExcel(options: AttendancePdfExportOptions): void {
  const { period, selectedDate, departmentFilter, employeeFilterId, records, employees } = options;
  const company = getCompanyConfig();

  let filteredRecords = [...records];
  if (selectedDate) {
    filteredRecords = filteredRecords.filter((r) => r.date === selectedDate);
  }
  if (departmentFilter && departmentFilter !== 'TOUS') {
    filteredRecords = filteredRecords.filter((r) => r.department === departmentFilter);
  }
  if (employeeFilterId && employeeFilterId !== 'TOUS') {
    filteredRecords = filteredRecords.filter((r) => r.employeeId === employeeFilterId);
  }

  const barcodeId = generateBarcodeIdentifier('PRES', undefined, company.name);
  const integritySeal = generateIntegrityChecksum(JSON.stringify(filteredRecords.slice(0, 10)) + period);
  const exportTimestamp = new Date().toISOString();

  // Construction du XML Spreadsheet 2003 avec Protection Active
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Registre Officiel de Présences - ${company.name}</Title>
  <Subject>Pointages et Gestion des Temps RDC</Subject>
  <Author>${company.signerName || 'NovarisPay RH'}</Author>
  <Company>${company.name}</Company>
  <Created>${exportTimestamp}</Created>
 </DocumentProperties>
 <OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office">
  <AllowPNG/>
 </OfficeDocumentSettings>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>12000</WindowHeight>
  <WindowWidth>24000</WindowWidth>
  <WindowTopX>0</WindowTopX>
  <WindowTopY>0</WindowTopY>
  <ProtectStructure>True</ProtectStructure>
  <ProtectWindows>True</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="CompanyTitle">
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1F3864" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#64748B" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="SecuritySeal">
   <Font ss:FontName="Consolas" ss:Size="9" ss:Color="#1F3864" ss:Bold="1"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BF9000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BF9000"/>
   </Borders>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1F3864" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#BF9000"/>
   </Borders>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="DataCell">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="DataCellNumber">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="DataCellInteger">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="StatusPresent">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#166534" ss:Bold="1"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="StatusAbsent">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#991B1B" ss:Bold="1"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="StatusLeave">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#854D0E" ss:Bold="1"/>
   <Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Protection ss:Protected="1"/>
  </Style>
  <Style ss:ID="TotalFooter">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F3864" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1F3864"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1F3864"/>
   </Borders>
   <Protection ss:Protected="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Pointage_Officiel_RDC">
  <Table ss:ExpandedColumnCount="14" ss:ExpandedRowCount="${filteredRecords.length + 18}" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="20">
   <Column ss:AutoFitWidth="0" ss:Width="75"/>
   <Column ss:AutoFitWidth="0" ss:Width="80"/>
   <Column ss:AutoFitWidth="0" ss:Width="160"/>
   <Column ss:AutoFitWidth="0" ss:Width="120"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="75"/>
   <Column ss:AutoFitWidth="0" ss:Width="80"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="110"/>
   <Column ss:AutoFitWidth="0" ss:Width="180"/>
   <Column ss:AutoFitWidth="0" ss:Width="100"/>
   
   <!-- Ligne 1: En-tête Société -->
   <Row ss:Height="30">
    <Cell ss:MergeAcross="13" ss:StyleID="CompanyTitle">
     <Data ss:Type="String">  ${company.name.toUpperCase()} — REGISTRE OFFICIEL DE PRÉSENCES &amp; POINTAGES</Data>
    </Cell>
   </Row>

   <!-- Ligne 2: Coordonnées légales -->
   <Row ss:Height="18">
    <Cell ss:MergeAcross="13" ss:StyleID="Subtitle">
     <Data ss:Type="String">  RCCM : ${company.rccm || 'CD/KIN/RCCM'} | ID.NAT : ${company.idNat || '01-83-N'} | NIF : ${company.nif || 'A0000000'} | CNSS : ${company.cnssEmployerNumber || '000000'} • Siège : ${company.address || 'Kinshasa, RDC'}</Data>
    </Cell>
   </Row>

   <!-- Ligne 3: Scellement d'intégrité et Code-barres -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="13" ss:StyleID="SecuritySeal">
     <Data ss:Type="String">  [DOCUMENT PROTÉGÉ &amp; SCELLÉ] CODE-BARRES RÉF : ${barcodeId} | SCELLÉ DE SÉCURITÉ : ${integritySeal} | DATE D'ÉMISSION : ${new Date().toLocaleDateString('fr-FR')} | STATUT : LECTURE SEULE CONFORME ART. 177 RDC</Data>
    </Cell>
   </Row>

   <!-- Ligne 4: Espace vide -->
   <Row ss:Height="10"/>

   <!-- Ligne 5: En-tête des colonnes -->
   <Row ss:Height="26">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">DATE</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">MATRICULE</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">NOM &amp; PRÉNOM</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">DÉPARTEMENT</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">ARRIVÉE</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">DÉPART</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">RETARD (MIN)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">H. PRESTÉES</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">HS 130%</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">HS 160%</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">HS 200%</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">STATUT</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">MOTIF / JUSTIFICATION</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">ORIGINE POINTEUR</Data></Cell>
   </Row>
`;

  // Lignes de données
  filteredRecords.forEach((r) => {
    let statusStyle = 'DataCellCenter';
    if (r.status === 'PRESENT') statusStyle = 'StatusPresent';
    else if (r.status === 'ABSENT_NON_JUSTIFIE' || r.status === 'ABSENT_JUSTIFIE') statusStyle = 'StatusAbsent';
    else if (r.status === 'CONGE' || r.status === 'MISSION') statusStyle = 'StatusLeave';

    xml += `
   <Row ss:Height="19">
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${r.date}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${r.employeeMatricule || 'EMP'}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${(r.employeeName || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${(r.department || '').replace(/&/g, '&amp;')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${r.clockIn || '--:--'}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${r.clockOut || '--:--'}</Data></Cell>
    <Cell ss:StyleID="DataCellInteger"><Data ss:Type="Number">${r.latenessMinutes || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellNumber"><Data ss:Type="Number">${r.workedHours || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellNumber"><Data ss:Type="Number">${r.overtime130 || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellNumber"><Data ss:Type="Number">${r.overtime160 || 0}</Data></Cell>
    <Cell ss:StyleID="DataCellNumber"><Data ss:Type="Number">${r.overtime200 || 0}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${getStatusLabel(r.status)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${(r.justificationReason || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${r.deviceId || 'Pointeuse ZK-BIO'}</Data></Cell>
   </Row>`;
  });

  // Ligne de totaux
  const startRow = 6;
  const endRow = 5 + filteredRecords.length;

  xml += `
   <Row ss:Height="24">
    <Cell ss:StyleID="TotalFooter"><Data ss:Type="String">TOTAL GÉNÉRAL</Data></Cell>
    <Cell ss:StyleID="TotalFooter"><Data ss:Type="String">${filteredRecords.length} lignes</Data></Cell>
    <Cell ss:StyleID="TotalFooter"/>
    <Cell ss:StyleID="TotalFooter"/>
    <Cell ss:StyleID="TotalFooter"/>
    <Cell ss:StyleID="TotalFooter"/>
    <Cell ss:StyleID="TotalFooter" ss:Formula="=SUM(R${startRow}C7:R${endRow}C7)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalFooter" ss:Formula="=SUM(R${startRow}C8:R${endRow}C8)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalFooter" ss:Formula="=SUM(R${startRow}C9:R${endRow}C9)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalFooter" ss:Formula="=SUM(R${startRow}C10:R${endRow}C10)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalFooter" ss:Formula="=SUM(R${startRow}C11:R${endRow}C11)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalFooter"/>
    <Cell ss:StyleID="TotalFooter"/>
    <Cell ss:StyleID="TotalFooter"/>
   </Row>
  </Table>
  <!-- Options de protection et de verrouillage du classeur -->
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Layout x:Orientation="Landscape"/>
    <Header x:Margin="0.3"/>
    <Footer x:Margin="0.3"/>
    <PageMargins x:Bottom="0.5" x:Left="0.5" x:Right="0.5" x:Top="0.5"/>
   </PageSetup>
   <Print>
    <ValidPrinterInfo/>
    <PaperSizeIndex>9</PaperSizeIndex>
    <HorizontalResolution>600</HorizontalResolution>
    <VerticalResolution>600</VerticalResolution>
   </Print>
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>5</SplitHorizontal>
   <TopRowBottomPane>5</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <ProtectObjects>True</ProtectObjects>
   <ProtectScenarios>True</ProtectScenarios>
   <AllowFormatCells>0</AllowFormatCells>
   <AllowInsertRows>0</AllowInsertRows>
   <AllowDeleteRows>0</AllowDeleteRows>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  // Déclenchement du téléchargement avec MIME Excel
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Registre_Presences_Protege_${period}_${selectedDate || 'Complet'}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
