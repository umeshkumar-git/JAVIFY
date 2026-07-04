// ============================================================
// Javify Mini Games Arena — Structured Data & Game Definitions
// ============================================================

export type GameCategory = "quick" | "coding" | "story" | "multiplayer" | "daily";
export type GameDifficulty = "easy" | "medium" | "hard" | "boss";

export interface GameReward { xp: number; coins: number; badge?: string; }

export interface MemoryCard {
  id: string;
  front: string;
  back: string;
  category: string;
}

export interface BugSnippet {
  id: string;
  title: string;
  code: string;
  errorLine: number;
  errorType: "syntax" | "logic" | "runtime";
  hint: string;
  explanation: string;
  fixedCode: string;
  topic: string;
}

export interface AlgorithmStep {
  id: string;
  text: string;
  order: number;
}

export interface AlgorithmPuzzle {
  id: string;
  title: string;
  description: string;
  topic: string;
  steps: AlgorithmStep[];
}

export interface LogicPuzzle {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface StoryWorld {
  id: string;
  name: string;
  icon: string;
  topic: string;
  description: string;
  color: string;
  missions: StoryMission[];
  locked: boolean;
  requiredXp: number;
}

export interface StoryMission {
  id: string;
  title: string;
  type: "memory" | "bug" | "logic" | "algorithm" | "boss";
  description: string;
  reward: GameReward;
  isBoss: boolean;
}

export interface DailyChallenge {
  id: string;
  title: string;
  type: "memory" | "bug" | "logic" | "algorithm";
  reward: GameReward;
  expiresAt: number;
}

// ── Memory Match Cards ────────────────────────────────────────────────────────
export const MEMORY_CARDS: MemoryCard[] = [
  { id: "m1", front: "int x = 5;", back: "Integer variable", category: "Variables" },
  { id: "m2", front: "String s = \"Hi\";", back: "Text variable", category: "Variables" },
  { id: "m3", front: "boolean b = true;", back: "True/False value", category: "Variables" },
  { id: "m4", front: "double d = 3.14;", back: "Decimal number", category: "Variables" },
  { id: "m5", front: "for (int i=0; i<5; i++)", back: "Count loop", category: "Loops" },
  { id: "m6", front: "while (x > 0)", back: "Conditional loop", category: "Loops" },
  { id: "m7", front: "int[] arr = new int[5]", back: "Array declaration", category: "Arrays" },
  { id: "m8", front: "arr.length", back: "Array size", category: "Arrays" },
  { id: "m9", front: "if (x > 0)", back: "Positive check", category: "Conditionals" },
  { id: "m10", front: "x == y", back: "Equality check", category: "Conditionals" },
  { id: "m11", front: "System.out.println()", back: "Print output", category: "I/O" },
  { id: "m12", front: "return value;", back: "Exit method", category: "Methods" },
  { id: "m13", front: "new ClassName()", back: "Create object", category: "OOP" },
  { id: "m14", front: "extends", back: "Inheritance", category: "OOP" },
  { id: "m15", front: "try { } catch { }", back: "Error handling", category: "Exceptions" },
  { id: "m16", front: "ArrayList<T>", back: "Dynamic list", category: "Collections" },
];

// ── Bug Hunt Snippets ─────────────────────────────────────────────────────────
export const BUG_SNIPPETS: BugSnippet[] = [
  {
    id: "b1", title: "The Missing Semicolon", errorLine: 3, errorType: "syntax", topic: "Syntax",
    code: `public class Main {
  public static void main(String[] args) {
    int x = 5
    System.out.println(x);
  }
}`,
    hint: "Every Java statement ends with a specific character.",
    explanation: "Line 3 is missing a semicolon (;). Java requires a semicolon at the end of every statement.",
    fixedCode: `public class Main {
  public static void main(String[] args) {
    int x = 5;
    System.out.println(x);
  }
}`,
  },
  {
    id: "b2", title: "Off-By-One Error", errorLine: 3, errorType: "logic", topic: "Arrays",
    code: `int[] arr = {1, 2, 3, 4, 5};
for (int i = 0; i <= arr.length; i++) {
  System.out.println(arr[i]);
}`,
    hint: "Array indexes go from 0 to length MINUS one.",
    explanation: "Using <= arr.length causes ArrayIndexOutOfBoundsException. Should be < arr.length.",
    fixedCode: `int[] arr = {1, 2, 3, 4, 5};
for (int i = 0; i < arr.length; i++) {
  System.out.println(arr[i]);
}`,
  },
  {
    id: "b3", title: "Wrong Comparison", errorLine: 2, errorType: "logic", topic: "Strings",
    code: `String name = "Java";
if (name == "Java") {
  System.out.println("Match!");
}`,
    hint: "Primitives use ==, but Objects need a different comparison method.",
    explanation: "Strings are objects. Use .equals() to compare content, not ==.",
    fixedCode: `String name = "Java";
if (name.equals("Java")) {
  System.out.println("Match!");
}`,
  },
  {
    id: "b4", title: "Infinite Loop", errorLine: 1, errorType: "logic", topic: "Loops",
    code: `int i = 0;
while (i < 10) {
  System.out.println(i);
}`,
    hint: "The loop runs forever. Something must change inside the loop.",
    explanation: "Variable i never changes, creating an infinite loop. Add i++ inside the loop.",
    fixedCode: `int i = 0;
while (i < 10) {
  System.out.println(i);
  i++;
}`,
  },
  {
    id: "b5", title: "NullPointerException", errorLine: 2, errorType: "runtime", topic: "Objects",
    code: `String s = null;
int len = s.length();
System.out.println(len);`,
    hint: "Check if a variable is null before using it.",
    explanation: "Calling .length() on a null String throws NullPointerException. Check for null first.",
    fixedCode: `String s = null;
if (s != null) {
  int len = s.length();
  System.out.println(len);
}`,
  },
  {
    id: "b6", title: "Integer Division", errorLine: 1, errorType: "logic", topic: "Operators",
    code: `int result = 7 / 2;
System.out.println(result); // Expected 3.5`,
    hint: "Integer division truncates the decimal part.",
    explanation: "7/2 in integer math equals 3, not 3.5. Cast to double for decimal division.",
    fixedCode: `double result = 7.0 / 2;
System.out.println(result); // 3.5`,
  },
];

// ── Algorithm Puzzles ─────────────────────────────────────────────────────────
export const ALGORITHM_PUZZLES: AlgorithmPuzzle[] = [
  {
    id: "ap1", title: "Bubble Sort Steps", description: "Arrange the steps of Bubble Sort in order.", topic: "Sorting",
    steps: [
      { id: "s1", text: "Start at the first element of the array", order: 1 },
      { id: "s2", text: "Compare adjacent elements (i and i+1)", order: 2 },
      { id: "s3", text: "If the left is greater, swap them", order: 3 },
      { id: "s4", text: "Move to the next pair of elements", order: 4 },
      { id: "s5", text: "Repeat passes until no swaps occur", order: 5 },
    ],
  },
  {
    id: "ap2", title: "Binary Search Steps", description: "Order the steps of Binary Search correctly.", topic: "Searching",
    steps: [
      { id: "s1", text: "Ensure the array is sorted", order: 1 },
      { id: "s2", text: "Set low = 0 and high = length - 1", order: 2 },
      { id: "s3", text: "Find mid = (low + high) / 2", order: 3 },
      { id: "s4", text: "If target == arr[mid], return mid", order: 4 },
      { id: "s5", text: "If target < arr[mid], set high = mid - 1", order: 5 },
      { id: "s6", text: "If target > arr[mid], set low = mid + 1", order: 6 },
    ],
  },
  {
    id: "ap3", title: "Stack Push & Pop", description: "Order the steps for Stack operations.", topic: "Data Structures",
    steps: [
      { id: "s1", text: "Create a Stack data structure", order: 1 },
      { id: "s2", text: "Push element onto the top", order: 2 },
      { id: "s3", text: "Check if stack is empty before pop", order: 3 },
      { id: "s4", text: "Pop element from the top", order: 4 },
      { id: "s5", text: "Peek at the top without removing", order: 5 },
    ],
  },
];

// ── Logic Puzzles ─────────────────────────────────────────────────────────────
export const LOGIC_PUZZLES: LogicPuzzle[] = [
  {
    id: "lp1", topic: "Variables",
    question: "What will System.out.println(5 + 3 + \"Java\") print?",
    options: ["53Java", "8Java", "5+3Java", "Error"],
    correctIndex: 1,
    explanation: "Java evaluates left to right. 5+3=8 (both ints), then 8+\"Java\"=\"8Java\".",
  },
  {
    id: "lp2", topic: "Arrays",
    question: "What is the index of the last element in an array of size 10?",
    options: ["10", "9", "1", "0"],
    correctIndex: 1,
    explanation: "Arrays are 0-indexed. An array of size 10 has indices 0 through 9.",
  },
  {
    id: "lp3", topic: "OOP",
    question: "Which keyword creates an instance of a class?",
    options: ["class", "static", "new", "this"],
    correctIndex: 2,
    explanation: "The 'new' keyword allocates memory and creates an object from a class blueprint.",
  },
  {
    id: "lp4", topic: "Loops",
    question: "How many times does this loop execute? for(int i=1; i<=5; i++)",
    options: ["4", "5", "6", "∞"],
    correctIndex: 1,
    explanation: "i starts at 1 and goes to 5 inclusive (1,2,3,4,5) = 5 iterations.",
  },
  {
    id: "lp5", topic: "Exceptions",
    question: "Which block always runs whether or not an exception occurs?",
    options: ["try", "catch", "throw", "finally"],
    correctIndex: 3,
    explanation: "The 'finally' block always executes — perfect for cleanup code.",
  },
  {
    id: "lp6", topic: "Collections",
    question: "Which collection allows duplicate elements and maintains insertion order?",
    options: ["HashSet", "TreeSet", "ArrayList", "HashMap"],
    correctIndex: 2,
    explanation: "ArrayList allows duplicates and maintains the order elements were added.",
  },
  {
    id: "lp7", topic: "Recursion",
    question: "What does a recursive method ALWAYS need to avoid infinite calls?",
    options: ["A return type", "A base case", "A loop", "Static keyword"],
    correctIndex: 1,
    explanation: "Every recursive method needs a base case — a condition to stop calling itself.",
  },
  {
    id: "lp8", topic: "Inheritance",
    question: "If class Dog extends Animal, Dog IS-A ___?",
    options: ["Method", "Interface", "Animal", "Object only"],
    correctIndex: 2,
    explanation: "Inheritance creates an IS-A relationship. Dog IS-A Animal.",
  },
];

// ── Story Mode Worlds ─────────────────────────────────────────────────────────
export const STORY_WORLDS: StoryWorld[] = [
  {
    id: "w1", name: "Java Village", icon: "🏘️", topic: "Basics", requiredXp: 0, locked: false,
    color: "from-emerald-500 to-teal-500",
    description: "Master the foundations: variables, operators, and control flow in this peaceful starting village.",
    missions: [
      { id: "w1m1", title: "Variable Quest", type: "memory", description: "Learn variable types through memory matching.", reward: { xp: 15, coins: 8 }, isBoss: false },
      { id: "w1m2", title: "Operator Oracle", type: "logic", description: "Solve logic puzzles about Java operators.", reward: { xp: 20, coins: 12 }, isBoss: false },
      { id: "w1m3", title: "Loop Labyrinth", type: "algorithm", description: "Order loop algorithm steps correctly.", reward: { xp: 25, coins: 15 }, isBoss: false },
      { id: "w1m4", title: "🐉 Village Dragon Boss", type: "boss", description: "Face 3 timed bug-fix challenges to defeat the boss!", reward: { xp: 80, coins: 40, badge: "Village Hero" }, isBoss: true },
    ],
  },
  {
    id: "w2", name: "Array Forest", icon: "🌲", topic: "Arrays", requiredXp: 150, locked: true,
    color: "from-cyan-500 to-blue-500",
    description: "Navigate dense forests of arrays. Learn traversal, indexing, and searching.",
    missions: [
      { id: "w2m1", title: "Index Trail", type: "logic", description: "Master array indexing with logic puzzles.", reward: { xp: 20, coins: 12 }, isBoss: false },
      { id: "w2m2", title: "Off-By-One Swamp", type: "bug", description: "Fix off-by-one errors lurking in the swamp.", reward: { xp: 25, coins: 15 }, isBoss: false },
      { id: "w2m3", title: "Sort Stream", type: "algorithm", description: "Order the steps of array sorting algorithms.", reward: { xp: 30, coins: 18 }, isBoss: false },
      { id: "w2m4", title: "🐲 Array Dragon Boss", type: "boss", description: "Fix 4 array bugs before time runs out!", reward: { xp: 100, coins: 55, badge: "Array Warrior" }, isBoss: true },
    ],
  },
  {
    id: "w3", name: "String Castle", icon: "🏰", topic: "Strings", requiredXp: 350, locked: true,
    color: "from-violet-500 to-fuchsia-500",
    description: "Explore the mystical castle of String manipulation, patterns, and methods.",
    missions: [
      { id: "w3m1", title: "String Comparison Chamber", type: "bug", description: "Find == vs .equals() bugs.", reward: { xp: 25, coins: 15 }, isBoss: false },
      { id: "w3m2", title: "Pattern Puzzle Tower", type: "logic", description: "Predict string operation results.", reward: { xp: 30, coins: 18 }, isBoss: false },
      { id: "w3m3", title: "StringBuilder Dungeon", type: "memory", description: "Match String methods to their effects.", reward: { xp: 30, coins: 18 }, isBoss: false },
      { id: "w3m4", title: "🧙 String Wizard Boss", type: "boss", description: "Answer 5 string challenges under pressure!", reward: { xp: 120, coins: 65, badge: "String Mage" }, isBoss: true },
    ],
  },
  {
    id: "w4", name: "OOP Kingdom", icon: "⚔️", topic: "OOP", requiredXp: 600, locked: true,
    color: "from-amber-500 to-orange-500",
    description: "Conquer the Object-Oriented Kingdom. Master classes, inheritance, and polymorphism.",
    missions: [
      { id: "w4m1", title: "Class Blueprint", type: "memory", description: "Match OOP concepts with definitions.", reward: { xp: 30, coins: 18 }, isBoss: false },
      { id: "w4m2", title: "Inheritance Battlefield", type: "logic", description: "Predict inheritance outcomes.", reward: { xp: 35, coins: 22 }, isBoss: false },
      { id: "w4m3", title: "Polymorphism Palace", type: "algorithm", description: "Order OOP design steps.", reward: { xp: 40, coins: 25 }, isBoss: false },
      { id: "w4m4", title: "👑 OOP Emperor Boss", type: "boss", description: "Solve 5 OOP challenges to claim the throne!", reward: { xp: 150, coins: 80, badge: "OOP Knight" }, isBoss: true },
    ],
  },
  {
    id: "w5", name: "DSA Dungeon", icon: "🕳️", topic: "Data Structures", requiredXp: 900, locked: true,
    color: "from-rose-500 to-pink-500",
    description: "Descend into the deepest dungeon of stacks, queues, trees, and graphs.",
    missions: [
      { id: "w5m1", title: "Stack Cavern", type: "algorithm", description: "Master stack push/pop operations.", reward: { xp: 40, coins: 25 }, isBoss: false },
      { id: "w5m2", title: "Queue Corridor", type: "logic", description: "Predict queue operation results.", reward: { xp: 45, coins: 28 }, isBoss: false },
      { id: "w5m3", title: "Tree Temple", type: "memory", description: "Match tree traversal types to outputs.", reward: { xp: 45, coins: 28 }, isBoss: false },
      { id: "w5m4", title: "💀 DSA Overlord Boss", type: "boss", description: "Face the ultimate data structure gauntlet!", reward: { xp: 200, coins: 100, badge: "DSA Master" }, isBoss: true },
    ],
  },
];

// ── Daily Challenges ──────────────────────────────────────────────────────────
export function getDailyChallenge(): DailyChallenge {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const types: DailyChallenge["type"][] = ["memory", "bug", "logic", "algorithm"];
  const type = types[dayOfYear % types.length];
  const titles = { memory: "Daily Memory Sprint", bug: "Daily Bug Hunt", logic: "Daily Logic Duel", algorithm: "Daily Algorithm Arrange" };
  const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
  return {
    id: `daily-${dayOfYear}`,
    title: titles[type],
    type,
    reward: { xp: 50, coins: 25, badge: "Daily Champ" },
    expiresAt: tomorrow.getTime(),
  };
}

// ── Achievements ──────────────────────────────────────────────────────────────
export const ARENA_ACHIEVEMENTS = [
  { id: "aa1", title: "Puzzle Master", description: "Complete 10 Logic Puzzles", badge: "🧩", check: (s: ArenaStats) => s.logicPuzzlesCompleted >= 10 },
  { id: "aa2", title: "Bug Hunter", description: "Find and fix 10 bugs", badge: "🐞", check: (s: ArenaStats) => s.bugsFixed >= 10 },
  { id: "aa3", title: "Algorithm Warrior", description: "Complete 5 Algorithm Arrange puzzles", badge: "⚔️", check: (s: ArenaStats) => s.algorithmsCompleted >= 5 },
  { id: "aa4", title: "Memory Champion", description: "Finish 5 Memory Match games", badge: "🧠", check: (s: ArenaStats) => s.memoryGamesCompleted >= 5 },
  { id: "aa5", title: "Story Explorer", description: "Complete World 1: Java Village", badge: "🗺️", check: (s: ArenaStats) => s.worldsCompleted.includes("w1") },
  { id: "aa6", title: "Game Champion", description: "Earn 500 XP from Mini Games", badge: "🏆", check: (s: ArenaStats) => s.totalXpEarned >= 500 },
  { id: "aa7", title: "Daily Dedication", description: "Complete 7 Daily Challenges", badge: "📅", check: (s: ArenaStats) => s.dailyChallengesCompleted >= 7 },
  { id: "aa8", title: "Mini Game Legend", description: "Earn 1000 XP from Mini Games", badge: "🎮", check: (s: ArenaStats) => s.totalXpEarned >= 1000 },
];

export interface ArenaStats {
  memoryGamesCompleted: number;
  bugsFixed: number;
  algorithmsCompleted: number;
  logicPuzzlesCompleted: number;
  worldsCompleted: string[];
  totalXpEarned: number;
  dailyChallengesCompleted: number;
  gamesPlayed: number;
}

export const DEFAULT_ARENA_STATS: ArenaStats = {
  memoryGamesCompleted: 0,
  bugsFixed: 0,
  algorithmsCompleted: 0,
  logicPuzzlesCompleted: 0,
  worldsCompleted: [],
  totalXpEarned: 0,
  dailyChallengesCompleted: 0,
  gamesPlayed: 0,
};
