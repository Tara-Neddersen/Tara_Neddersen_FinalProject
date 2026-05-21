/*
 * Content for the CHEM 121 Orgo Study Hub.
 * Everything here is plain data so it is easy to edit and extend:
 *   - COURSE      course info pulled from the CHEM 121 syllabus
 *   - TOPICS      study units (used as filters everywhere)
 *   - FLASHCARDS  question/answer cards
 *   - QUIZ        multiple-choice questions (options are shuffled at runtime)
 *   - REACTIONS   searchable reaction reference
 *   - NOTES       short topic summaries
 *
 * To add your own material, just append objects to the relevant array.
 */

const COURSE = {
  code: "CHEM 121",
  title: "Organic Chemistry",
  term: "Summer 2026",
  school: "Stanford University",
  instructors: ["Megan Brennan", "Yan Xia"],
  headTA: "Edward Gao",
  textbook:
    "Jones & Fleming, Organic Chemistry (5th Ed.). Optional: Klein, Organic Chemistry as a 2nd Language (2nd-semester topics).",
  lectures: "Mon / Wed / Fri, 11:30 am-12:20 pm & 1:30-2:20 pm - STLC 114",
  lab: "Lab section Wed or Thu - 3rd Floor SAPP",
  grading: [
    { item: "Midterm 1", weight: 20 },
    { item: "Midterm 2", weight: 20 },
    { item: "Final Exam", weight: 35 },
    { item: "Problem Sets", weight: 10 },
    { item: "Lab Section", weight: 15 },
  ],
  exams: [
    { name: "Final Exam", date: "2026-08-14", time: "TBD", location: "TBD" },
  ],
  policies: [
    "Problem sets are due Sundays at 11:59 pm via Gradescope - best 9 of 10 count.",
    "8 labs, no make-ups; lowest lab dropped (top 7 count). You must attend lab in week 1 for safety training.",
    "No make-up exams are given. Canvas is the primary source for up-to-date course info.",
  ],
};

// First Monday the study plan starts. Plan runs from here to the summer final
// exam on Aug 14, 2026.
const COURSE_START = "2026-05-25";

/*
 * WEEKLY_PLAN drives the daily Study Plan. Each entry is one week (Mon..Sun);
 * the seven items are the tasks for Mon, Tue, Wed, Thu, Fri, Sat, Sun.
 * Each day is { task, pages }. The app turns these into real dated days and
 * overlays the exam dates.
 *
 * Readings and PAGE NUMBERS are taken from the table of contents of
 * Jones & Fleming, Organic Chemistry (5th Ed.). Section numbers in each task
 * match the textbook. You can still override the pages for any day in the app.
 */
const WEEKLY_PLAN = [
  { week: 1, topic: "acidbase", chapter: "6", title: "Review + Acidity/Basicity", days: [
    { task: "Review JF §7.4, 8.4, 10.1-10.5, 10.8, 10.10, 11.2, 11.4a (sub/elim & additions)", pages: "pp. 274-275", ch: "10" },
    { task: "Flashcards: Substitution & Elimination + Acids & Bases", pages: "" },
    { task: "Read JF §6.2-6.4, 7.8, 7.9 (alcohols/amines; acidity & basicity)", pages: "pp. 231-255", ch: "6" },
    { task: "Quiz: Acids & Bases (optional Klein K2 §2.1-2.6)", pages: "" },
    { task: "Acidity/basicity & amine synthesis (optional Klein K2 §2.1-2.6)", pages: "", ch: "6" },
    { task: "Practice: Ch 6 problems + review", pages: "" },
    { task: "Problem Set 1 + weekly review", pages: "" },
  ]},
  { week: 2, topic: "carbonyl", chapter: "16", title: "Aldehydes & Ketones: Structure (Ch 16)", days: [
    { task: "Read JF §16.1-16.5b, §11.6a,b (aldehydes/ketones: structure & prep)", pages: "pp. 766-775", ch: "16" },
    { task: "Flashcards: Aldehydes & Ketones (structure & prep)", pages: "" },
    { task: "Read JF §16.14a (oxidation to carbonyls) (optional Klein K1 §13.9, 11.12)", pages: "pp. 807-812", ch: "16" },
    { task: "Practice: carbonyl preparation problems", pages: "" },
    { task: "Read JF §6.7, 16.12, 16.13 (reactivity) (optional Klein K1 §13.5-7; K2 §6.3, 6.7)", pages: "pp. 802-807", ch: "16" },
    { task: "Quiz: Aldehydes & Ketones", pages: "" },
    { task: "Problem Set 2 + weekly review", pages: "" },
  ]},
  { week: 3, topic: "carbonyl", chapter: "16", title: "Aldehydes & Ketones: Acetals (Ch 16)", days: [
    { task: "Read JF §16.17 (the Wittig reaction) (optional Klein K2 §6.7 p.182-185)", pages: "pp. 816-819", ch: "16" },
    { task: "Flashcards: carbonyl reactions (Grignard, hydride, Wittig)", pages: "" },
    { task: "Read JF §16.6, 16.7, 16.9-16.10 (acetal formation) (optional Klein K2 §6.4)", pages: "pp. 776-794", ch: "16" },
    { task: "Reaction library: carbonyl additions; practice", pages: "" },
    { task: "Acetal formation & protecting groups, cont.", pages: "pp. 786-794", ch: "16" },
    { task: "Quiz: Aldehydes & Ketones (acetals)", pages: "" },
    { task: "Problem Set 3 + weekly review", pages: "" },
  ]},
  { week: 4, topic: "carbohydrates", chapter: "20", title: "Carbohydrates + Imines (Ch 20, 16)", days: [
    { task: "Read JF §20.2 (carbohydrate structure)", pages: "pp. 1028-1040", ch: "20" },
    { task: "Flashcards/practice: carbohydrates", pages: "" },
    { task: "Read JF §20.4a,c,f,g, 20.6 (glycosidic bonds) [regular term: Midterm 1]", pages: "pp. 1043-1063", ch: "20" },
    { task: "Review Midterm 1 material (Ch 16, 20)", pages: "" },
    { task: "Read JF §16.11 (imines: structure & preparation) (optional Klein K2 §9.3)", pages: "pp. 795-801", ch: "16" },
    { task: "Quiz: carbohydrates + imines", pages: "" },
    { task: "Problem Set 4 + weekly review", pages: "" },
  ]},
  { week: 5, topic: "enolate", chapter: "19", title: "Imines, Enamines & Enols (Ch 16, 19)", days: [
    { task: "Read JF §16.11 (imines: structure & preparation) (optional Klein K2 §9.3)", pages: "pp. 795-801", ch: "16" },
    { task: "Flashcards: imines vs. enamines", pages: "" },
    { task: "Read JF §19.5f (imines vs. enamines)", pages: "pp. 951-960", ch: "19" },
    { task: "Practice: imine/enamine mechanisms", pages: "" },
    { task: "Read JF §19.1-19.3, 19.5a (keto-enol equilibrium; enol vs enamine) (optional Klein K2 §8.1-4)", pages: "pp. 930-943", ch: "19" },
    { task: "Quiz: Enols & Enolates", pages: "" },
    { task: "Problem Set 5 + weekly review", pages: "" },
  ]},
  { week: 6, topic: "enolate", chapter: "19", title: "Enolates & Aldol (Ch 19)", days: [
    { task: "Read JF §19.1-19.3, 19.5a (keto-enol; enol vs enamine) (optional Klein K2 §8.1-4, 8.6)", pages: "pp. 930-943", ch: "19" },
    { task: "Flashcards: enols & enolates", pages: "" },
    { task: "Read JF §19.6a, 19.15 (enolate anions; aldol addition) (optional Klein K2 §8.7)", pages: "pp. 961-976", ch: "19" },
    { task: "Practice: aldol addition mechanisms", pages: "" },
    { task: "Aldol addition & condensation, cont.", pages: "pp. 961-976", ch: "19" },
    { task: "Quiz: Enols & Enolates (aldol)", pages: "" },
    { task: "Problem Set 6 + weekly review", pages: "" },
  ]},
  { week: 7, topic: "acids", chapter: "17", title: "Carboxylic Acids (Ch 17)", days: [
    { task: "Read JF §17.1-17.6, 17.8 (carboxylic acids: structure & prep) (optional Klein K2 §7.1-2)", pages: "pp. 834-866", ch: "17" },
    { task: "Flashcards: Carboxylic acids", pages: "" },
    { task: "Read JF §17.7a, 18.8, 19.5e (carboxylic acids, cont.) (optional Klein K2 §7.5)", pages: "pp. 845-866", ch: "17" },
    { task: "Practice: carboxylic acid synthesis", pages: "" },
    { task: "Carboxylic acids: reactions, cont.", pages: "pp. 845-866", ch: "17" },
    { task: "Quiz: Carboxylic acids & derivatives", pages: "" },
    { task: "Problem Set 7 + weekly review", pages: "" },
  ]},
  { week: 8, topic: "enolate", chapter: "19", title: "Esters, Claisen & β-Dicarbonyls (Ch 19)", days: [
    { task: "Read JF §19.8-19.9a (ester formation/reactions of esters) (optional Klein K2 §8.8)", pages: "pp. 982-994", ch: "19" },
    { task: "Flashcards: esters & Claisen", pages: "" },
    { task: "Read JF §19.10 (Claisen condensation) [regular term: Midterm 2]", pages: "pp. 994-998", ch: "19" },
    { task: "Review Midterm 2 material (Ch 17, 19)", pages: "" },
    { task: "Read JF §17.7g, 19.5c,d (beta-dicarbonyl derivatives) (optional Klein K2 §8.9)", pages: "pp. 845-960", ch: "19" },
    { task: "Quiz: enolate chemistry (Claisen, beta-dicarbonyl)", pages: "" },
    { task: "Problem Set 8 + weekly review", pages: "" },
  ]},
  { week: 9, topic: "acids", chapter: "18", title: "Amides & Acyl Compounds (Ch 18)", days: [
    { task: "Read JF §17.7d, 18.3, 18.4, 18.6, 18.7 (amide structure & synthesis) (optional Klein K2 §7.3, 7.4)", pages: "pp. 885-895", ch: "18" },
    { task: "Flashcards: acyl derivatives & amides", pages: "" },
    { task: "Amide structure & synthesis, cont.", pages: "pp. 885-895", ch: "18" },
    { task: "Practice: nucleophilic acyl substitution", pages: "" },
    { task: "Read JF §18.9 (amide reactivity) (optional Klein K2 §7.6, 7.7, 9.4)", pages: "pp. 901-907", ch: "18" },
    { task: "Quiz: Carboxylic acids & derivatives (amides)", pages: "" },
    { task: "Problem Set 9 + weekly review", pages: "" },
  ]},
  { week: 10, topic: "aminoacids", chapter: "22", title: "Amino Acids & Proteins (Ch 22)", days: [
    { task: "Read JF §22.2a-c (amino acids, polypeptides & proteins)", pages: "pp. 1106-1120", ch: "22" },
    { task: "Flashcards/practice: amino acids & peptides", pages: "" },
    { task: "Amino acids, polypeptides & proteins, cont.", pages: "pp. 1106-1120", ch: "22" },
    { task: "Practice: peptide structure", pages: "" },
    { task: "Read JF §22.4a,c (amino acids, polypeptides & proteins)", pages: "pp. 1120-1130", ch: "22" },
    { task: "Quiz: cumulative (Ch 16-19)", pages: "" },
    { task: "Problem Set 10 + weekly review", pages: "" },
  ]},
  { week: 11, topic: "all", chapter: "Review", title: "Course Review", days: [
    { task: "Review: aldehydes & ketones (Ch 16) - flashcards + quiz", pages: "", ch: "16" },
    { task: "Review: enols, enolates, aldol & Claisen (Ch 19)", pages: "", ch: "19" },
    { task: "Review: carboxylic acids & amides (Ch 17, 18)", pages: "", ch: "17" },
    { task: "Review: carbohydrates & amino acids (Ch 20, 22)", pages: "", ch: "20" },
    { task: "Full mixed quiz; drill weak-area flashcards", pages: "" },
    { task: "Synthesis roadmaps + reaction-library review", pages: "" },
    { task: "Final-exam review plan; redo missed problems", pages: "" },
  ]},
  { week: 12, topic: "all", chapter: "Review", title: "Finals Week", days: [
    { task: "Final review: Ch 16 + 20 (carbonyl & carbohydrates)", pages: "" },
    { task: "Final review: Ch 19 (enols, aldol, Claisen)", pages: "" },
    { task: "Final review: Ch 17, 18, 22 (acids, amides, amino acids)", pages: "" },
    { task: "Final prep: full mixed quiz, then rest", pages: "" },
    { task: "Final Exam", pages: "" },
    "",
    "",
  ]},
];

/*
 * Each chapter's end-of-chapter "Additional Problems" section start page (printed
 * page in Jones & Fleming, from the table of contents). The matching solutions
 * are in the Study Guide / Solutions Manual. The app links the day's chapter to
 * both: open the textbook to the problems, and the guide to the solutions.
 */
const CHAPTER_PROBLEMS = {
  "6": { additional: 264, title: "Alcohols, Amines & Substituted Alkanes" },
  "16": { additional: 825, title: "Aldehydes & Ketones" },
  "17": { additional: 872, title: "Carboxylic Acids" },
  "18": { additional: 923, title: "Acyl Compounds / Amides" },
  "19": { additional: 1014, title: "Enols & Enolates" },
  "20": { additional: 1073, title: "Carbohydrates" },
  "22": { additional: 1150, title: "Amino Acids & Proteins" },
};

const TOPICS = [
  { id: "acidbase", title: "Acids & Bases (review)", icon: "atom", color: "#84cc16" },
  { id: "subelim", title: "Substitution & Elimination (review)", icon: "atom", color: "#10b981" },
  { id: "stereo", title: "Stereochemistry (review)", icon: "atom", color: "#22c55e" },
  { id: "amines", title: "Amines", icon: "atom", color: "#14b8a6" },
  { id: "carbonyl", title: "Aldehydes & Ketones", icon: "carbonyl", color: "#ec4899" },
  { id: "carbohydrates", title: "Carbohydrates", icon: "ring", color: "#0ea5e9" },
  { id: "enolate", title: "Enols, Enolates & alpha-Chemistry", icon: "carbonyl", color: "#f59e0b" },
  { id: "acids", title: "Carboxylic Acids & Derivatives", icon: "carbonyl", color: "#f43f5e" },
  { id: "aminoacids", title: "Amino Acids & Proteins", icon: "atom", color: "#8b5cf6" },
];

const FLASHCARDS = [
  // Carbonyl
  { topic: "carbonyl", front: "Why are aldehydes more reactive than ketones toward nucleophiles?", back: "Less steric hindrance and less electron donation, so the carbonyl carbon is more electrophilic (one R group vs two)." },
  { topic: "carbonyl", front: "What does a Grignard reagent + carbonyl give?", back: "After aqueous workup, an alcohol: formaldehyde -> 1 deg, other aldehydes -> 2 deg, ketones -> 3 deg. (Run anhydrous.)" },
  { topic: "carbonyl", front: "NaBH4 vs LiAlH4 for reduction?", back: "NaBH4 is mild - reduces aldehydes/ketones. LiAlH4 is strong - also reduces esters, acids, amides, and nitriles. Both give alcohols (amides give amines)." },
  { topic: "carbonyl", front: "Acetal formation and its use?", back: "Carbonyl + 2 ROH (acid cat., -H2O) gives an acetal. It is reversible, so it serves as a protecting group for carbonyls." },
  { topic: "carbonyl", front: "Imine vs enamine?", back: "A primary amine gives an imine (C=N); a secondary amine gives an enamine (C=C-N). Both proceed with acid catalysis and loss of water." },
  { topic: "carbonyl", front: "The Wittig reaction?", back: "A phosphorus ylide (Ph3P=CR2) + aldehyde/ketone -> alkene + Ph3P=O. It forms a C=C bond at a defined position." },
  { topic: "carbonyl", front: "The Baeyer-Villiger oxidation?", back: "Ketone + peroxyacid (mCPBA) -> ester (an oxygen is inserted). Migratory aptitude: 3 deg > 2 deg ~ aryl > 1 deg > methyl." },

  // Carboxylic acids & derivatives
  { topic: "acids", front: "Reactivity order of carboxylic acid derivatives (nucleophilic acyl substitution)?", back: "Acyl chloride > anhydride > ester ~ acid > amide. Better leaving group / less resonance donation = more reactive." },
  { topic: "acids", front: "Why are carboxylic acids acidic (pKa ~4-5)?", back: "The carboxylate conjugate base is resonance-stabilized over two equivalent oxygen atoms." },
  { topic: "acids", front: "Fischer esterification?", back: "RCOOH + R'OH with acid catalyst gives an ester + water (an equilibrium). Drive it with excess alcohol or by removing water." },
  { topic: "acids", front: "How do you convert a carboxylic acid to an acyl chloride?", back: "SOCl2 (also PCl3, PCl5, or oxalyl chloride)." },
  { topic: "acids", front: "How do you make an amide from a carboxylic acid?", back: "Convert to the acyl chloride/anhydride then add amine, or use a coupling reagent (e.g., DCC). Acid + amine alone just forms a salt." },
  { topic: "acids", front: "What is saponification?", back: "Base-promoted (NaOH) hydrolysis of an ester to a carboxylate salt + alcohol; it is irreversible." },
  { topic: "acids", front: "Decarboxylation of beta-keto acids and malonic acids?", back: "On heating they lose CO2 through a six-membered cyclic transition state." },

  // Enolates / alpha chemistry
  { topic: "enolate", front: "What is the alpha-carbon, and why is its H acidic (pKa ~20)?", back: "The carbon next to a carbonyl. Its H is acidic because the resulting enolate is resonance-stabilized with the negative charge on oxygen." },
  { topic: "enolate", front: "Keto-enol tautomerism?", back: "An equilibrium between the keto form (C=O, usually more stable) and the enol form (C=C-OH); it is acid- or base-catalyzed." },
  { topic: "enolate", front: "The aldol reaction?", back: "An enolate adds to another carbonyl, giving a beta-hydroxy carbonyl. Heat/base then dehydrates it to an alpha,beta-unsaturated carbonyl (aldol condensation)." },
  { topic: "enolate", front: "The Claisen condensation?", back: "Two esters + base (NaOEt) -> a beta-keto ester. One ester enolate attacks the other and expels an alkoxide leaving group." },
  { topic: "enolate", front: "Kinetic vs thermodynamic enolate?", back: "LDA (bulky base, low temperature) gives the kinetic, less-substituted enolate; a weaker base at higher temperature gives the thermodynamic, more-substituted enolate." },
  { topic: "enolate", front: "The Michael addition?", back: "Conjugate (1,4-) addition of a stabilized enolate/nucleophile to an alpha,beta-unsaturated carbonyl." },
  { topic: "enolate", front: "Acetoacetic vs malonic ester synthesis?", back: "Acetoacetic ester synthesis builds substituted methyl ketones; malonic ester synthesis builds substituted carboxylic acids. Both: alkylate the alpha-carbon, then hydrolyze and decarboxylate." },

  // Amines
  { topic: "amines", front: "Basicity trend: alkylamine, ammonia, aniline, amide?", back: "Alkylamine > NH3 > arylamine (aniline) > amide. Resonance/delocalization of the N lone pair lowers basicity." },
  { topic: "amines", front: "Why is aniline less basic than cyclohexylamine?", back: "Aniline's nitrogen lone pair is delocalized into the aromatic ring, so it is less available to bond a proton." },
  { topic: "amines", front: "Reductive amination?", back: "Aldehyde/ketone + amine forms an imine/iminium, which is then reduced (NaBH3CN) to an amine. Avoids overalkylation." },
  { topic: "amines", front: "Gabriel synthesis - what does it make?", back: "Clean primary amines: alkylate potassium phthalimide, then cleave with hydrazine. No overalkylation." },
  { topic: "amines", front: "Hofmann elimination?", back: "Exhaustive methylation (CH3I) makes a quaternary ammonium salt; Ag2O/heat then eliminates to the LEAST substituted (Hofmann) alkene." },
  { topic: "amines", front: "Diazonium salts: formation and uses?", back: "Primary aryl amine + NaNO2/HCl at 0-5 C gives an aryl diazonium salt. Sandmeyer (CuBr/CuCl/CuCN) installs Br/Cl/CN; water gives phenol; coupling gives azo dyes." },
  { topic: "amines", front: "Why does direct alkylation of ammonia give poor primary amine yields?", back: "Overalkylation - the product amine is more nucleophilic than ammonia, giving a mixture of 1/2/3 deg and quaternary products." },

  // Substitution & elimination review
  { topic: "subelim", front: "SN2 vs SN1 - key differences?", back: "SN2: one step, backside attack (inversion), 2nd order, methyl/1 deg, strong Nu, polar aprotic. SN1: two steps via carbocation, racemization, 1st order, 3 deg, weak Nu, polar protic." },
  { topic: "subelim", front: "E2 vs E1 - key differences?", back: "E2: concerted, anti-periplanar, strong base, 2nd order. E1: stepwise via carbocation, weak base, 1st order. Both favor Zaitsev (bulky base -> Hofmann)." },
  { topic: "subelim", front: "Carbocation stability order?", back: "3 deg > 2 deg > 1 deg > methyl. Allylic/benzylic are stabilized by resonance; hydride/methyl shifts can rearrange to a more stable cation." },
  { topic: "subelim", front: "Solvent effects: protic vs aprotic?", back: "Polar protic (water, alcohols) favors SN1/E1; polar aprotic (DMSO, DMF, acetone) favors SN2." },
  { topic: "subelim", front: "Zaitsev vs Hofmann product?", back: "Zaitsev = the more substituted (more stable) alkene. Hofmann = the less substituted alkene, favored by bulky bases (t-BuOK, LDA)." },

  // Stereochemistry review
  { topic: "stereo", front: "What is a chiral (stereo) center?", back: "A carbon bonded to four different groups; such a molecule is non-superimposable on its mirror image." },
  { topic: "stereo", front: "Enantiomers vs diastereomers?", back: "Enantiomers: non-superimposable mirror images (all stereocenters inverted). Diastereomers: stereoisomers that are not mirror images (some, not all, centers differ)." },
  { topic: "stereo", front: "How do you assign R/S?", back: "Rank the four groups by CIP priority (atomic number). Point the lowest priority away; if 1->2->3 is clockwise it is R, counterclockwise it is S." },
  { topic: "stereo", front: "What is a meso compound?", back: "A molecule with stereocenters but an internal mirror plane, making it achiral and superimposable on its mirror image." },
  { topic: "stereo", front: "Maximum number of stereoisomers for n stereocenters?", back: "2^n (fewer when meso forms exist)." },

  // Acids & bases review
  { topic: "acidbase", front: "Bronsted vs Lewis acid/base?", back: "Bronsted: proton (H+) donor/acceptor. Lewis: electron-pair acceptor/donor." },
  { topic: "acidbase", front: "What does a lower pKa mean?", back: "A stronger acid (pKa = -log Ka). Acid-base equilibria favor forming the weaker acid and weaker base." },
  { topic: "acidbase", front: "Factors that stabilize a conjugate base (ARIO)?", back: "Atom (size & electronegativity), Resonance, Induction, Orbital (s-character). A more stable conjugate base means a stronger acid." },
  { topic: "acidbase", front: "Rank acidity: alkane, alcohol, water, carboxylic acid, terminal alkyne.", back: "Carboxylic acid (~4) > water (~15.7) ~ alcohol (~16) > terminal alkyne (~25) > alkane (~50)." },

  // Carbohydrates
  { topic: "carbohydrates", front: "Aldose vs ketose?", back: "Monosaccharides (polyhydroxy carbonyls). An aldose has an aldehyde (e.g., glucose); a ketose has a ketone (e.g., fructose)." },
  { topic: "carbohydrates", front: "How is a sugar assigned D or L?", back: "By the configuration of the highest-numbered (bottom) stereocenter in the Fischer projection: OH on the right = D, on the left = L. Most natural sugars are D." },
  { topic: "carbohydrates", front: "What is the anomeric carbon?", back: "The former carbonyl carbon, now a hemiacetal carbon after the sugar cyclizes. It bears the new -OH and is the center of mutarotation." },
  { topic: "carbohydrates", front: "Alpha vs beta anomer (D-sugar, Haworth)?", back: "Anomers differ only at the anomeric carbon. Alpha = anomeric OH points down (trans to the CH2OH); beta = OH points up (cis to CH2OH)." },
  { topic: "carbohydrates", front: "What is mutarotation?", back: "Interconversion of the alpha and beta anomers through the open-chain form, which slowly changes the optical rotation until equilibrium." },
  { topic: "carbohydrates", front: "How does a monosaccharide cyclize?", back: "Intramolecular hemiacetal formation: an -OH (C5 for an aldohexose -> 6-membered pyranose) attacks the carbonyl carbon." },
  { topic: "carbohydrates", front: "Pyranose vs furanose?", back: "Pyranose = 6-membered cyclic sugar; furanose = 5-membered cyclic sugar." },
  { topic: "carbohydrates", front: "What is a glycosidic bond?", back: "The acetal linkage from the anomeric carbon to another group/sugar (an O-glycoside), made from the hemiacetal + alcohol under acid; it locks the anomeric configuration (no more mutarotation)." },
  { topic: "carbohydrates", front: "Reducing vs non-reducing sugar?", back: "A reducing sugar has a free anomeric -OH (hemiacetal that can open to an aldehyde and be oxidized, e.g., Tollens/Benedict). A full acetal (glycoside) is non-reducing." },
  { topic: "carbohydrates", front: "Epimers?", back: "Diastereomeric sugars that differ in configuration at exactly one stereocenter (e.g., glucose and galactose are C4 epimers)." },

  // Amino acids & proteins
  { topic: "aminoacids", front: "General structure of an alpha-amino acid?", back: "A central (alpha) carbon bonded to an amino group (-NH2), a carboxyl group (-COOH), an H, and a side chain (R)." },
  { topic: "aminoacids", front: "Are amino acids chiral? Which configuration is natural?", back: "Yes - the alpha carbon has four different groups (except glycine, R = H). Natural amino acids are L (S configuration, except cysteine)." },
  { topic: "aminoacids", front: "What is a zwitterion?", back: "The dipolar form of an amino acid at physiological pH: -COO- and -NH3+ at the same time, with no net charge." },
  { topic: "aminoacids", front: "What is the isoelectric point (pI)?", back: "The pH at which the amino acid has no net charge (mostly zwitterion); for a simple amino acid it is the average of its two pKa values." },
  { topic: "aminoacids", front: "What is a peptide bond?", back: "The amide linkage between the carboxyl of one amino acid and the amino group of the next. It is planar with restricted rotation (partial double-bond character)." },
  { topic: "aminoacids", front: "N-terminus vs C-terminus?", back: "Peptides are written N-terminus (free -NH3+) on the left to C-terminus (free -COO-) on the right." },
  { topic: "aminoacids", front: "The four levels of protein structure?", back: "Primary (sequence), secondary (alpha-helix / beta-sheet from backbone H-bonds), tertiary (3D fold of one chain), quaternary (assembly of multiple chains)." },
  { topic: "aminoacids", front: "What stabilizes secondary structure?", back: "Hydrogen bonds between backbone C=O and N-H groups (alpha-helices and beta-sheets)." },
  { topic: "aminoacids", front: "What is a disulfide bond?", back: "A covalent S-S cross-link from oxidation of two cysteine -SH groups; it stabilizes tertiary/quaternary structure (reduced back by DTT/mercaptoethanol)." },
  { topic: "aminoacids", front: "Why is glycine special?", back: "Its side chain is just H, so it is achiral and the most conformationally flexible amino acid." },
];

const QUIZ = [
  // Carbonyl
  { topic: "carbonyl", question: "Reaction of a ketone with a Grignard reagent followed by aqueous workup gives a:", options: ["3 deg alcohol", "2 deg alcohol", "1 deg alcohol", "carboxylic acid"], answer: 0, explanation: "Adding R to a ketone carbon (already bearing two R groups) gives a tertiary alcohol." },
  { topic: "carbonyl", question: "Which reagent reduces an aldehyde to a 1 deg alcohol but leaves an ester in the same molecule untouched?", options: ["NaBH4", "LiAlH4", "H2 at high pressure over Ni", "HCl"], answer: 0, explanation: "NaBH4 is mild and selective for aldehydes/ketones; LiAlH4 would also reduce the ester." },
  { topic: "carbonyl", question: "A ketone reacting with a secondary amine (acid cat., -H2O) forms a(n):", options: ["enamine", "imine", "acetal", "alcohol"], answer: 0, explanation: "Secondary amines cannot lose a second N-H, so they form enamines (C=C-N); primary amines give imines." },

  // Acids
  { topic: "acids", question: "Rank these from most to least reactive toward nucleophilic acyl substitution:", options: ["acyl chloride > anhydride > ester > amide", "amide > ester > anhydride > acyl chloride", "ester > acyl chloride > amide > anhydride", "they are all equal"], answer: 0, explanation: "Better leaving group and weaker resonance donation make acyl chlorides most reactive, amides least." },
  { topic: "acids", question: "Saponification of an ester with aqueous NaOH yields:", options: ["a carboxylate salt and an alcohol", "an aldehyde", "an acyl chloride", "an ether"], answer: 0, explanation: "Base hydrolysis cleaves the ester to a carboxylate plus the alcohol; it is irreversible." },
  { topic: "acids", question: "Carboxylic acids are far more acidic than alcohols mainly because:", options: ["the carboxylate conjugate base is resonance-stabilized", "carboxylic acids are larger molecules", "alcohols have no O-H bond", "carboxylic acids are nonpolar"], answer: 0, explanation: "Resonance spreads the negative charge over two oxygens in the carboxylate." },

  // Enolate
  { topic: "enolate", question: "The aldol reaction forms a:", options: ["beta-hydroxy carbonyl compound", "beta-keto ester", "epoxide", "geminal diol"], answer: 0, explanation: "An enolate adds to a carbonyl, giving a beta-hydroxy carbonyl (which can dehydrate on heating)." },
  { topic: "enolate", question: "The Claisen condensation of two esters produces a:", options: ["beta-keto ester", "beta-hydroxy aldehyde", "1,3-diol", "carboxylic acid"], answer: 0, explanation: "An ester enolate attacks a second ester and expels alkoxide, giving a beta-keto ester." },
  { topic: "enolate", question: "To form the kinetic (less-substituted) enolate selectively, use:", options: ["LDA at low temperature", "NaOH at reflux", "concentrated H2SO4", "NaBH4"], answer: 0, explanation: "Bulky, strong LDA at low temperature deprotonates the less hindered alpha-position irreversibly." },

  // Amines
  { topic: "amines", question: "Which compound is the most basic?", options: ["cyclohexylamine", "aniline", "acetamide", "pyrrole"], answer: 0, explanation: "An aliphatic amine has a fully available lone pair; aniline, amides, and pyrrole delocalize theirs." },
  { topic: "amines", question: "Reductive amination of a ketone with an amine ultimately gives a(n):", options: ["amine", "amide", "nitrile", "carboxylic acid"], answer: 0, explanation: "The imine/iminium intermediate is reduced (e.g., NaBH3CN) to give the amine product." },
  { topic: "amines", question: "Aryl diazonium salts are made from a primary aromatic amine and:", options: ["NaNO2 / HCl at 0-5 C", "LiAlH4", "NaBH4", "Br2 / FeBr3"], answer: 0, explanation: "Cold nitrous acid (from NaNO2/HCl) diazotizes the primary aryl amine." },

  // Sub/elim
  { topic: "subelim", question: "A tertiary alkyl halide in a polar protic solvent with a weak nucleophile favors:", options: ["SN1", "SN2", "E2 exclusively", "no reaction"], answer: 0, explanation: "Tertiary substrate + ionizing protic solvent + weak nucleophile = carbocation pathway (SN1, with E1)." },
  { topic: "subelim", question: "For an E2 elimination, the H and the leaving group must be:", options: ["anti-periplanar", "syn-periplanar", "gauche", "eclipsed"], answer: 0, explanation: "E2 needs the C-H and C-LG bonds anti-periplanar for proper orbital overlap." },

  // Stereo
  { topic: "stereo", question: "Two stereoisomers that are non-superimposable mirror images are called:", options: ["enantiomers", "diastereomers", "constitutional isomers", "conformers"], answer: 0, explanation: "Mirror-image, non-superimposable stereoisomers are enantiomers." },
  { topic: "stereo", question: "A molecule with stereocenters but an internal mirror plane (and thus achiral) is:", options: ["meso", "racemic", "chiral", "an enantiomer"], answer: 0, explanation: "An internal mirror plane makes the molecule meso (achiral despite stereocenters)." },

  // Acid/base
  { topic: "acidbase", question: "A lower pKa value indicates:", options: ["a stronger acid", "a weaker acid", "a stronger base", "a neutral compound"], answer: 0, explanation: "pKa = -log Ka, so a lower pKa means a larger Ka and a stronger acid." },

  // Carbohydrates
  { topic: "carbohydrates", question: "An aldose is a monosaccharide that contains:", options: ["an aldehyde group", "a ketone group", "two carbonyls", "an ester"], answer: 0, explanation: "Aldoses have an aldehyde (e.g., glucose); ketoses have a ketone (e.g., fructose)." },
  { topic: "carbohydrates", question: "Two cyclic forms of a sugar that differ only at the anomeric carbon are:", options: ["anomers", "enantiomers", "epimers", "conformers"], answer: 0, explanation: "Anomers differ only at the anomeric (former carbonyl) carbon; they interconvert by mutarotation." },
  { topic: "carbohydrates", question: "A glycosidic bond is which functional group?", options: ["an acetal", "a hemiacetal", "an ester", "an ether between two CH2 groups"], answer: 0, explanation: "The anomeric carbon bonded to two oxygens (one to the aglycone) is a full acetal, which is non-reducing." },
  { topic: "carbohydrates", question: "A reducing sugar must have:", options: ["a free anomeric OH (hemiacetal that can open to an aldehyde)", "a glycosidic acetal", "no carbonyl in any form", "only the furanose form"], answer: 0, explanation: "A free hemiacetal can open to the aldehyde and be oxidized (Tollens/Benedict); a glycoside cannot." },

  // Amino acids & proteins
  { topic: "aminoacids", question: "At physiological pH, an amino acid exists mainly as:", options: ["a zwitterion (-COO- and -NH3+)", "fully protonated (-COOH, -NH3+)", "fully deprotonated (-COO-, -NH2)", "neutral -COOH / -NH2"], answer: 0, explanation: "Both groups are ionized at once, giving a net-neutral dipolar zwitterion." },
  { topic: "aminoacids", question: "The peptide bond is best described as:", options: ["a planar amide with restricted rotation", "a freely rotating single bond", "an ester linkage", "a disulfide bridge"], answer: 0, explanation: "Amide resonance gives the C-N partial double-bond character, making the peptide unit planar." },
  { topic: "aminoacids", question: "The isoelectric point (pI) is:", options: ["the pH where the amino acid has no net charge", "always exactly 7", "the pKa of pure water", "the melting point"], answer: 0, explanation: "At the pI the molecule is mostly the zwitterion; for a simple amino acid it is the average of its two pKa values." },
  { topic: "aminoacids", question: "Alpha-helices and beta-sheets are stabilized mainly by:", options: ["backbone hydrogen bonds", "disulfide bonds", "ionic salt bridges only", "metal coordination"], answer: 0, explanation: "Secondary structure comes from H-bonding between backbone C=O and N-H groups." },
];

const REACTIONS = [
  // Carbohydrates
  { name: "Glycoside formation", topic: "carbohydrates", substrate: "Monosaccharide (cyclic hemiacetal)", reagents: "ROH, H+", product: "Glycoside (acetal) + H2O", type: "Acetal formation", notes: "Locks the anomeric configuration; the product is a non-reducing sugar." },
  { name: "Reducing-sugar test", topic: "carbohydrates", substrate: "Aldose / reducing sugar", reagents: "Tollens Ag(NH3)2+ (or Benedict Cu2+)", product: "Aldonic acid (+ Ag mirror / Cu2O)", type: "Oxidation", notes: "Only sugars with a free anomeric OH (hemiacetal) react; glycosides do not." },

  // Amino acids & proteins
  { name: "Peptide bond formation", topic: "aminoacids", substrate: "Two amino acids", reagents: "Coupling reagent (e.g., DCC); biologically by the ribosome", product: "Dipeptide (amide bond) + H2O", type: "Condensation", notes: "Forms the planar amide linkage between -COOH and -NH2." },
  { name: "Disulfide formation", topic: "aminoacids", substrate: "Two cysteine -SH groups", reagents: "[O] (mild oxidation)", product: "Cystine (S-S cross-link)", type: "Oxidation", notes: "Stabilizes tertiary structure; reversed by DTT or 2-mercaptoethanol." },

  // Carbonyl
  { name: "Grignard addition", topic: "carbonyl", substrate: "Aldehyde / ketone", reagents: "R-MgX, then H3O+", product: "2 deg / 3 deg alcohol", type: "Nucleophilic addition", notes: "Anhydrous conditions; formaldehyde gives 1 deg, CO2 gives a carboxylic acid." },
  { name: "Hydride reduction", topic: "carbonyl", substrate: "Aldehyde / ketone", reagents: "NaBH4 or LiAlH4", product: "1 deg / 2 deg alcohol", type: "Reduction", notes: "NaBH4 is mild and selective; LiAlH4 is stronger (also reduces esters/acids)." },
  { name: "Acetal formation", topic: "carbonyl", substrate: "Aldehyde / ketone", reagents: "2 ROH, H+ (-H2O)", product: "Acetal", type: "Nucleophilic addition", notes: "Reversible carbonyl protecting group; hydrolyze with aqueous acid." },
  { name: "Imine formation", topic: "carbonyl", substrate: "Aldehyde / ketone", reagents: "Primary amine (RNH2), mild H+", product: "Imine (C=N)", type: "Condensation", notes: "Fastest near pH 4-5; loses water." },
  { name: "Enamine formation", topic: "carbonyl", substrate: "Aldehyde / ketone", reagents: "Secondary amine (R2NH), H+", product: "Enamine", type: "Condensation", notes: "Nucleophilic at the alpha-carbon (Stork enamine chemistry)." },
  { name: "Wittig reaction", topic: "carbonyl", substrate: "Aldehyde / ketone", reagents: "Ph3P=CR2 (ylide)", product: "Alkene", type: "Olefination", notes: "Byproduct is Ph3P=O; places the C=C exactly at the former carbonyl carbon." },
  { name: "Cyanohydrin formation", topic: "carbonyl", substrate: "Aldehyde / ketone", reagents: "HCN (or KCN / H+)", product: "Cyanohydrin", type: "Nucleophilic addition", notes: "Adds one carbon; the nitrile can be hydrolyzed later." },
  { name: "Baeyer-Villiger oxidation", topic: "carbonyl", substrate: "Ketone", reagents: "mCPBA (peroxyacid)", product: "Ester", type: "Oxidative insertion", notes: "Oxygen inserts next to the group with higher migratory aptitude (3 deg > aryl > 1 deg > methyl)." },

  // Acids & derivatives
  { name: "Fischer esterification", topic: "acids", substrate: "Carboxylic acid", reagents: "R'OH, H2SO4 (cat.)", product: "Ester (+ H2O)", type: "Nucleophilic acyl substitution", notes: "Equilibrium - drive with excess alcohol or remove water." },
  { name: "Acid to acyl chloride", topic: "acids", substrate: "Carboxylic acid", reagents: "SOCl2", product: "Acyl chloride", type: "Nucleophilic acyl substitution", notes: "Byproducts SO2 and HCl; gives the most reactive derivative." },
  { name: "Amide synthesis", topic: "acids", substrate: "Acyl chloride", reagents: "Amine (RNH2 or R2NH)", product: "Amide", type: "Nucleophilic acyl substitution", notes: "Use 2 equiv amine (or added base) to neutralize the HCl formed." },
  { name: "Saponification", topic: "acids", substrate: "Ester", reagents: "NaOH, H2O, heat", product: "Carboxylate + alcohol", type: "Hydrolysis", notes: "Base-promoted and irreversible (acidify to get the carboxylic acid)." },
  { name: "Ester reduction", topic: "acids", substrate: "Ester", reagents: "LiAlH4, then H3O+", product: "1 deg alcohol", type: "Reduction", notes: "NaBH4 is too weak to reduce esters efficiently." },
  { name: "Amide reduction", topic: "acids", substrate: "Amide", reagents: "LiAlH4", product: "Amine", type: "Reduction", notes: "C=O becomes CH2; the product is an amine, not an alcohol." },
  { name: "Nitrile hydrolysis", topic: "acids", substrate: "Nitrile (R-C(triple)N)", reagents: "H3O+ (or NaOH), heat", product: "Carboxylic acid", type: "Hydrolysis", notes: "Proceeds via the amide; partial hydrolysis can stop at the amide." },

  // Enolate
  { name: "Aldol addition", topic: "enolate", substrate: "Aldehyde / ketone (x2)", reagents: "NaOH (cat.)", product: "beta-Hydroxy carbonyl", type: "Aldol", notes: "Heating drives dehydration to the enone (aldol condensation)." },
  { name: "Aldol condensation", topic: "enolate", substrate: "Aldehyde / ketone", reagents: "NaOH, heat", product: "alpha,beta-Unsaturated carbonyl", type: "Condensation", notes: "Aldol then -H2O; conjugation is the driving force." },
  { name: "Claisen condensation", topic: "enolate", substrate: "Ester (x2)", reagents: "NaOEt, then H3O+", product: "beta-Keto ester", type: "Condensation", notes: "Needs an ester with two alpha-hydrogens; product is deprotonated to drive it." },
  { name: "Michael addition", topic: "enolate", substrate: "Enolate + alpha,beta-unsaturated carbonyl", reagents: "Base (cat.)", product: "1,5-Dicarbonyl", type: "Conjugate (1,4) addition", notes: "Soft, stabilized nucleophiles add 1,4 rather than 1,2." },
  { name: "Acetoacetic ester synthesis", topic: "enolate", substrate: "Ethyl acetoacetate", reagents: "1) NaOEt, R-X  2) H3O+, heat", product: "Substituted methyl ketone", type: "Alkylation + decarboxylation", notes: "Heating after hydrolysis loses CO2 from the beta-keto acid." },
  { name: "Malonic ester synthesis", topic: "enolate", substrate: "Diethyl malonate", reagents: "1) NaOEt, R-X  2) H3O+, heat", product: "Substituted acetic acid", type: "Alkylation + decarboxylation", notes: "Builds carboxylic acids with controlled alpha-substitution." },

  // Amines
  { name: "Reductive amination", topic: "amines", substrate: "Aldehyde / ketone + amine", reagents: "NaBH3CN", product: "Amine", type: "Reductive amination", notes: "Reduces the imine/iminium in situ; avoids overalkylation." },
  { name: "Gabriel synthesis", topic: "amines", substrate: "Potassium phthalimide", reagents: "1) R-X  2) N2H4", product: "Primary amine", type: "Substitution", notes: "Clean 1 deg amines, no overalkylation; R-X must work in SN2." },
  { name: "Hofmann elimination", topic: "amines", substrate: "Amine -> quaternary ammonium (excess CH3I)", reagents: "Ag2O, heat", product: "Less-substituted (Hofmann) alkene", type: "Elimination", notes: "Bulky leaving group gives the anti-Zaitsev alkene." },
  { name: "Sandmeyer reaction", topic: "amines", substrate: "Aryl amine", reagents: "1) NaNO2, HCl, 0-5 C  2) CuBr / CuCl / CuCN", product: "Aryl bromide / chloride / nitrile", type: "Substitution (via diazonium)", notes: "Diazonium chemistry installs groups that EAS cannot." },

  // Review classics
  { name: "SN2 substitution", topic: "subelim", substrate: "Methyl / 1 deg alkyl halide", reagents: "Strong nucleophile, polar aprotic solvent", product: "Substitution product (inverted)", type: "SN2", notes: "Concerted backside attack causes inversion of configuration." },
  { name: "E2 elimination", topic: "subelim", substrate: "Alkyl halide", reagents: "Strong, often bulky base (e.g., t-BuOK)", product: "Alkene", type: "E2", notes: "Anti-periplanar geometry required; bulky base gives the Hofmann alkene." },
  { name: "Markovnikov HX addition", topic: "subelim", substrate: "Alkene", reagents: "HBr (or HCl)", product: "Markovnikov alkyl halide", type: "Electrophilic addition", notes: "With peroxides (ROOR), HBr adds anti-Markovnikov via a radical chain." },
  { name: "Hydroboration-oxidation", topic: "subelim", substrate: "Alkene", reagents: "BH3.THF, then H2O2 / NaOH", product: "Anti-Markovnikov alcohol", type: "Addition", notes: "Syn addition; OH ends up on the less substituted carbon." },
  { name: "Ozonolysis", topic: "subelim", substrate: "Alkene", reagents: "O3, then Zn / DMS", product: "Two carbonyl compounds", type: "Oxidative cleavage", notes: "Reductive workup gives aldehydes/ketones; oxidative workup gives acids." },
];

const NOTES = [
  {
    topic: "carbohydrates",
    title: "Carbohydrates",
    sections: [
      { heading: "Structure", points: [
        "Monosaccharides are polyhydroxy aldehydes (aldoses) or ketones (ketoses).",
        "D vs L: set by the bottom (highest-numbered) stereocenter in the Fischer projection - OH right = D (most natural sugars).",
        "Epimers differ at exactly one stereocenter (glucose vs galactose = C4 epimers).",
      ]},
      { heading: "Cyclic forms", points: [
        "An internal -OH (C5 for an aldohexose) attacks the carbonyl -> cyclic hemiacetal (6-membered pyranose; 5-membered furanose).",
        "The anomeric carbon is the former carbonyl carbon; alpha = OH down, beta = OH up (Haworth, D-sugar).",
        "Mutarotation: alpha and beta anomers interconvert through the open chain until equilibrium.",
      ]},
      { heading: "Reactions", points: [
        "Glycoside formation (anomeric OH + ROH, H+) makes an acetal - locks the configuration, non-reducing.",
        "Reducing sugars (free hemiacetal) are oxidized by Tollens/Benedict; glycosides are not.",
      ]},
    ],
  },
  {
    topic: "aminoacids",
    title: "Amino Acids & Proteins",
    sections: [
      { heading: "Amino acids", points: [
        "Alpha carbon bears -NH2, -COOH, -H, and a side chain R; chiral (L / S) except glycine.",
        "At physiological pH they are zwitterions (-COO- and -NH3+), net neutral.",
        "Isoelectric point (pI) = pH of no net charge = average of the two pKa values (simple amino acid).",
      ]},
      { heading: "Peptides", points: [
        "The peptide (amide) bond joins -COOH of one residue to -NH2 of the next; planar, restricted rotation.",
        "Written N-terminus (left) to C-terminus (right).",
      ]},
      { heading: "Protein structure", points: [
        "Primary = sequence; secondary = alpha-helix / beta-sheet (backbone H-bonds).",
        "Tertiary = 3D fold of one chain (stabilized by H-bonds, salt bridges, hydrophobic packing, disulfides).",
        "Quaternary = assembly of multiple chains; disulfides come from cysteine -SH oxidation.",
      ]},
    ],
  },
  {
    topic: "carbonyl",
    title: "Aldehydes & Ketones",
    sections: [
      { heading: "Reactivity", points: [
        "The carbonyl carbon is electrophilic; aldehydes are more reactive than ketones (sterics + electronics).",
      ]},
      { heading: "Carbon and hydride nucleophiles", points: [
        "Grignard/organolithium: add R, give 2 deg/3 deg alcohols after workup.",
        "NaBH4 (mild) and LiAlH4 (strong) reduce C=O to alcohols.",
        "Wittig (Ph3P=CR2) makes alkenes; cyanohydrins add HCN.",
      ]},
      { heading: "Nitrogen & oxygen nucleophiles", points: [
        "Primary amine -> imine; secondary amine -> enamine.",
        "Two alcohols (acid cat.) -> acetal, a reversible protecting group.",
      ]},
    ],
  },
  {
    topic: "acids",
    title: "Carboxylic Acids & Derivatives",
    sections: [
      { heading: "Acidity", points: [
        "pKa ~4-5: the carboxylate is resonance-stabilized over two oxygens.",
      ]},
      { heading: "Reactivity ladder (NAS)", points: [
        "Acyl chloride > anhydride > ester ~ acid > amide.",
        "You can move down the ladder easily; moving up requires activation.",
      ]},
      { heading: "Key transformations", points: [
        "Fischer esterification (acid + alcohol, H+): reversible ester synthesis.",
        "SOCl2 -> acyl chloride; acyl chloride + amine -> amide.",
        "Saponification (NaOH) hydrolyzes esters; LiAlH4 reduces esters to 1 deg alcohols and amides to amines.",
      ]},
    ],
  },
  {
    topic: "enolate",
    title: "Enols, Enolates & alpha-Carbon Chemistry",
    sections: [
      { heading: "The alpha-carbon", points: [
        "Alpha-H pKa ~20; the enolate is resonance-stabilized onto oxygen.",
        "Keto-enol tautomerism is acid- or base-catalyzed.",
        "LDA (low T) gives the kinetic enolate; weaker base/heat gives the thermodynamic enolate.",
      ]},
      { heading: "C-C bond-forming reactions", points: [
        "Aldol: enolate + carbonyl -> beta-hydroxy carbonyl (heat -> enone).",
        "Claisen: two esters -> beta-keto ester.",
        "Michael: conjugate (1,4) addition to an enone.",
      ]},
      { heading: "Synthesis workhorses", points: [
        "Acetoacetic ester synthesis -> substituted methyl ketones.",
        "Malonic ester synthesis -> substituted carboxylic acids (alkylate, hydrolyze, decarboxylate).",
      ]},
    ],
  },
  {
    topic: "amines",
    title: "Amines",
    sections: [
      { heading: "Basicity", points: [
        "Alkylamine > NH3 > aniline > amide. Delocalizing the lone pair lowers basicity.",
      ]},
      { heading: "Making amines cleanly", points: [
        "Reductive amination (carbonyl + amine, NaBH3CN).",
        "Gabriel synthesis (phthalimide route) for pure primary amines.",
        "Direct alkylation of ammonia overalkylates - avoid it.",
      ]},
      { heading: "Diazonium chemistry", points: [
        "Aryl-NH2 + NaNO2/HCl (0-5 C) -> aryl diazonium salt.",
        "Sandmeyer (CuX) installs Br/Cl/CN; water gives phenol; coupling gives azo dyes.",
        "Hofmann elimination gives the least-substituted alkene.",
      ]},
    ],
  },
  {
    topic: "subelim",
    title: "Substitution & Elimination (Review)",
    sections: [
      { heading: "The four pathways", points: [
        "SN2: 1 step, backside attack/inversion, strong Nu, 1 deg/methyl, polar aprotic.",
        "SN1: carbocation, racemization, weak Nu, 3 deg, polar protic.",
        "E2: concerted, anti-periplanar, strong base.",
        "E1: carbocation, weak base.",
      ]},
      { heading: "Choosing the winner", points: [
        "Substrate (1/2/3 deg), nucleophile/base strength and bulk, and solvent decide the outcome.",
        "Zaitsev = more substituted alkene; bulky bases give the Hofmann (less substituted) alkene.",
      ]},
    ],
  },
  {
    topic: "stereo",
    title: "Stereochemistry (Review)",
    sections: [
      { heading: "Chirality", points: [
        "Stereocenter = carbon with four different groups.",
        "Assign R/S by CIP priority; lowest priority back, 1->2->3 clockwise = R.",
      ]},
      { heading: "Relationships", points: [
        "Enantiomers: mirror images, all centers inverted.",
        "Diastereomers: not mirror images, some centers differ.",
        "Meso: stereocenters + internal mirror plane = achiral.",
        "Up to 2^n stereoisomers for n stereocenters.",
      ]},
    ],
  },
  {
    topic: "acidbase",
    title: "Acids & Bases (Review)",
    sections: [
      { heading: "Definitions", points: [
        "Bronsted: H+ donor/acceptor. Lewis: electron-pair acceptor/donor.",
        "Lower pKa = stronger acid; equilibria favor the weaker acid/base.",
      ]},
      { heading: "Conjugate base stability (ARIO)", points: [
        "Atom (size & electronegativity), Resonance, Induction, Orbital (s-character).",
        "Acidity: carboxylic acid > water ~ alcohol > terminal alkyne > alkane.",
      ]},
    ],
  },
];
