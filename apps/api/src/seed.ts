import { db } from "./db";
import { lessons, items, itemTranslations, tags, itemTags } from "./db/schema";

const seedLessons = [
  {
    id: 1,
    title: "Les salutations",
    description: "Apprenez à saluer en tunisien",
    icon: "👋",
    orderIndex: 1,
  },
  {
    id: 2,
    title: "Les chiffres",
    description: "Comptez de 1 à 10",
    icon: "🔢",
    orderIndex: 2,
  },
  {
    id: 3,
    title: "Les questions",
    description: "Posez des questions basiques",
    icon: "❓",
    orderIndex: 3,
  },
];

const seedTags = [
  { id: 1, name: "formel", color: "#3B82F6" },
  { id: 2, name: "informel", color: "#10B981" },
  { id: 3, name: "courant", color: "#F59E0B" },
  { id: 4, name: "nombre", color: "#8B5CF6" },
  { id: 5, name: "question", color: "#EF4444" },
  { id: 6, name: "salutation", color: "#EC4899" },
];

const seedItems = [
  {
    id: 1,
    lessonId: 1,
    type: "phrase" as const,
    tunisian: "Aslema",
    difficulty: 1,
    orderIndex: 1,
    translation: "Bonjour / Salut",
    tagIds: [2, 3, 6],
  },
  {
    id: 2,
    lessonId: 1,
    type: "phrase" as const,
    tunisian: "Sabbah el khir",
    difficulty: 1,
    orderIndex: 2,
    translation: "Bonjour (matin)",
    tagIds: [1, 6],
  },
  {
    id: 3,
    lessonId: 1,
    type: "phrase" as const,
    tunisian: "Msa el khir",
    difficulty: 1,
    orderIndex: 3,
    translation: "Bonsoir",
    tagIds: [1, 6],
  },
  {
    id: 4,
    lessonId: 1,
    type: "phrase" as const,
    tunisian: "Labes?",
    difficulty: 1,
    orderIndex: 4,
    translation: "Ca va ?",
    tagIds: [2, 3, 6],
  },
  {
    id: 5,
    lessonId: 1,
    type: "phrase" as const,
    tunisian: "Labes, hamdoullah",
    difficulty: 1,
    orderIndex: 5,
    translation: "Ca va, Dieu merci",
    tagIds: [3, 6],
  },
  {
    id: 6,
    lessonId: 1,
    type: "phrase" as const,
    tunisian: "Bislema",
    difficulty: 1,
    orderIndex: 6,
    translation: "Au revoir",
    tagIds: [2, 3, 6],
  },
  {
    id: 7,
    lessonId: 2,
    type: "word" as const,
    tunisian: "Wahed",
    difficulty: 1,
    orderIndex: 1,
    translation: "Un (1)",
    tagIds: [4],
  },
  {
    id: 8,
    lessonId: 2,
    type: "word" as const,
    tunisian: "Zouz",
    difficulty: 1,
    orderIndex: 2,
    translation: "Deux (2)",
    tagIds: [4],
  },
  {
    id: 9,
    lessonId: 2,
    type: "word" as const,
    tunisian: "Tletha",
    difficulty: 1,
    orderIndex: 3,
    translation: "Trois (3)",
    tagIds: [4],
  },
  {
    id: 10,
    lessonId: 2,
    type: "word" as const,
    tunisian: "Arb3a",
    difficulty: 1,
    orderIndex: 4,
    translation: "Quatre (4)",
    tagIds: [4],
  },
  {
    id: 11,
    lessonId: 2,
    type: "word" as const,
    tunisian: "5amsa",
    difficulty: 1,
    orderIndex: 5,
    translation: "Cinq (5)",
    tagIds: [4],
  },
  {
    id: 12,
    lessonId: 3,
    type: "phrase" as const,
    tunisian: "Chnou?",
    difficulty: 1,
    orderIndex: 1,
    translation: "Quoi ?",
    tagIds: [3, 5],
  },
  {
    id: 13,
    lessonId: 3,
    type: "phrase" as const,
    tunisian: "Winou?",
    difficulty: 1,
    orderIndex: 2,
    translation: "Ou ?",
    tagIds: [3, 5],
  },
  {
    id: 14,
    lessonId: 3,
    type: "phrase" as const,
    tunisian: "9addech?",
    difficulty: 1,
    orderIndex: 3,
    translation: "Combien ?",
    tagIds: [3, 5],
  },
  {
    id: 15,
    lessonId: 3,
    type: "phrase" as const,
    tunisian: "3lech?",
    difficulty: 1,
    orderIndex: 4,
    translation: "Pourquoi ?",
    tagIds: [3, 5],
  },
  {
    id: 16,
    lessonId: 3,
    type: "phrase" as const,
    tunisian: "Kifech?",
    difficulty: 1,
    orderIndex: 5,
    translation: "Comment ?",
    tagIds: [3, 5],
  },
  {
    id: 17,
    lessonId: 3,
    type: "phrase" as const,
    tunisian: "Chkoun?",
    difficulty: 2,
    orderIndex: 6,
    translation: "Qui ?",
    tagIds: [3, 5],
  },
  {
    id: 18,
    lessonId: 3,
    type: "phrase" as const,
    tunisian: "Wa9tech?",
    difficulty: 2,
    orderIndex: 7,
    translation: "Quand ?",
    tagIds: [3, 5],
  },
];

async function seed() {
  console.log("Seeding database...");
  await db.delete(itemTags);
  await db.delete(itemTranslations);
  await db.delete(items);
  await db.delete(tags);
  await db.delete(lessons);

  await db.insert(lessons).values(seedLessons);
  await db.insert(tags).values(seedTags);

  for (const item of seedItems) {
    const { translation, tagIds, ...itemData } = item;
    await db.insert(items).values(itemData);
    await db
      .insert(itemTranslations)
      .values({ itemId: item.id, locale: "fr", translation });
    for (const tagId of tagIds) {
      await db.insert(itemTags).values({ itemId: item.id, tagId });
    }
  }

  console.log("Done!");
  process.exit(0);
}

seed().catch(console.error);
