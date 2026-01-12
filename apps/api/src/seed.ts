import { db } from "./db";
import { lessons, items, itemTranslations, tags, itemTags } from "./db/schema";

const seedData = {
  lessons: [
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
  ],
  tags: [
    { id: 1, name: "formel", color: "#3B82F6" },
    { id: 2, name: "informel", color: "#10B981" },
    { id: 3, name: "courant", color: "#F59E0B" },
    { id: 4, name: "nombre", color: "#8B5CF6" },
    { id: 5, name: "question", color: "#EF4444" },
    { id: 6, name: "salutation", color: "#EC4899" },
  ],
  items: [
    // Lesson 1: Salutations
    {
      id: 1,
      lessonId: 1,
      type: "phrase" as const,
      tunisian: "Aslema",
      phonetic: "as-lé-ma",
      difficulty: 1,
      orderIndex: 1,
      translations: {
        fr: "Bonjour / Salut",
        altTranslations: ["Salut", "Hello"],
      },
      tagIds: [2, 3, 6],
    },
    {
      id: 2,
      lessonId: 1,
      type: "phrase" as const,
      tunisian: "Sabbah el khir",
      phonetic: "sa-bah el khir",
      difficulty: 1,
      orderIndex: 2,
      translations: { fr: "Bonjour (matin)", altTranslations: ["Bon matin"] },
      tagIds: [1, 6],
    },
    {
      id: 3,
      lessonId: 1,
      type: "phrase" as const,
      tunisian: "Msa el khir",
      phonetic: "msa el khir",
      difficulty: 1,
      orderIndex: 3,
      translations: { fr: "Bonsoir", altTranslations: [] },
      tagIds: [1, 6],
    },
    {
      id: 4,
      lessonId: 1,
      type: "phrase" as const,
      tunisian: "Labes?",
      phonetic: "la-bès",
      difficulty: 1,
      orderIndex: 4,
      translations: {
        fr: "Ça va ?",
        altTranslations: ["Comment ça va ?", "Tu vas bien ?"],
      },
      tagIds: [2, 3, 6],
    },
    {
      id: 5,
      lessonId: 1,
      type: "phrase" as const,
      tunisian: "Labes, hamdoullah",
      phonetic: "la-bès, ham-dou-lah",
      difficulty: 1,
      orderIndex: 5,
      translations: {
        fr: "Ça va, Dieu merci",
        altTranslations: ["Ça va bien, merci"],
      },
      tagIds: [3, 6],
    },
    {
      id: 6,
      lessonId: 1,
      type: "phrase" as const,
      tunisian: "Bislema",
      phonetic: "bis-lé-ma",
      difficulty: 1,
      orderIndex: 6,
      translations: { fr: "Au revoir", altTranslations: ["Bye", "Salut"] },
      tagIds: [2, 3, 6],
    },

    // Lesson 2: Chiffres
    {
      id: 7,
      lessonId: 2,
      type: "word" as const,
      tunisian: "Wahed",
      phonetic: "wa-hed",
      difficulty: 1,
      orderIndex: 1,
      translations: { fr: "Un (1)", altTranslations: ["1"] },
      tagIds: [4],
    },
    {
      id: 8,
      lessonId: 2,
      type: "word" as const,
      tunisian: "Zouz",
      phonetic: "zouz",
      difficulty: 1,
      orderIndex: 2,
      translations: { fr: "Deux (2)", altTranslations: ["2"] },
      tagIds: [4],
    },
    {
      id: 9,
      lessonId: 2,
      type: "word" as const,
      tunisian: "Tletha",
      phonetic: "tlé-tha",
      difficulty: 1,
      orderIndex: 3,
      translations: { fr: "Trois (3)", altTranslations: ["3"] },
      tagIds: [4],
    },
    {
      id: 10,
      lessonId: 2,
      type: "word" as const,
      tunisian: "Arb3a",
      phonetic: "ar-b-âa",
      difficulty: 1,
      orderIndex: 4,
      translations: { fr: "Quatre (4)", altTranslations: ["4"] },
      tagIds: [4],
    },
    {
      id: 11,
      lessonId: 2,
      type: "word" as const,
      tunisian: "Khamsa",
      phonetic: "kham-sa",
      difficulty: 1,
      orderIndex: 5,
      translations: { fr: "Cinq (5)", altTranslations: ["5"] },
      tagIds: [4],
    },

    // Lesson 3: Questions
    {
      id: 12,
      lessonId: 3,
      type: "phrase" as const,
      tunisian: "Chnou?",
      phonetic: "ch-nou",
      difficulty: 1,
      orderIndex: 1,
      translations: {
        fr: "Quoi ?",
        altTranslations: ["Qu'est-ce que c'est ?"],
      },
      tagIds: [3, 5],
    },
    {
      id: 13,
      lessonId: 3,
      type: "phrase" as const,
      tunisian: "Winou?",
      phonetic: "wi-nou",
      difficulty: 1,
      orderIndex: 2,
      translations: { fr: "Où ?", altTranslations: ["C'est où ?"] },
      tagIds: [3, 5],
    },
    {
      id: 14,
      lessonId: 3,
      type: "phrase" as const,
      tunisian: "9addech?",
      phonetic: "ad-dech",
      difficulty: 1,
      orderIndex: 3,
      translations: { fr: "Combien ?", altTranslations: ["C'est combien ?"] },
      tagIds: [3, 5],
    },
    {
      id: 15,
      lessonId: 3,
      type: "phrase" as const,
      tunisian: "3lech?",
      phonetic: "a-lèch",
      difficulty: 1,
      orderIndex: 4,
      translations: { fr: "Pourquoi ?", altTranslations: [] },
      tagIds: [3, 5],
    },
    {
      id: 16,
      lessonId: 3,
      type: "phrase" as const,
      tunisian: "Kifech?",
      phonetic: "ki-fèch",
      difficulty: 1,
      orderIndex: 5,
      translations: { fr: "Comment ?", altTranslations: [] },
      tagIds: [3, 5],
    },
    {
      id: 17,
      lessonId: 3,
      type: "phrase" as const,
      tunisian: "Chkoun?",
      phonetic: "ch-koun",
      difficulty: 2,
      orderIndex: 6,
      translations: { fr: "Qui ?", altTranslations: ["C'est qui ?"] },
      tagIds: [3, 5],
    },
    {
      id: 18,
      lessonId: 3,
      type: "phrase" as const,
      tunisian: "Wa9tech?",
      phonetic: "wa-tèch",
      difficulty: 2,
      orderIndex: 7,
      translations: { fr: "Quand ?", altTranslations: ["C'est quand ?"] },
      tagIds: [3, 5],
    },
  ],
};

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Clear existing data (in reverse order of dependencies)
  console.log("🗑️  Clearing existing data...");
  await db.delete(itemTags);
  await db.delete(itemTranslations);
  await db.delete(items);
  await db.delete(tags);
  await db.delete(lessons);

  // Insert lessons
  console.log("📚 Inserting lessons...");
  await db.insert(lessons).values(seedData.lessons);

  // Insert tags
  console.log("🏷️  Inserting tags...");
  await db.insert(tags).values(seedData.tags);

  // Insert items and their translations
  console.log("📝 Inserting items...");
  for (const item of seedData.items) {
    const { translations, tagIds, ...itemData } = item;

    await db.insert(items).values(itemData);

    // Insert translation
    await db.insert(itemTranslations).values({
      itemId: item.id,
      locale: "fr",
      translation: translations.fr,
      altTranslations: translations.altTranslations,
    });

    // Insert tag associations
    for (const tagId of tagIds) {
      await db.insert(itemTags).values({
        itemId: item.id,
        tagId,
      });
    }
  }

  console.log("\n✅ Seed completed!");
  console.log(`   - ${seedData.lessons.length} lessons`);
  console.log(`   - ${seedData.tags.length} tags`);
  console.log(`   - ${seedData.items.length} items`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
