import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateResultPDF = async (student: any, studentDetails: any, schoolInfo: any, mode: 'ALL' | number = 'ALL') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const subjects_list = ['MATHEMATICS', 'ENGLISH', 'KISWAHILI', 'CHEMISTRY', 'BIOLOGY', 'PHYSICS', 'HISTORY', 'GEOGRAPHY', 'CRE', 'AGRICULTURE', 'BUSINESS', 'COMPUTER'];

  // 1. SCHOOL LOGO & HEADER (Asynchronous & CORS Safe)
  if (schoolInfo?.logo_url) {
    try {
      // Helper to load image safely
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

  // Left Column
  doc.text(`NAME: ${student.profile?.full_name?.toUpperCase()}`, 15, 45);
  doc.text(`ADM NO: ${student.adm_no}`, 15, 51);
  doc.text(`CLASS: ${student.stream?.class?.name} ${student.stream?.name}`, 15, 57);
  doc.setFont('helvetica', 'normal');
  doc.text(`Class Position: Pending Calc`, 15, 63);
  doc.text(`Form Position: Pending Calc`, 15, 69);

  // Right Column
  const balance = studentDetails.fees.reduce((acc: number, f: any) => acc + (Number(f.amount_due || 0) - Number(f.amount_paid || 0)), 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`TEACHER: ${teacher?.full_name || 'N/A'}`, 110, 45);
  doc.text(`EMAIL: ${teacher?.email || 'N/A'}`, 110, 51);
  doc.text(`FEES BALANCE: Ksh ${balance.toLocaleString()}`, 110, 57);

  doc.setLineWidth(0.2);
  doc.line(15, 73, pageWidth - 15, 73);

  // 3. RESULTS TABLE
  const tableHead = [['Subject', 'T1 MID', 'T1 END', 'T2 MID', 'T2 END', 'T3 MID', 'T3 END']];
  const tableBody: any[] = [];

  const results = studentDetails.results || [];
  const yearsFound = Array.from(new Set(results.map((r: any) => r.exam?.term?.year || 2026))).sort((a, b) => b - a);

  yearsFound.forEach(year => {
    const resultsForYear = results.filter((r: any) => r.exam?.term?.year === year);
    if (resultsForYear.length === 0) return;

    // Determine Form name more robustly
    let formName = '4'; // Fallback
    const firstResult = resultsForYear[0];
    const termName = (firstResult.exam?.term?.name || '').toUpperCase();
    const formMatch = termName.match(/FORM\s*(\d+)/i);
    if (formMatch) {
       formName = formMatch[1];
    } else {
       formName = student.stream?.class?.level || '4';
    }

    tableBody.push([{ 
       content: `ACADEMIC TRANSCRIPT - YEAR ${year} (FORM ${formName})`, 
       colSpan: 7, 
       styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'center', textColor: [50, 50, 50] } 
    }]);

    const subjects = studentDetails.subjects?.length > 0 
       ? studentDetails.subjects.map((s: any) => s.subject?.name || s.name).filter(Boolean)
       : subjects_list;

    subjects.forEach((subjectName: string) => {
      const row = [subjectName];
      [1, 2, 3].forEach(termNum => {
        const searchTerm = `TERM ${termNum}`;
        const mid = resultsForYear.find((r: any) => {
           const rSubName = (r.subject?.name || '').toUpperCase();
           const rTermName = (r.exam?.term?.name || r.term?.name || '').toUpperCase();
           const rExamName = (r.exam?.name || '').toUpperCase();
           const rExamType = (r.exam?.type || '').toUpperCase();
           
           return rSubName === subjectName.toUpperCase() && 
                  rTermName.includes(searchTerm) && 
                  (rExamType.includes('MID') || rExamName.includes('MID'));
        });

        const end = resultsForYear.find((r: any) => {
           const rSubName = (r.subject?.name || '').toUpperCase();
           const rTermName = (r.exam?.term?.name || r.term?.name || '').toUpperCase();
           const rExamName = (r.exam?.name || '').toUpperCase();
           const rExamType = (r.exam?.type || '').toUpperCase();
           
           return rSubName === subjectName.toUpperCase() && 
                  rTermName.includes(searchTerm) && 
                  (rExamType.includes('END') || rExamName.includes('END'));
        });

        row.push(mid ? `${mid.marks}${mid.grade ? ' ' + mid.grade : ''}` : '-');
        row.push(end ? `${end.marks}${end.grade ? ' ' + end.grade : ''}` : '-');
      });
      tableBody.push(row);
    });
  });

  autoTable(doc, {
    startY: 78,
    head: tableHead,
    body: tableBody,
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fillColor: [39, 39, 42], textColor: 255 },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    margin: { top: 75 },
    pageBreak: 'auto'
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.text("Class Teacher Signed: __________________", 15, finalY);
  doc.text("Principal Signed: ______________________", 110, finalY);

  const footerY = doc.internal.pageSize.height - 15;
  doc.setFontSize(7);
  doc.setFont('courier', 'bold');
  doc.text(schoolInfo?.name?.toUpperCase() || "SCHOOL NAME", pageWidth / 2, footerY, { align: 'center' });
  doc.text("P3L SYSTEM | OFFICIAL TRANSCRIPT | MATTA DEVELOPS", pageWidth / 2, footerY + 4, { align: 'center' });

  // Clean filename for Windows/Browser compatibility
  const cleanerName = (student.profile?.full_name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanerName}_Transcript_F${mode}.pdf`;
  
  doc.save(filename);
};
