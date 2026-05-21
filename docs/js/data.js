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
  { week: 1, topic: "spectroscopy", chapter: "9", title: "Spectroscopy (Ch 9)", days: [
    { task: "Read §9.1-9.3: intro, chromatography & mass spectrometry", pages: "pp. 368-379" },
    { task: "Read §9.4-9.5: UV/Vis & IR spectroscopy", pages: "pp. 380-393" },
    { task: "Flashcards: Spectroscopy (IR & MS) + review", pages: "" },
    { task: "Read §9.6-9.7: 1H NMR & NMR measurements", pages: "pp. 394-414" },
    { task: "Read §9.8-9.10: complex spectra, 13C NMR & solving structures", pages: "pp. 415-425" },
    { task: "Quiz: Spectroscopy", pages: "" },
    { task: "Review Ch 9 summary & problems", pages: "pp. 429-440" },
  ]},
  { week: 2, topic: "conjugation", chapter: "13", title: "Dienes & Conjugation (Ch 13)", days: [
    { task: "Read §13.1-13.4: allenes, ketenes & cumulenes", pages: "pp. 589-594" },
    { task: "Read §13.5-13.6: conjugated dienes & consequences of conjugation", pages: "pp. 595-602" },
    { task: "Read §13.7-13.9: addition reactions; kinetic vs thermodynamic; allyl system", pages: "pp. 603-614" },
    { task: "Read §13.10: the Diels-Alder reaction", pages: "pp. 615-624" },
    { task: "Flashcards: Conjugation; Diels-Alder in the reaction library", pages: "" },
    { task: "Quiz: Conjugation", pages: "" },
    { task: "Review Ch 13 summary & problems", pages: "pp. 634-640" },
  ]},
  { week: 3, topic: "aromaticity", chapter: "14", title: "Aromaticity (Ch 14)", days: [
    { task: "Read §14.1-14.3: benzene structure & a resonance picture", pages: "pp. 642-647" },
    { task: "Read §14.4-14.5: MO picture & resonance stabilization", pages: "pp. 648-651" },
    { task: "Read §14.6: Huckel's 4n+2 rule", pages: "pp. 652-664" },
    { task: "Read §14.7-14.9: substituted benzenes & heterocyclic aromatics", pages: "pp. 665-671" },
    { task: "Read §14.10-14.13: polycyclics & the benzyl group; Flashcards: Aromaticity", pages: "pp. 672-685" },
    { task: "Quiz: Aromaticity", pages: "" },
    { task: "Cumulative review (Ch 9, 13, 14)", pages: "" },
  ]},
  { week: 4, topic: "eas", chapter: "15", title: "Aromatic Substitution (Ch 15)", days: [
    { task: "Read §15.1-15.3: EAS general mechanism & reactions", pages: "pp. 694-712" },
    { task: "Read §15.4-15.5: nitrobenzene chemistry & heteroaromatics", pages: "pp. 713-721" },
    { task: "Read §15.6: disubstituted benzenes (o/m/p directing)", pages: "pp. 722-735" },
    { task: "Flashcards: Aromatic substitution; reaction library (EAS)", pages: "" },
    { task: "Quiz: Aromatic substitution", pages: "" },
    { task: "Aromatic synthesis practice problems", pages: "" },
    { task: "Light review / catch-up", pages: "" },
  ]},
  { week: 5, topic: "eas", chapter: "15", title: "Aromatic Substitution, cont. (Ch 15)", days: [
    { task: "Read §15.7: synthesis of polysubstituted benzenes", pages: "pp. 736-740" },
    { task: "Read §15.8: nucleophilic aromatic substitution (SNAr)", pages: "pp. 741-746" },
    { task: "Read §15.9-15.12: benzyne & special topics", pages: "pp. 747-755" },
    { task: "Read Ch 15 summary", pages: "pp. 756-764" },
    { task: "Flashcards review; mixed quiz", pages: "" },
    { task: "Synthesis practice (aromatic)", pages: "" },
    { task: "Cumulative review (Ch 13-15)", pages: "" },
  ]},
  { week: 6, topic: "carbonyl", chapter: "16", title: "Aldehydes & Ketones (Ch 16)", days: [
    { task: "Read §16.1-16.5: structure, nomenclature & spectroscopy", pages: "pp. 766-775" },
    { task: "Read §16.6-16.8: reversible additions; cyanide & bisulfite", pages: "pp. 776-785" },
    { task: "Read §16.9-16.11: acetals, protecting groups, imines & enamines", pages: "pp. 786-801" },
    { task: "Flashcards: Aldehydes & Ketones (part 1)", pages: "" },
    { task: "Quiz: Aldehydes & Ketones", pages: "" },
    { task: "Practice problems (carbonyl)", pages: "" },
    { task: "Light review / catch-up", pages: "" },
  ]},
  { week: 7, topic: "carbonyl", chapter: "16", title: "Aldehydes & Ketones, cont. (Ch 16)", days: [
    { task: "Read §16.12-16.15: organometallics, alcohol synthesis & oxidation", pages: "pp. 802-813" },
    { task: "Read §16.16-16.17: the Wittig reaction", pages: "pp. 814-819" },
    { task: "Read Ch 16 summary", pages: "pp. 820-832" },
    { task: "Flashcards: carbonyl reactions; reaction library", pages: "" },
    { task: "Quiz: Aldehydes & Ketones (mixed)", pages: "" },
    { task: "Synthesis practice (carbonyl)", pages: "" },
    { task: "Cumulative review (Ch 16)", pages: "" },
  ]},
  { week: 8, topic: "acids", chapter: "17", title: "Carboxylic Acids (Ch 17)", days: [
    { task: "Read §17.1-17.4: nomenclature, structure & spectra", pages: "pp. 834-838" },
    { task: "Read §17.5: acidity & basicity of carboxylic acids", pages: "pp. 839-842" },
    { task: "Read §17.6-17.7: syntheses & reactions of carboxylic acids", pages: "pp. 843-865" },
    { task: "Read Ch 17 summary", pages: "pp. 870-877" },
    { task: "Flashcards: Carboxylic acids; reaction library", pages: "" },
    { task: "Quiz: Carboxylic acids & derivatives", pages: "" },
    { task: "Cumulative review (Ch 15-17)", pages: "" },
  ]},
  { week: 9, topic: "acids", chapter: "18", title: "Acyl Derivatives (Ch 18)", days: [
    { task: "Read §18.1-18.5: acyl compounds: nomenclature, structure & spectra", pages: "pp. 879-889" },
    { task: "Read §18.6-18.7: reactions of acid chlorides & anhydrides", pages: "pp. 890-895" },
    { task: "Read §18.8-18.9: reactions of esters & amides", pages: "pp. 896-903" },
    { task: "Read §18.10-18.13: nitriles, ketenes & acyl rearrangements", pages: "pp. 904-918" },
    { task: "Read Ch 18 summary; Flashcards", pages: "pp. 919-928" },
    { task: "Quiz: Carboxylic acids & derivatives (mixed)", pages: "" },
    { task: "Cumulative review (Ch 18)", pages: "" },
  ]},
  { week: 10, topic: "enolate", chapter: "19", title: "Enols & Enolates (Ch 19)", days: [
    { task: "Read §19.1-19.3: enols & enolates; alpha-acidity; racemization", pages: "pp. 930-943" },
    { task: "Read §19.4-19.5: alpha-halogenation & alkylation", pages: "pp. 944-960" },
    { task: "Read §19.6: the aldol condensation", pages: "pp. 961-976" },
    { task: "Flashcards: Enols & Enolates (part 1)", pages: "" },
    { task: "Quiz: Enols & Enolates", pages: "" },
    { task: "Practice problems (enolate)", pages: "" },
    { task: "Light review / catch-up", pages: "" },
  ]},
  { week: 11, topic: "enolate", chapter: "19", title: "Enolates, cont. (Ch 19)", days: [
    { task: "Read §19.7-19.8: aldol-related reactions; the Claisen condensation", pages: "pp. 977-989" },
    { task: "Read §19.9-19.11: Claisen variations; combined condensations", pages: "pp. 990-998" },
    { task: "Read §19.12-19.16: special topics & chapter summary", pages: "pp. 999-1013" },
    { task: "Read Ch 19 problems; Flashcards: full enolate set", pages: "pp. 1014-1025" },
    { task: "Quiz: Enols & Enolates (mixed)", pages: "" },
    { task: "Synthesis practice (enolate)", pages: "" },
    { task: "Cumulative review (Ch 18-19)", pages: "" },
  ]},
  { week: 12, topic: "all", chapter: "Review", title: "Course Review + Finals Week", days: [
    { task: "Final review: Ch 9, 13, 14 (mixed flashcards + quiz)", pages: "" },
    { task: "Final review: Ch 15, 16, 17 (mixed)", pages: "" },
    { task: "Final review: Ch 18, 19 (mixed)", pages: "" },
    { task: "Final prep: full mixed quiz + synthesis & reaction-library review", pages: "" },
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
  "9": { additional: 430, title: "Spectroscopy" },
  "13": { additional: 635, title: "Dienes & Conjugation" },
  "14": { additional: 688, title: "Aromaticity" },
  "15": { additional: 759, title: "Aromatic Substitution" },
  "16": { additional: 825, title: "Aldehydes & Ketones" },
  "17": { additional: 872, title: "Carboxylic Acids" },
  "18": { additional: 923, title: "Acyl Derivatives" },
  "19": { additional: 1014, title: "Enols & Enolates" },
};

const TOPICS = [
  { id: "spectroscopy", title: "Spectroscopy (IR / NMR / MS)", icon: "wave", color: "#6366f1" },
  { id: "conjugation", title: "Conjugation, Dienes & Diels-Alder", icon: "chain", color: "#0ea5e9" },
  { id: "aromaticity", title: "Aromaticity", icon: "ring", color: "#8b5cf6" },
  { id: "eas", title: "Aromatic Substitution (EAS / NAS)", icon: "ring", color: "#a855f7" },
  { id: "carbonyl", title: "Aldehydes & Ketones", icon: "carbonyl", color: "#ec4899" },
  { id: "acids", title: "Carboxylic Acids & Derivatives", icon: "carbonyl", color: "#f43f5e" },
  { id: "enolate", title: "Enols, Enolates & alpha-Chemistry", icon: "carbonyl", color: "#f59e0b" },
  { id: "amines", title: "Amines", icon: "atom", color: "#14b8a6" },
  { id: "subelim", title: "Substitution & Elimination (review)", icon: "atom", color: "#10b981" },
  { id: "stereo", title: "Stereochemistry (review)", icon: "atom", color: "#22c55e" },
  { id: "acidbase", title: "Acids & Bases (review)", icon: "atom", color: "#84cc16" },
];

const FLASHCARDS = [
  // Spectroscopy
  { topic: "spectroscopy", front: "IR: what does a strong absorption near 1700-1750 cm-1 indicate?", back: "A C=O (carbonyl) stretch. Ketone ~1715, aldehyde ~1725, ester ~1735-1745; conjugation lowers the value." },
  { topic: "spectroscopy", front: "IR: how do you tell an alcohol O-H from a carboxylic acid O-H?", back: "Alcohol O-H is broad ~3200-3550 cm-1. Carboxylic acid O-H is VERY broad, ~2500-3300 cm-1, overlapping the C-H region." },
  { topic: "spectroscopy", front: "IR: N-H stretch region and band count?", back: "~3300-3500 cm-1. A primary amine/amide shows two bands; a secondary one shows a single band." },
  { topic: "spectroscopy", front: "What three pieces of information does a 1H NMR spectrum give?", back: "Chemical shift (electronic environment), integration (relative number of H), and splitting/multiplicity (number of neighboring H via the n+1 rule)." },
  { topic: "spectroscopy", front: "1H NMR: the n+1 rule?", back: "A signal split by n equivalent neighboring protons appears as n+1 peaks (e.g., 3 neighbors -> quartet)." },
  { topic: "spectroscopy", front: "1H NMR: approximate chemical shifts?", back: "Alkyl 0.9-1.5; alpha to C=O ~2.1-2.6; H-C-O 3.3-4.5; vinyl 4.5-6.5; aromatic 6.5-8; aldehyde 9-10; COOH 10-12 ppm." },
  { topic: "spectroscopy", front: "Mass spec: what do M+2 isotope peaks tell you?", back: "M+2 about equal to M+ -> bromine present. M+2 about 1/3 of M+ -> chlorine present." },
  { topic: "spectroscopy", front: "Degrees of unsaturation formula?", back: "DoU = (2C + 2 + N - H - X) / 2. Each ring or pi bond counts as one." },

  // Conjugation
  { topic: "conjugation", front: "What makes a system conjugated?", back: "A continuous chain of overlapping p orbitals - alternating pi bonds, or a p orbital (lone pair, radical, or empty orbital) on an atom adjacent to a pi bond - allowing electron delocalization." },
  { topic: "conjugation", front: "1,2- vs 1,4-addition of HBr to 1,3-butadiene?", back: "Low temperature favors the 1,2 (kinetic) product; high temperature favors the 1,4 (thermodynamic, more substituted alkene) product." },
  { topic: "conjugation", front: "The Diels-Alder reaction?", back: "A [4+2] cycloaddition: a conjugated diene (in the s-cis conformation) + a dienophile -> cyclohexene. Concerted, stereospecific, suprafacial." },
  { topic: "conjugation", front: "What makes a good dienophile and a good diene?", back: "Dienophile: electron-poor alkene/alkyne with an EWG (C=O, CN, NO2). Diene: electron-rich (EDG) and able to reach the s-cis conformation." },
  { topic: "conjugation", front: "The endo rule in Diels-Alder?", back: "The endo product (the dienophile's EWG points toward/under the diene pi system) is the kinetically favored stereochemistry." },
  { topic: "conjugation", front: "Why is an allylic cation stabilized?", back: "Resonance delocalizes the positive charge over two carbons." },
  { topic: "conjugation", front: "How does conjugation affect UV-Vis absorption?", back: "More conjugation -> smaller HOMO-LUMO gap -> absorption at longer wavelength (lambda-max shifts toward red)." },

  // Aromaticity
  { topic: "aromaticity", front: "Huckel's rule: the four criteria for aromaticity?", back: "Cyclic, planar, fully conjugated (continuous loop of p orbitals), and 4n+2 pi electrons (2, 6, 10, ...)." },
  { topic: "aromaticity", front: "What is an antiaromatic compound?", back: "Cyclic, planar, conjugated with 4n pi electrons (4, 8, ...). Strongly destabilized - molecules distort out of plane to avoid it." },
  { topic: "aromaticity", front: "Why is benzene unusually stable?", back: "Six delocalized pi electrons make it aromatic; the resonance (aromatic) stabilization energy is roughly 36 kcal/mol." },
  { topic: "aromaticity", front: "Pyridine: is it aromatic, and where is the N lone pair?", back: "Aromatic. The nitrogen lone pair sits in an sp2 orbital in the ring plane (NOT part of the pi system), so pyridine is basic." },
  { topic: "aromaticity", front: "Pyrrole: is it aromatic, and where is the N lone pair?", back: "Aromatic. The nitrogen lone pair IS part of the pi system (it supplies 2 of the 6 pi electrons), so pyrrole is a very weak base." },
  { topic: "aromaticity", front: "Cyclopentadienyl: anion vs cation aromaticity?", back: "The anion is aromatic (6 pi electrons); the cation is antiaromatic (4 pi electrons)." },
  { topic: "aromaticity", front: "What is the tropylium cation?", back: "The cycloheptatrienyl cation - aromatic (6 pi electrons) and therefore an unusually stable carbocation." },

  // EAS / NAS
  { topic: "eas", front: "General mechanism of electrophilic aromatic substitution (EAS)?", back: "Generate the electrophile -> the arene pi system attacks E+ forming a resonance-stabilized arenium (sigma) ion -> loss of H+ rearomatizes the ring." },
  { topic: "eas", front: "The five classic EAS reactions?", back: "Halogenation (X2/FeX3), nitration (HNO3/H2SO4), sulfonation (SO3/H2SO4), Friedel-Crafts alkylation (RX/AlCl3), Friedel-Crafts acylation (RCOCl/AlCl3)." },
  { topic: "eas", front: "Which groups are activating, ortho/para-directors?", back: "Electron donors: -NH2, -NHR, -OH, -OR, -NHC(=O)R, alkyl, and aryl groups." },
  { topic: "eas", front: "Which groups are deactivating, meta-directors?", back: "Electron withdrawers: -NO2, -NR3+, -CN, -SO3H, -CHO/-C(=O)R, -COOH/-COOR, -CF3." },
  { topic: "eas", front: "How do halogen substituents direct in EAS?", back: "They are deactivating (inductive withdrawal) but ortho/para-directing (lone-pair resonance donation)." },
  { topic: "eas", front: "Limitations of Friedel-Crafts alkylation?", back: "Carbocation rearrangements, polyalkylation, and failure on strongly deactivated rings or aniline." },
  { topic: "eas", front: "How do you install a straight-chain alkyl group on benzene?", back: "Use Friedel-Crafts acylation, then reduce the ketone (Clemmensen, Zn(Hg)/HCl, or Wolff-Kishner) - this avoids rearrangement." },
  { topic: "eas", front: "What does nucleophilic aromatic substitution (SNAr) require?", back: "A strong EWG ortho/para to a leaving group; it proceeds through a Meisenheimer complex." },

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
];

const QUIZ = [
  // Spectroscopy
  { topic: "spectroscopy", question: "A strong IR absorption near 1715 cm-1 most likely indicates which functional group?", options: ["C=O (carbonyl)", "O-H (alcohol)", "C(triple)C (alkyne)", "C-H bend"], answer: 0, explanation: "Carbonyl C=O stretches appear ~1700-1750 cm-1; a ketone is ~1715." },
  { topic: "spectroscopy", question: "In 1H NMR, a signal that appears as a triplet has how many equivalent neighboring protons?", options: ["2", "1", "3", "0"], answer: 0, explanation: "By the n+1 rule, a triplet (3 peaks) comes from 2 neighbors." },
  { topic: "spectroscopy", question: "In a mass spectrum, an M and M+2 peak of nearly equal intensity suggests the presence of:", options: ["Bromine", "Chlorine", "Nitrogen", "Oxygen"], answer: 0, explanation: "Br has two abundant isotopes (79/81) of nearly equal abundance, giving M and M+2 of similar height." },

  // Conjugation
  { topic: "conjugation", question: "The Diels-Alder reaction is best classified as a:", options: ["[4+2] cycloaddition", "[2+2] cycloaddition", "radical chain reaction", "nucleophilic substitution"], answer: 0, explanation: "It joins a 4-pi-electron diene with a 2-pi-electron dienophile - a [4+2] cycloaddition." },
  { topic: "conjugation", question: "Which diene conformation is required for the Diels-Alder reaction?", options: ["s-cis", "s-trans", "anti", "gauche"], answer: 0, explanation: "Only the s-cis conformation lets both diene termini reach the dienophile." },
  { topic: "conjugation", question: "At high temperature, addition of HBr to 1,3-butadiene predominantly gives the:", options: ["1,4 (thermodynamic) product", "1,2 (kinetic) product", "anti-Markovnikov product", "Diels-Alder adduct"], answer: 0, explanation: "High temperature favors the more stable, more substituted 1,4 (thermodynamic) product." },

  // Aromaticity
  { topic: "aromaticity", question: "By Huckel's rule, an aromatic ring must be cyclic, planar, conjugated, and have:", options: ["4n+2 pi electrons", "4n pi electrons", "an even number of carbons", "only sp3 carbons"], answer: 0, explanation: "Aromatic systems contain 4n+2 (2, 6, 10, ...) pi electrons." },
  { topic: "aromaticity", question: "Why is pyridine basic at nitrogen while pyrrole is not?", options: ["Pyridine's N lone pair is in an in-plane sp2 orbital; pyrrole's lone pair is part of the aromatic pi system", "Pyridine has more carbons", "Pyrrole is not aromatic", "Pyridine is antiaromatic"], answer: 0, explanation: "Pyrrole must use its N lone pair for aromaticity, so it cannot easily bind a proton; pyridine's lone pair is free." },
  { topic: "aromaticity", question: "The cyclopentadienyl ANION is aromatic because it has:", options: ["6 pi electrons", "4 pi electrons", "8 pi electrons", "no pi electrons"], answer: 0, explanation: "The anion has 6 pi electrons (4n+2, n=1) and is aromatic; the cation (4 pi e-) is antiaromatic." },

  // EAS
  { topic: "eas", question: "Which substituent is a meta-director and a deactivator?", options: ["-NO2", "-OCH3", "-CH3", "-NH2"], answer: 0, explanation: "-NO2 is a strong electron-withdrawing group: deactivating and meta-directing." },
  { topic: "eas", question: "Halogen substituents on benzene are:", options: ["deactivating but ortho/para-directing", "activating and ortho/para-directing", "deactivating and meta-directing", "activating and meta-directing"], answer: 0, explanation: "Halogens withdraw inductively (deactivate) but donate by resonance (o/p-direct)." },
  { topic: "eas", question: "The best way to put an unrearranged n-propyl group on benzene is to:", options: ["do Friedel-Crafts acylation, then reduce the ketone", "do Friedel-Crafts alkylation with 1-chloropropane", "nitrate, then reduce", "sulfonate the ring"], answer: 0, explanation: "Acylation avoids carbocation rearrangement; reduction (Clemmensen/Wolff-Kishner) gives the straight chain." },

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
];

const REACTIONS = [
  // Conjugation
  { name: "Diels-Alder", topic: "conjugation", substrate: "Conjugated diene (s-cis) + dienophile", reagents: "Heat", product: "Cyclohexene", type: "[4+2] cycloaddition", notes: "Concerted and stereospecific; endo product favored; electron-poor dienophile + electron-rich diene react fastest." },

  // EAS
  { name: "Aromatic halogenation", topic: "eas", substrate: "Benzene", reagents: "Br2, FeBr3 (or Cl2, FeCl3)", product: "Halobenzene", type: "EAS", notes: "Lewis acid polarizes the halogen to make the electrophile." },
  { name: "Nitration", topic: "eas", substrate: "Benzene", reagents: "HNO3, H2SO4", product: "Nitrobenzene", type: "EAS", notes: "Electrophile is the nitronium ion, NO2+." },
  { name: "Sulfonation", topic: "eas", substrate: "Benzene", reagents: "SO3, H2SO4 (fuming)", product: "Benzenesulfonic acid", type: "EAS", notes: "Reversible - useful as a removable blocking group." },
  { name: "Friedel-Crafts alkylation", topic: "eas", substrate: "Benzene", reagents: "R-Cl, AlCl3", product: "Alkylbenzene", type: "EAS", notes: "Prone to carbocation rearrangement and polyalkylation; fails on deactivated rings." },
  { name: "Friedel-Crafts acylation", topic: "eas", substrate: "Benzene", reagents: "R-COCl, AlCl3", product: "Aryl ketone", type: "EAS", notes: "No rearrangement; stops at mono-acylation (product is deactivated)." },
  { name: "Carbonyl reduction (post-FC)", topic: "eas", substrate: "Aryl ketone", reagents: "Zn(Hg), HCl (Clemmensen) or N2H4, KOH (Wolff-Kishner)", product: "Alkylbenzene (straight chain)", type: "Reduction", notes: "Combine with acylation to install unrearranged alkyl chains." },

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
    topic: "spectroscopy",
    title: "Structure Determination: IR, NMR & MS",
    sections: [
      { heading: "IR - which bonds are present", points: [
        "C=O carbonyl: strong band ~1700-1750 cm-1 (the single most useful diagnostic).",
        "O-H alcohol: broad ~3200-3550; carboxylic acid O-H: very broad ~2500-3300.",
        "N-H: ~3300-3500 (two bands for primary, one for secondary).",
        "C(triple)C / C(triple)N: ~2100-2260; sp C-H and sp2 C-H appear above 3000 cm-1.",
      ]},
      { heading: "1H NMR - the three readouts", points: [
        "Chemical shift = electronic environment (deshielding shifts signals downfield).",
        "Integration = relative number of protons.",
        "Multiplicity = n+1 rule: n equivalent neighbors give n+1 peaks.",
        "Useful shifts: aldehyde 9-10, aromatic 6.5-8, vinyl 4.5-6.5, H-C-O 3.3-4.5, alpha-to-C=O 2.1-2.6 ppm.",
      ]},
      { heading: "Mass spec & unsaturation", points: [
        "M+ = molecular weight; look for isotope patterns: Br (M, M+2 ~1:1), Cl (M, M+2 ~3:1).",
        "Degrees of unsaturation = (2C + 2 + N - H - X)/2; each counts one ring or pi bond.",
      ]},
    ],
  },
  {
    topic: "conjugation",
    title: "Conjugation, Dienes & the Diels-Alder Reaction",
    sections: [
      { heading: "Conjugation basics", points: [
        "Overlapping p orbitals delocalize electrons and add stability (allylic cations/radicals, dienes).",
        "More conjugation -> smaller HOMO-LUMO gap -> longer-wavelength UV-Vis absorption.",
      ]},
      { heading: "Kinetic vs thermodynamic addition", points: [
        "Adding HX to a conjugated diene gives 1,2 (kinetic, low temperature) and 1,4 (thermodynamic, high temperature) products.",
      ]},
      { heading: "Diels-Alder ([4+2])", points: [
        "Diene (must be s-cis) + dienophile -> cyclohexene in one concerted step.",
        "Electron-rich diene + electron-poor dienophile (EWG) react fastest.",
        "Stereospecific (substituent geometry retained); endo product is kinetically favored.",
      ]},
    ],
  },
  {
    topic: "aromaticity",
    title: "Aromaticity",
    sections: [
      { heading: "Huckel's rule", points: [
        "Aromatic: cyclic, planar, fully conjugated, and 4n+2 pi electrons.",
        "Antiaromatic: same but 4n pi electrons - strongly destabilized.",
        "Nonaromatic: not fully conjugated or not planar.",
      ]},
      { heading: "Heteroatom lone pairs", points: [
        "Pyridine: N lone pair is in-plane (sp2), outside the pi system -> basic.",
        "Pyrrole: N lone pair is IN the pi system (supplies 2 e-) -> weak base.",
      ]},
      { heading: "Charged rings", points: [
        "Cyclopentadienyl anion (6 pi e-) is aromatic; tropylium cation (6 pi e-) is aromatic.",
        "Cyclopentadienyl cation (4 pi e-) is antiaromatic.",
      ]},
    ],
  },
  {
    topic: "eas",
    title: "Aromatic Substitution",
    sections: [
      { heading: "EAS mechanism", points: [
        "Generate electrophile -> ring attacks E+ forming a resonance-stabilized arenium ion -> lose H+ to rearomatize.",
        "Reactions: halogenation, nitration, sulfonation, Friedel-Crafts alkylation & acylation.",
      ]},
      { heading: "Directing effects", points: [
        "Activators (o/p): -NH2, -OH, -OR, -NHCOR, alkyl, aryl.",
        "Deactivators (meta): -NO2, -CN, -SO3H, -C=O groups, -NR3+, -CF3.",
        "Halogens: deactivating but o/p-directing.",
      ]},
      { heading: "Practical notes", points: [
        "Friedel-Crafts alkylation rearranges and polyalkylates; use acylation + reduction for clean alkyl chains.",
        "SNAr (nucleophilic aromatic substitution) needs a strong EWG ortho/para to the leaving group.",
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
