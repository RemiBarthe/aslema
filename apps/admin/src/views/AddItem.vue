<script setup lang="ts">
import { ref, onMounted } from "vue";
import { toast } from "vue-sonner";
import { createItem, getLessons, createLesson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const tunisian = ref("");
const translation = ref("");
const type = ref<"word" | "phrase" | "expression" | "dialogue" | "verb">("word");
const difficulty = ref(1);
const audioFile = ref("");
const lessonId = ref<number | undefined>(undefined);
const lessons = ref<Array<{ id: number; title: string }>>([]);
const isLoading = ref(false);
const showNewLessonForm = ref(false);
const newLessonTitle = ref("");
const isCreatingLesson = ref(false);

const itemTypes = [
  { value: "word", label: "Mot" },
  { value: "phrase", label: "Phrase" },
  { value: "expression", label: "Expression" },
  { value: "dialogue", label: "Dialogue" },
  { value: "verb", label: "Verbe" },
] as const;

onMounted(async () => {
  try {
    lessons.value = await getLessons();
  } catch (error) {
    console.error("Failed to load lessons:", error);
    toast.error("Erreur lors du chargement des leçons");
  }
});

async function handleSubmit() {
  if (!tunisian.value || !translation.value) {
    toast.error("Veuillez remplir tous les champs requis");
    return;
  }

  isLoading.value = true;
  try {
    const result = await createItem({
      tunisian: tunisian.value,
      translation: translation.value,
      type: type.value,
      difficulty: difficulty.value,
      audioFile: audioFile.value || undefined,
      lessonId: lessonId.value,
      locale: "fr",
    });

    toast.success(`Item créé avec succès (ID: ${result.id})`);

    // Reset form
    tunisian.value = "";
    translation.value = "";
    type.value = "word";
    difficulty.value = 1;
    audioFile.value = "";
  } catch (error) {
    console.error("Failed to create item:", error);
    toast.error("Erreur lors de la création de l'item");
  } finally {
    isLoading.value = false;
  }
}

async function handleCreateLesson() {
  if (!newLessonTitle.value) {
    toast.error("Veuillez entrer un titre pour la leçon");
    return;
  }

  isCreatingLesson.value = true;
  try {
    const result = await createLesson({
      title: newLessonTitle.value,
    });

    toast.success(`Leçon créée avec succès`);

    // Reload lessons and select the new one
    lessons.value = await getLessons();
    lessonId.value = result.id;

    // Reset and hide form
    newLessonTitle.value = "";
    showNewLessonForm.value = false;
  } catch (error) {
    console.error("Failed to create lesson:", error);
    toast.error("Erreur lors de la création de la leçon");
  } finally {
    isCreatingLesson.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">Ajouter un item</h1>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <Label for="tunisian">Tunisien (requis)</Label>
          <Input
            id="tunisian"
            v-model="tunisian"
            placeholder="Ex: Aslema"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="translation">Traduction française (requis)</Label>
          <Input
            id="translation"
            v-model="translation"
            placeholder="Ex: Bonjour"
            required
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <Label for="type">Type</Label>
          <select
            id="type"
            v-model="type"
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option v-for="itemType in itemTypes" :key="itemType.value" :value="itemType.value">
              {{ itemType.label }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <Label for="difficulty">Difficulté (1-5)</Label>
          <Input
            id="difficulty"
            v-model.number="difficulty"
            type="number"
            min="1"
            max="5"
            placeholder="1"
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="audioFile">Fichier audio (optionnel)</Label>
        <Input
          id="audioFile"
          v-model="audioFile"
          placeholder="Ex: aslema.mp3"
        />
        <p class="text-xs text-muted-foreground">
          Nom du fichier audio avec extension
        </p>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label for="lesson">Leçon (optionnel)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            @click="showNewLessonForm = !showNewLessonForm"
          >
            {{ showNewLessonForm ? "Annuler" : "+ Nouvelle leçon" }}
          </Button>
        </div>

        <div v-if="showNewLessonForm" class="flex gap-2">
          <Input
            v-model="newLessonTitle"
            placeholder="Titre de la nouvelle leçon"
            @keyup.enter="handleCreateLesson"
          />
          <Button
            type="button"
            @click="handleCreateLesson"
            :disabled="isCreatingLesson || !newLessonTitle"
          >
            {{ isCreatingLesson ? "..." : "Créer" }}
          </Button>
        </div>

        <select
          v-else
          id="lesson"
          v-model="lessonId"
          class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option :value="undefined">Aucune leçon</option>
          <option v-for="lesson in lessons" :key="lesson.id" :value="lesson.id">
            {{ lesson.title }}
          </option>
        </select>
      </div>

      <Button type="submit" :disabled="isLoading" class="w-full">
        {{ isLoading ? "Création..." : "Créer l'item" }}
      </Button>
    </form>
  </div>
</template>
