import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BAND_4_LABELS: Record<string, string> = {
  'EE': 'Exceeding Expectation',
  'ME': 'Meeting Expectation',
  'AE': 'Approaching Expectation',
  'BE': 'Below Expectation'
};

const getCbcProficiency = (marks: number) => {
  if (marks >= 80) return { label: 'EE', full: 'Exceeding Expectations' };
  if (marks >= 65) return { label: 'ME', full: 'Meeting Expectations' };
  if (marks >= 50) return { label: 'AE', full: 'Approaching Expectations' };
  return { label: 'BE', full: 'Below Expectations' };
};

export const generateResultPDF = async (
  student: any, 
  studentDetails: any, 
  schoolInfo: any, 
  mode: 'ALL' | number = 'ALL',
  summativeRows: any[] = [],
  selectedTermId: string = 'ALL'
) => {
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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(schoolInfo?.name?.toUpperCase() || "OFFICIAL TRANSCRIPT", 15 + 30, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(schoolInfo?.address || "Institution Address", 15 + 30, 26);
  doc.text(`Email: ${schoolInfo?.email || 'N/A'} | Phone: ${schoolInfo?.phone || 'N/A'}`, 15 + 30, 31);
  doc.setLineWidth(0.5);
  doc.line(15, 38, pageWidth - 15, 38);

  // 2. STUDENT BIO BLOCK
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const teacher = student.stream?.teacher;

  doc.text(`STUDENT NAME : ${student.profile?.full_name?.toUpperCase()}`, 15, 45);
  doc.text(`ADMISSION NO : ${student.adm_no || 'TBD'}`, 15, 51);
  doc.text(`CLASS/GRADE  : ${student.stream?.class?.name || ''} ${student.stream?.name || ''}`, 15, 57);

  doc.text(`FACILITATOR  : ${teacher?.full_name || 'Not Assigned'}`, 110, 45);
  doc.text(`REPORT TERM  : ${selectedTermId === 'ALL' ? 'Cumulative Record' : 'Termly Report'}`, 110, 51);
  doc.text(`GENERATED ON : ${new Date().toLocaleDateString()}`, 110, 57);

  doc.setLineWidth(0.2);
  doc.line(15, 63, pageWidth - 15, 63);

  let currentY = 70;

  // 3. SUMMATIVE RESULTS (EXAMS)
  const currentTermExams = summativeRows.filter(r => r.exam?.term_id === selectedTermId || selectedTermId === 'ALL');
  
  if (currentTermExams.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("EXAMINATION RESULTS (SUMMATIVE)", 15, currentY);
    currentY += 5;

    // Group by Exam
    const groupedExams = currentTermExams.reduce((acc: any, r) => {
      const examName = r.exam?.name || 'Standard Exam';
      if (!acc[examName]) acc[examName] = [];
      acc[examName].push(r);
      return acc;
    }, {});

    Object.entries(groupedExams).forEach(([examName, results]: [string, any]) => {
      const tableHead = [['Learning Area / Subject', 'Score (%)', 'Grade', 'Proficiency Description']];
      const tableBody = results.map((r: any) => {
        const marks = Number(r.marks || 0);
        const prof = getCbcProficiency(marks);
        return [
          r.subject?.name || 'Unknown',
          marks.toString(),
          prof.label,
          prof.full
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [[{ content: `Exam: ${examName.toUpperCase()}`, colSpan: 4, styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] } }]],
        body: [...tableHead, ...tableBody],
        styles: { fontSize: 8, font: 'helvetica' },
        headStyles: { fillColor: [39, 39, 42], textColor: 255 },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        theme: 'grid',
        margin: { left: 15, right: 15 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // 4. FORMATIVE RESULTS (CLASS PROJECTS / CBC)
  const formativeResults = studentDetails.results || [];
  const filteredFormative = formativeResults.filter((r: any) => {
     // If a term is selected, we ideally want to filter by term, but currently the data lacks term_id.
     // We will just show all or filter if we can. Since we don't have term_id reliably on CBC data,
     // we'll print what is passed in.
     return true; 
  });

  if (filteredFormative.length > 0) {
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("CLASS PROJECTS & ASSESSMENTS (FORMATIVE)", 15, currentY);
    currentY += 5;

    const tableHead = [['Learning Area', 'Strand', 'Sub-Strand', 'Rating', 'Teacher Remarks']];
    const tableBody: any[] = [];

    const grouped: Record<string, Record<string, any[]>> = {};
    filteredFormative.forEach((r: any) => {
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
         styles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] } 
      }]);

      Object.entries(strands).forEach(([strand, assessments]) => {
        assessments.forEach((a, idx) => {
          tableBody.push([
            '', // Empty under learning area
            idx === 0 ? strand : '',
            a.sub_strand,
            `${a.rating} (${BAND_4_LABELS[a.rating] || 'Assessed'})`,
            a.remarks
          ]);
        });
      });
    });

    autoTable(doc, {
      startY: currentY,
      head: tableHead,
      body: tableBody,
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
      headStyles: { fillColor: [39, 39, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      margin: { left: 15, right: 15 },
      pageBreak: 'auto'
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  if (currentY > doc.internal.pageSize.height - 40) {
    doc.addPage();
    currentY = 20;
  }

  // 5. SIGNATURES & FOOTER
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Class Teacher's Signature: __________________", 15, currentY);
  doc.text("Principal's Signature: ______________________", 110, currentY);

  const footerY = doc.internal.pageSize.height - 15;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo?.name?.toUpperCase() || "OFFICIAL REPORT", pageWidth / 2, footerY, { align: 'center' });
  doc.text("GENERATED BY MATTA TECHNOLOGY GROUP | COMPETENCY BASED CURRICULUM", pageWidth / 2, footerY + 4, { align: 'center' });

  const cleanerName = (student.profile?.full_name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanerName}_Transcript.pdf`;
  
  doc.save(filename);
};
