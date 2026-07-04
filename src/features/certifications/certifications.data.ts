/**
 * Javify Certification System — Data & Type Definitions
 */

export interface CertTrack {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  skills: string[];
  requirements: CertRequirement[];
  assessmentQuestions: AssessmentQuestion[];
  minScore: number; // 0-100
  prerequisiteTrackId: string | null;
  xpReward: number;
  badge: string;
}

export interface CertRequirement {
  type: "challenges" | "minigames" | "xp" | "streak";
  label: string;
  target: number;
}

export interface AssessmentQuestion {
  id: string;
  type: "mcq" | "debug" | "output";
  question: string;
  code?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  points: number;
}

export interface EarnedCertificate {
  id: string;
  trackId: string;
  userId: string;
  userName: string;
  title: string;
  skills: string[];
  score: number;
  issuedAt: number;
  certificateId: string; // JVF-YYYY-NNNNN
  verificationUrl: string;
  shareUrl: string;
  shareCount: number;
}

export function generateShareUrl(certId: string): string {
  return `${window.location.origin}/#/certificate/share/${certId}`;
}

export function buildLinkedInShareUrl(cert: EarnedCertificate): string {
  const text = `I just earned the ${cert.title} on Javify 🎓\n\nSkills gained:\n${cert.skills.map(s => `✓ ${s}`).join("\n")}\n\nView my verified certificate here:\n${cert.shareUrl}`;
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cert.shareUrl)}&summary=${encodeURIComponent(text)}`;
}

export function buildTwitterShareUrl(cert: EarnedCertificate): string {
  const text = `I completed ${cert.title} on Javify 🚀 #Java #Coding #Learning\n\nVerify: ${cert.verificationUrl}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/** WhatsApp share — works on web (wa.me) and native apps. */
export function buildWhatsAppShareUrl(cert: EarnedCertificate): string {
  const text = `🎓 I just earned the *${cert.title}* on Javify!\n\nSkills validated:\n${cert.skills.map(s => `✓ ${s}`).join("\n")}\n\nVerify my certificate: ${cert.shareUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Pre-filled mailto: email link. */
export function buildEmailShareUrl(cert: EarnedCertificate): string {
  const subject = `My Javify Certificate — ${cert.title}`;
  const body = `Hi,\n\nI just earned the ${cert.title} on Javify 🎓\n\nSkills validated:\n${cert.skills.map(s => `  • ${s}`).join("\n")}\n\nAssessment score: ${cert.score}%\nCertificate ID: ${cert.certificateId}\nIssued: ${new Date(cert.issuedAt).toLocaleDateString()}\n\nView and verify my certificate:\n${cert.shareUrl}\n\nBest,\n${cert.userName}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildShareMessage(cert: EarnedCertificate): string {
  return `I just earned the ${cert.title} on Javify 🎓\n\nSkills gained:\n${cert.skills.map(s => `✓ ${s}`).join("\n")}\n\nCertificate ID: ${cert.certificateId}\nVerify: ${cert.verificationUrl}`;
}

/**
 * Produce a sanitized, meaningful download filename for the certificate.
 * Format: Certificate_<UserName>_<CourseName>.<ext>
 *
 * Spaces and special characters are replaced with underscores to ensure
 * cross-platform filename compatibility (Windows, macOS, Linux).
 */
export function buildCertificateFileName(cert: EarnedCertificate, extension: "png" | "pdf" | "txt"): string {
  const sanitize = (input: string) => input.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const userPart = sanitize(cert.userName) || "User";
  const coursePart = sanitize(cert.title) || "Certificate";
  return `Certificate_${userPart}_${coursePart}.${extension}`;
}

/**
 * Determine whether a certificate is shareable. Only valid, publicly-issued
 * certificates with a non-empty share URL are allowed to be shared.
 *
 * This is an authorization-style guard used on both client and server.
 */
export function isCertificateShareable(cert: EarnedCertificate | null | undefined): boolean {
  if (!cert) return false;
  if (!cert.shareUrl || !cert.certificateId) return false;
  if (!cert.userName || !cert.title) return false;
  return true;
}

export function buildGitHubReadmeUpdate(cert: EarnedCertificate): string {
  return `\n## 🏆 Earned: ${cert.title}\n\n- **Certificate ID:** ${cert.certificateId}\n- **Skills:** ${cert.skills.join(", ")}\n- **Score:** ${cert.score}%\n- **Date:** ${new Date(cert.issuedAt).toLocaleDateString()}\n- **Verify:** [${cert.certificateId}](${cert.verificationUrl})\n`;
}

// ── Sharing Achievements ────────────────────────────────────────────────────────
export const SHARING_ACHIEVEMENTS = [
  { id: "sa1", title: "📢 Shared Learner", description: "Shared your first certificate", badge: "📢", check: (totalShares: number) => totalShares >= 1 },
  { id: "sa2", title: "🌟 Community Star", description: "Shared 5 certificates", badge: "🌟", check: (totalShares: number) => totalShares >= 5 },
  { id: "sa3", title: "🎓 Certified Expert", description: "Earned all 4 certifications", badge: "🎓", check: (_totalShares: number, allTracksCompleted: boolean) => allTracksCompleted },
];

export function generateCertificateTextFile(cert: EarnedCertificate): string {
  const border = "═".repeat(55);
  return `
╔${border}╗
║                                                       ║
║              JAVIFY CERTIFICATE                       ║
║              OF COMPLETION                            ║
║                                                       ║
╠${border}╣
║                                                       ║
║  Awarded To:                                          ║
║  ${cert.userName.padEnd(53)}║
║                                                       ║
║  Certificate:                                         ║
║  ${cert.title.padEnd(53)}║
║                                                       ║
║  Skills Validated:                                    ║
${cert.skills.map(s => `║    ✓ ${s.padEnd(50)}║`).join("\n")}
║                                                       ║
║  Assessment Score: ${(cert.score + "%").padEnd(36)}║
║  Issue Date: ${new Date(cert.issuedAt).toLocaleDateString().padEnd(41)}║
║  Certificate ID: ${cert.certificateId.padEnd(37)}║
║                                                       ║
║  Verify: ${cert.verificationUrl.slice(0, 45).padEnd(45)}║
║  Share:  ${cert.shareUrl.slice(0, 45).padEnd(45)}║
║                                                       ║
╠${border}╣
║  Javify Platform · javify.dev                         ║
║  This certificate is digitally verifiable.            ║
╚${border}╝
`;
}

export interface AssessmentAttempt {
  trackId: string;
  answers: number[];
  score: number;
  passed: boolean;
  attemptedAt: number;
}

export interface CertState {
  earnedCertificates: EarnedCertificate[];
  assessmentAttempts: AssessmentAttempt[];
  activeAssessmentTrackId: string | null;
}

export const DEFAULT_CERT_STATE: CertState = {
  earnedCertificates: [],
  assessmentAttempts: [],
  activeAssessmentTrackId: null,
};

export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(10000 + Math.random() * 90000));
  return `JVF-${year}-${seq}`;
}

export function generateVerificationUrl(certId: string): string {
  return `${window.location.origin}/#/certificate/verify/${certId}`;
}

// ── Certification Tracks ─────────────────────────────────────────────────────

export const CERT_TRACKS: CertTrack[] = [
  {
    id: "java-foundation",
    title: "Java Foundation Certificate",
    icon: "📘",
    color: "from-cyan-500 to-blue-600",
    description: "Master the basics: variables, data types, operators, loops, conditionals, arrays, and strings.",
    skills: ["Variables", "Data Types", "Operators", "Loops", "Conditions", "Arrays", "Strings"],
    minScore: 80,
    prerequisiteTrackId: null,
    xpReward: 300,
    badge: "📘 Java Explorer",
    requirements: [
      { type: "challenges", label: "Complete 3 coding challenges", target: 3 },
      { type: "xp", label: "Earn 200 XP", target: 200 },
    ],
    assessmentQuestions: [
      { id: "jf1", type: "mcq", topic: "Variables", question: "Which keyword declares a constant in Java?", options: ["const", "static", "final", "define"], correctIndex: 2, explanation: "'final' makes a variable constant — its value cannot be changed after initialization.", points: 10 },
      { id: "jf2", type: "output", topic: "Operators", question: "What does `System.out.println(10 % 3);` print?", options: ["3", "1", "3.33", "0"], correctIndex: 1, explanation: "The modulus operator (%) returns the remainder. 10 / 3 = 3 remainder 1.", points: 10 },
      { id: "jf3", type: "mcq", topic: "Loops", question: "Which loop always executes at least once?", options: ["for", "while", "do-while", "foreach"], correctIndex: 2, explanation: "A do-while loop checks the condition AFTER the body, guaranteeing at least one execution.", points: 10 },
      { id: "jf4", type: "debug", topic: "Arrays", question: "What is wrong with: `int[] arr = new int[3]; arr[3] = 5;`?", code: "int[] arr = new int[3];\narr[3] = 5;", options: ["Missing semicolon", "Wrong type", "ArrayIndexOutOfBoundsException", "Nothing wrong"], correctIndex: 2, explanation: "Array of size 3 has valid indices 0, 1, 2. Index 3 is out of bounds.", points: 15 },
      { id: "jf5", type: "output", topic: "Strings", question: 'What does `"Hello".length()` return?', options: ["4", "5", "6", "Error"], correctIndex: 1, explanation: "'Hello' has 5 characters (H-e-l-l-o). The length() method counts all characters.", points: 10 },
      { id: "jf6", type: "mcq", topic: "Conditions", question: "Which operator checks if two values are NOT equal?", options: ["==", "!=", "<>", "!=="], correctIndex: 1, explanation: "In Java, != is the not-equal operator for primitives.", points: 10 },
      { id: "jf7", type: "debug", topic: "Loops", question: "What bug does this code have?\nint i = 0;\nwhile (i < 5) {\n  System.out.println(i);\n}", code: "int i = 0;\nwhile (i < 5) {\n  System.out.println(i);\n}", options: ["Syntax error", "Infinite loop — i never increments", "Wrong condition", "Missing return"], correctIndex: 1, explanation: "Variable 'i' is never incremented inside the loop, causing it to run forever.", points: 15 },
      { id: "jf8", type: "output", topic: "Data Types", question: "What is the value of `(int) 9.7`?", options: ["9", "10", "9.7", "Error"], correctIndex: 0, explanation: "Casting a double to int truncates (drops) the decimal part. 9.7 → 9.", points: 10 },
      { id: "jf9", type: "mcq", topic: "Variables", question: "Which is a valid variable name in Java?", options: ["2name", "my-var", "_count", "class"], correctIndex: 2, explanation: "Java variable names can start with a letter, underscore, or $. They cannot start with a number or be a reserved word.", points: 10 },
      { id: "jf10", type: "output", topic: "Arrays", question: "What does `new int[5]` contain by default?", options: ["null", "0, 0, 0, 0, 0", "undefined", "Empty"], correctIndex: 1, explanation: "Java initializes int arrays with zeros by default.", points: 10 },
    ],
  },
  {
    id: "java-intermediate",
    title: "Java Intermediate Certificate",
    icon: "📗",
    color: "from-emerald-500 to-teal-600",
    description: "Prove your skills in OOP, inheritance, interfaces, collections, and exception handling.",
    skills: ["OOP", "Inheritance", "Interfaces", "Collections", "Exception Handling"],
    minScore: 80,
    prerequisiteTrackId: "java-foundation",
    xpReward: 500,
    badge: "📗 Java Specialist",
    requirements: [
      { type: "challenges", label: "Complete 5 coding challenges", target: 5 },
      { type: "xp", label: "Earn 500 XP", target: 500 },
    ],
    assessmentQuestions: [
      { id: "ji1", type: "mcq", topic: "OOP", question: "Which keyword creates an object from a class?", options: ["create", "new", "make", "init"], correctIndex: 1, explanation: "'new' allocates memory and invokes the constructor to create an object.", points: 10 },
      { id: "ji2", type: "mcq", topic: "Inheritance", question: "Which keyword is used for inheritance?", options: ["inherits", "implements", "extends", "uses"], correctIndex: 2, explanation: "'extends' creates an IS-A relationship between a subclass and superclass.", points: 10 },
      { id: "ji3", type: "debug", topic: "Exceptions", question: "What happens when this runs?\nint x = 10 / 0;", code: "int x = 10 / 0;", options: ["x = 0", "ArithmeticException", "x = Infinity", "Compilation error"], correctIndex: 1, explanation: "Dividing by zero with integers throws ArithmeticException at runtime.", points: 15 },
      { id: "ji4", type: "mcq", topic: "Collections", question: "Which collection allows duplicate elements and maintains insertion order?", options: ["HashSet", "TreeSet", "ArrayList", "HashMap"], correctIndex: 2, explanation: "ArrayList allows duplicates and preserves insertion order.", points: 10 },
      { id: "ji5", type: "output", topic: "OOP", question: "If class Dog extends Animal, what is the IS-A relationship?", options: ["Dog IS-A Method", "Dog IS-A Interface", "Dog IS-A Animal", "Dog IS-A Object only"], correctIndex: 2, explanation: "Inheritance creates an IS-A relationship. Dog IS-A Animal through extends.", points: 10 },
      { id: "ji6", type: "mcq", topic: "Interfaces", question: "A class uses which keyword to implement an interface?", options: ["extends", "implements", "uses", "inherits"], correctIndex: 1, explanation: "'implements' tells the compiler the class will provide all interface methods.", points: 10 },
      { id: "ji7", type: "debug", topic: "Collections", question: "What's wrong?\nList list = new ArrayList();\nlist.add(\"hello\");\nint x = (int) list.get(0);", code: 'List list = new ArrayList();\nlist.add("hello");\nint x = (int) list.get(0);', options: ["Compilation error", "ClassCastException", "NullPointerException", "Nothing"], correctIndex: 1, explanation: "Cannot cast String to int — ClassCastException. Use generics: List<String>.", points: 15 },
      { id: "ji8", type: "mcq", topic: "OOP", question: "Which access modifier makes a field visible only within its class?", options: ["public", "protected", "default", "private"], correctIndex: 3, explanation: "'private' restricts access to the declaring class only — core encapsulation.", points: 10 },
      { id: "ji9", type: "output", topic: "Exceptions", question: "Which block ALWAYS runs whether or not an exception occurs?", options: ["try", "catch", "throw", "finally"], correctIndex: 3, explanation: "'finally' always executes — ideal for cleanup code like closing files.", points: 10 },
      { id: "ji10", type: "mcq", topic: "Inheritance", question: "Can a class extend multiple classes in Java?", options: ["Yes", "No", "Only with interfaces", "Only abstract classes"], correctIndex: 1, explanation: "Java does NOT support multiple inheritance of classes. Use interfaces instead.", points: 10 },
    ],
  },
  {
    id: "java-advanced",
    title: "Java Advanced Certificate",
    icon: "📙",
    color: "from-violet-500 to-purple-600",
    description: "Demonstrate mastery in data structures, algorithms, multithreading, and optimization.",
    skills: ["DSA", "Multithreading", "Design Patterns", "Optimization", "Problem Solving"],
    minScore: 80,
    prerequisiteTrackId: "java-intermediate",
    xpReward: 800,
    badge: "📙 Advanced Developer",
    requirements: [
      { type: "challenges", label: "Complete 7 coding challenges", target: 7 },
      { type: "xp", label: "Earn 800 XP", target: 800 },
    ],
    assessmentQuestions: [
      { id: "ja1", type: "mcq", topic: "DSA", question: "What is the time complexity of binary search?", options: ["O(n)", "O(n²)", "O(log n)", "O(1)"], correctIndex: 2, explanation: "Binary search halves the search space each step — O(log n).", points: 12 },
      { id: "ja2", type: "mcq", topic: "Multithreading", question: "Which keyword prevents race conditions in Java?", options: ["volatile", "synchronized", "static", "transient"], correctIndex: 1, explanation: "'synchronized' ensures only one thread can access a block/method at a time.", points: 12 },
      { id: "ja3", type: "output", topic: "DSA", question: "What does a Stack follow?", options: ["FIFO", "LIFO", "Random", "Priority"], correctIndex: 1, explanation: "Stack = Last-In, First-Out. The most recently added element is removed first.", points: 10 },
      { id: "ja4", type: "debug", topic: "Optimization", question: "What's inefficient here?\nString s = \"\";\nfor(int i=0; i<10000; i++) s += i;", code: 'String s = "";\nfor(int i=0; i<10000; i++) s += i;', options: ["Nothing wrong", "String concatenation in loop creates O(n²) objects", "Missing semicolon", "Wrong variable type"], correctIndex: 1, explanation: "Each += creates a new String object. Use StringBuilder for O(n) performance.", points: 15 },
      { id: "ja5", type: "mcq", topic: "Design Patterns", question: "Which pattern ensures only ONE instance of a class exists?", options: ["Factory", "Observer", "Singleton", "Strategy"], correctIndex: 2, explanation: "Singleton restricts instantiation to one object — useful for shared resources.", points: 12 },
      { id: "ja6", type: "mcq", topic: "DSA", question: "Which sorting algorithm has O(n log n) average case?", options: ["Bubble Sort", "Selection Sort", "Merge Sort", "Insertion Sort"], correctIndex: 2, explanation: "Merge Sort divides and conquers — always O(n log n) regardless of input.", points: 12 },
      { id: "ja7", type: "output", topic: "Multithreading", question: "What does Thread.sleep(1000) do?", options: ["Kills the thread", "Pauses for 1 second", "Starts a new thread", "Nothing"], correctIndex: 1, explanation: "Thread.sleep(1000) pauses the current thread for 1000ms (1 second).", points: 10 },
      { id: "ja8", type: "debug", topic: "DSA", question: "What's the issue?\nint[] arr = {3,1,4,1,5};\nArrays.sort(arr);\nint idx = Arrays.binarySearch(arr, 4);\n// returns correct index", code: "// Code assumes array is sorted for binarySearch\n// What if we forget to sort?", options: ["Nothing wrong", "binarySearch requires sorted array first", "Wrong return type", "Missing import"], correctIndex: 1, explanation: "Arrays.binarySearch REQUIRES a sorted array. Unsorted input gives undefined results.", points: 15 },
    ],
  },
  {
    id: "java-master",
    title: "Java Master Certification",
    icon: "🏆",
    color: "from-amber-500 to-yellow-600",
    description: "The ultimate certification — prove mastery across all Java domains.",
    skills: ["Full Stack Java", "System Design", "Algorithm Mastery", "Clean Code", "Production Readiness"],
    minScore: 85,
    prerequisiteTrackId: "java-advanced",
    xpReward: 1500,
    badge: "🏆 Java Master",
    requirements: [
      { type: "challenges", label: "Complete 9 coding challenges", target: 9 },
      { type: "xp", label: "Earn 1500 XP", target: 1500 },
      { type: "streak", label: "Maintain 7-day streak", target: 7 },
    ],
    assessmentQuestions: [
      { id: "jm1", type: "mcq", topic: "System Design", question: "Which principle states 'a class should have only one reason to change'?", options: ["Open/Closed", "Liskov Substitution", "Single Responsibility", "Dependency Inversion"], correctIndex: 2, explanation: "SRP — each class handles one concern, making code easier to maintain.", points: 15 },
      { id: "jm2", type: "debug", topic: "Clean Code", question: "What code smell is this?\npublic void process(int type) {\n  if(type==1) {...}\n  else if(type==2) {...}\n  else if(type==3) {...}\n}", code: "public void process(int type) {\n  if(type==1) {...}\n  else if(type==2) {...}\n  else if(type==3) {...}\n}", options: ["No issue", "Long if-else chain — use polymorphism or strategy pattern", "Missing default", "Wrong variable name"], correctIndex: 1, explanation: "Long if-else chains violate Open/Closed principle. Use polymorphism or Strategy pattern.", points: 15 },
      { id: "jm3", type: "mcq", topic: "Algorithm Mastery", question: "What is the space complexity of recursive fibonacci without memoization?", options: ["O(1)", "O(n)", "O(n²)", "O(2ⁿ)"], correctIndex: 1, explanation: "Recursive call stack depth is O(n) — one frame per level of recursion.", points: 15 },
      { id: "jm4", type: "mcq", topic: "Production Readiness", question: "Which is NOT a SOLID principle?", options: ["Single Responsibility", "Open/Closed", "Liskov Substitution", "Don't Repeat Yourself"], correctIndex: 3, explanation: "DRY is important but not one of the five SOLID principles (SRP, OCP, LSP, ISP, DIP).", points: 15 },
      { id: "jm5", type: "output", topic: "System Design", question: "In MVC, what component handles user input?", options: ["Model", "View", "Controller", "Service"], correctIndex: 2, explanation: "Controller receives user input, processes it, and updates Model/View accordingly.", points: 12 },
      { id: "jm6", type: "mcq", topic: "Full Stack Java", question: "Which Java framework is most used for building REST APIs?", options: ["JavaFX", "Swing", "Spring Boot", "Applet"], correctIndex: 2, explanation: "Spring Boot is the industry standard for building Java REST APIs and microservices.", points: 12 },
      { id: "jm7", type: "debug", topic: "Algorithm Mastery", question: "What is wrong with this HashMap usage?\nMap<int, String> map = new HashMap<>();", code: "Map<int, String> map = new HashMap<>();", options: ["Nothing wrong", "Generics require wrapper types — use Integer not int", "Wrong import", "Missing semicolon"], correctIndex: 1, explanation: "Java generics only work with reference types. Use Integer instead of int.", points: 15 },
      { id: "jm8", type: "mcq", topic: "Clean Code", question: "What is the ideal maximum length of a method according to clean code principles?", options: ["500 lines", "100 lines", "20-30 lines", "1 line"], correctIndex: 2, explanation: "Clean methods should be short (20-30 lines), do one thing, and have descriptive names.", points: 12 },
    ],
  },
];

export function getTrackById(id: string): CertTrack | undefined {
  return CERT_TRACKS.find(t => t.id === id);
}
