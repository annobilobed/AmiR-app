/**
 * Starter list of University of Cape Coast undergraduate programmes, for suggestions while a student
 * types. It is NOT the official list: names were compiled without access to UCC's admissions pages
 * and must be checked against the current UCC programme list before launch. Students can always type
 * a programme that is not here.
 */
export const UCC_PROGRAMMES: string[] = [
  // School of Business
  "BCom Accounting",
  "BCom Finance",
  "BCom Management",
  "BCom Marketing",
  "BCom Human Resource Management",
  "BCom Procurement and Supply Chain Management",
  "BCom Business Studies",
  "BSc Hospitality Management",
  "BSc Tourism Management",
  "BMS Management Studies",

  // Social Sciences
  "BA Economics",
  "BSc Economics",
  "BA Geography and Regional Planning",
  "BSc Geography",
  "BA Sociology",
  "BA Social Work",
  "BA Anthropology",
  "BA Political Science",
  "BA Population and Health",
  "BA History",
  "BA Communication Studies",
  "BSc Psychology",

  // Arts
  "BA English",
  "BA French",
  "BA Ghanaian Language (Akan)",
  "BA Linguistics",
  "BA Theatre Studies",
  "BA Music",
  "BA Religion and Human Values",
  "BA Philosophy",
  "BA Classics",
  "BA Arts",

  // Law
  "LLB Law",

  // Physical and Biological Sciences
  "BSc Mathematics",
  "BSc Statistics",
  "BSc Actuarial Science",
  "BSc Mathematics and Statistics",
  "BSc Computer Science",
  "BSc Information Technology",
  "BSc Physics",
  "BSc Engineering Physics",
  "BSc Chemistry",
  "BSc Industrial Chemistry",
  "BSc Biochemistry",
  "BSc Molecular Biology and Biotechnology",
  "BSc Biological Science",
  "BSc Environmental Science",
  "BSc Fisheries and Aquatic Sciences",
  "BSc Laboratory Technology",
  "BSc Forensic Science",

  // Agriculture
  "BSc Agriculture",
  "BSc Agribusiness",
  "BSc Agricultural Engineering",
  "BSc Agricultural Economics and Extension",

  // Health and Allied Sciences
  "MBChB Medicine and Surgery",
  "BSc Nursing",
  "BSc Midwifery",
  "OD Optometry",
  "BSc Medical Laboratory Science",
  "BSc Physician Assistant Studies",
  "BSc Diagnostic Imaging (Radiography)",
  "BSc Sports and Exercise Science",
  "BSc Health Information Management",
  "BSc Dietetics",

  // Education
  "BEd Basic Education",
  "BEd Early Childhood Education",
  "BEd Mathematics",
  "BEd Science",
  "BEd Social Studies",
  "BEd Accounting",
  "BEd Management",
  "BEd Information Technology",
  "BEd Physical Education",
  "BEd Health Science",
  "BEd Home Economics",
  "BEd English",
  "BEd French",
  "BEd Ghanaian Language",
  "BEd Geography",
  "BEd Economics",
  "BEd History",
  "BEd Religious and Moral Education",
  "BEd Music",
  "BEd Agriculture",
  "BEd Biology",
  "BEd Chemistry",
  "BEd Physics",
  "BEd Guidance and Counselling",
  "BEd Arts",
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Programmes matching what the student has typed so far, best first. Every typed word must be the
 * start of a word in the programme ("bsc eco", "comp sci", "nursing" all work); a match on the
 * subject itself (after BSc / BA / ...) ranks above a match on the degree letters.
 */
export function suggestProgrammes(query: string, limit = 8, list = UCC_PROGRAMMES): string[] {
  const q = norm(query).split(" ").filter(Boolean);
  if (q.length === 0) return [];
  const scored: { p: string; score: number }[] = [];
  for (const p of list) {
    const words = norm(p).split(" ");
    if (!q.every((t) => words.some((w) => w.startsWith(t)))) continue;
    const subject = words.slice(1);
    let score = 0;
    if (subject[0]?.startsWith(q[0]!)) score += 3; // "eco" -> Economics first
    if (words[0]!.startsWith(q[0]!)) score += 1; // "bsc ..." typed with the degree
    if (norm(p) === norm(query)) score += 10;
    scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.p.length - b.p.length || a.p.localeCompare(b.p)).slice(0, limit).map((s) => s.p);
}
