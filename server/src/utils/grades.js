// Bangladesh HSC grading scale
export function gradeFromPercent(p) {
  if (p >= 80) return { letter: 'A+', point: 5 };
  if (p >= 70) return { letter: 'A', point: 4 };
  if (p >= 60) return { letter: 'A-', point: 3.5 };
  if (p >= 50) return { letter: 'B', point: 3 };
  if (p >= 40) return { letter: 'C', point: 2 };
  if (p >= 33) return { letter: 'D', point: 1 };
  return { letter: 'F', point: 0 };
}
