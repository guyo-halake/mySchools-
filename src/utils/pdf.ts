import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateResultPDF = async (student: any, studentDetails: any, schoolInfo: any, mode: 'ALL' | number = 'ALL') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // 1. SCHOOL LOGO & HEADER
  if (schoolInfo?.logo_url) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'Anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject();
        image.src = schoolInfo.logo_url;
      });
      doc.addImage(img, 'PNG', 15, 10, 25, 25);
    } catch (e) {
      console.warn("Logo skipped due to load error or CORS policy");
    }
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(22);
  doc.text(schoolInfo?.name?.toUpperCase() || "SCHOOL NAME", 15 + 30, 20);
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  doc.text(schoolInfo?.address || "INSTITUTION ADDRESS", 15 + 30, 26);
  doc.text(`Email: ${schoolInfo?.email || 'N/A'} | Phone: ${schoolInfo?.phone || 'N/A'}`, 15 + 30, 31);
  doc.setLineWidth(0.5);
  doc.line(15, 38, pageWidth - 15, 38);

  // 2. STUDENT BIO BLOCK
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const teacher = student.stream?.teacher;

  doc.text(`NAME: ${student.profile?.full_name?.toUpperCase()}`, 15, 45);
  doc.text(`ADM NO: ${student.adm_no}`, 15, 51);
  doc.text(`GRADE/CLASS: ${student.stream?.class?.name} ${student.stream?.name}`, 15, 57);

  const balance = studentDetails.fees?.reduce((acc: number, f: any) => acc + (Number(f.amount_due || 0) - Number(f.amount_paid || 0)), 0) || 0;
  doc.text(`FACILITATOR: ${teacher?.full_name || 'N/A'}`, 110, 45);
  doc.text(`FEES BALANCE: Ksh ${balance.toLocaleString()}`, 110, 51);

  doc.setLineWidth(0.2);
  doc.line(15, 63, pageWidth - 15, 63);

  // 3. CBC RESULTS TABLE
  const tableHead = [['Learning Area', 'Strand', 'Sub-Strand', 'Rating', 'Remarks']];
  const tableBody: any[] = [];

  const results = studentDetails.results || [];
  
  if (results.length === 0) {
    tableBody.push([{ content: 'No CBC Assessments Recorded for this period.', colSpan: 5, styles: { halign: 'center' } }]);
  } else {
    // Group by Learning Area -> Strand
    const grouped: Record<string, Record<string, any[]>> = {};
    results.forEach((r: any) => {
       const learningArea = r.learning_area?.name || r.learning_area_id || 'General Assessment';
       const strand = r.cbc_strands?.name || r.strand || 'General';
       if (!grouped[learningArea]) grouped[learningArea] = {};
       if (!grouped[learningArea][strand]) grouped[learningArea][strand] = [];
       grouped[learningArea][strand].push({
          sub_strand: r.cbc_sub_strands?.name || r.sub_strand || 'Overall',
          rating: r.rating || 'N/A',
          remarks: r.teacher_comment || ''
       });
    });

    Object.entries(grouped).forEach(([learningArea, strands]) => {
      tableBody.push([{ 
         content: learningArea.toUpperCase(), 
         colSpan: 5, 
         styles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [50, 50, 50] } 
      }]);

      Object.entries(strands).forEach(([strand, assessments]) => {
        assessments.forEach((a, idx) => {
          tableBody.push([
            idx === 0 ? strand : '', // Only show strand name on first row
            idx === 0 ? strand : '', // Need to keep columns aligned, we actually put strand in column 2
            a.sub_strand,
            a.rating,
            a.remarks
          ]);
        });
      });
    });
  }

  // Fix tableBody formatting since we decided to put strand in col 2
  const finalTableBody = tableBody.map(row => {
    if (row.length === 1) return row; // Section header
    return [
      '', // Learning Area is already a section header, so leave empty
      row[1], // Strand
      row[2], // Sub-Strand
      row[3], // Rating
      row[4]  // Remarks
    ];
  });

  autoTable(doc, {
    startY: 68,
    head: tableHead,
    body: finalTableBody,
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fillColor: [39, 39, 42], textColor: 255 },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    margin: { top: 65 },
    pageBreak: 'auto'
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Facilitator's Signature: __________________", 15, finalY);
  doc.text("Principal's Signature: ______________________", 110, finalY);

  const footerY = doc.internal.pageSize.height - 15;
  doc.setFontSize(7);
  doc.setFont('courier', 'bold');
  doc.text(schoolInfo?.name?.toUpperCase() || "SCHOOL NAME", pageWidth / 2, footerY, { align: 'center' });
  doc.text("P3L SYSTEM | COMPETENCY BASED CURRICULUM REPORT | MATTA DEVELOPS", pageWidth / 2, footerY + 4, { align: 'center' });

  const cleanerName = (student.profile?.full_name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanerName}_CBC_Report.pdf`;
  
  doc.save(filename);
};
