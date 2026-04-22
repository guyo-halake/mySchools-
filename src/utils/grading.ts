export const markToGrade = (mark: number | string | null | undefined): string => {
  const value = Number(mark || 0);
  if (value >= 80) return 'A';
  if (value >= 75) return 'A-';
  if (value >= 70) return 'B+';
  if (value >= 65) return 'B';
  if (value >= 60) return 'B-';
  if (value >= 55) return 'C+';
  if (value >= 50) return 'C';
  if (value >= 45) return 'C-';
  if (value >= 40) return 'D+';
  if (value >= 35) return 'D';
  if (value >= 30) return 'D-';
  return 'E';
};

export const gradeWeight = (grade: string | null | undefined): number => {
  const key = String(grade || '').toUpperCase();
  const weights: Record<string, number> = {
    'A': 12, 'A-': 11, 'B+': 10, 'B': 9, 'B-': 8,
    'C+': 7, 'C': 6, 'C-': 5, 'D+': 4, 'D': 3, 'D-': 2, 'E': 1
  };
  return weights[key] || 0;
};
