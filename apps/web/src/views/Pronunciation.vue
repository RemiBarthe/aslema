<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowLeftIcon, Volume2Icon } from "lucide-vue-next";
import Button from "@/components/ui/button/Button.vue";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemMedia,
} from "@/components/ui/item";

interface Sound {
  symbol: string;
  arabic?: string;
  name: string;
  description: string;
  examples: { tunisian: string; french: string }[];
}

const sounds: Sound[] = [
  {
    symbol: "3",
    arabic: "ع",
    name: "'ayn",
    description:
      "Son guttural profond venant de la gorge. Imaginez que vous êtes surpris et dites « ah » depuis le fond de la gorge.",
    examples: [
      { tunisian: "3aslema", french: "Bonjour" },
      { tunisian: "3arbi", french: "Arabe" },
    ],
  },
  {
    symbol: "7",
    arabic: "ح",
    name: "ḥa",
    description:
      "Un « h » aspiré fort, comme si vous souffliez de la buée sur une vitre mais depuis la gorge.",
    examples: [
      { tunisian: "7lib", french: "Lait" },
      { tunisian: "7ot", french: "Poisson" },
    ],
  },
  {
    symbol: "9",
    arabic: "ق",
    name: "qaf",
    description:
      "Un « k » profond prononcé depuis le fond de la gorge, plus en arrière qu'un « k » normal.",
    examples: [
      { tunisian: "9alb", french: "Cœur" },
      { tunisian: "9ahwa", french: "Café" },
    ],
  },
  {
    symbol: "5",
    arabic: "خ",
    name: "kha",
    description:
      "Comme le « ch » allemand dans « Bach » ou le « j » espagnol. Un son rauque du fond de la gorge.",
    examples: [
      { tunisian: "5obz", french: "Pain" },
      { tunisian: "5ou5", french: "Pêche" },
    ],
  },
  {
    symbol: "r",
    arabic: "ر",
    name: "ra",
    description:
      "Un « r » roulé comme en espagnol ou en italien. La langue vibre contre le palais, contrairement au « r » français qui vient de la gorge.",
    examples: [
      { tunisian: "rajel", french: "Homme" },
      { tunisian: "dar", french: "Maison" },
    ],
  },
  {
    symbol: "gh",
    arabic: "غ",
    name: "ghayn",
    description:
      "Proche du « r » français grasseyé ou comme un gargarisme doux.",
    examples: [
      { tunisian: "ghali", french: "Cher (prix)" },
      { tunisian: "ghodwa", french: "Demain" },
    ],
  },
  {
    symbol: "th",
    arabic: "ث",
    name: "tha",
    description:
      "Le « th » anglais sourd comme dans « think ». Placez la langue entre les dents et soufflez.",
    examples: [
      { tunisian: "thaltha", french: "Trois" },
      { tunisian: "thoum", french: "Ail" },
    ],
  },
  {
    symbol: "dh",
    arabic: "ذ",
    name: "dhal",
    description:
      "Le « th » anglais sonore comme dans « this ». Comme « th » mais avec la voix.",
    examples: [
      { tunisian: "dhib", french: "Loup" },
      { tunisian: "hedha", french: "Celui-ci" },
    ],
  },
  {
    symbol: "e",
    arabic: "é",
    name: "voyelle courte",
    description: "Un son comme le « é » français, très courant en tunisien.",
    examples: [
      { tunisian: "beb", french: "Porte" },
      { tunisian: "weld", french: "Garçon" },
    ],
  },
];
</script>

<template>
  <div
    class="sticky top-15 z-10 bg-background flex items-center justify-between pb-1"
  >
    <div class="flex items-center gap-2">
      <RouterLink to="/" class="text-muted-foreground hover:text-foreground">
        <Button variant="ghost" size="icon-sm">
          <ArrowLeftIcon />
        </Button>
      </RouterLink>
      <h1 class="text-xl font-semibold font-heading">Apprendre les sons</h1>
    </div>
  </div>

  <p class="my-4 text-muted-foreground">
    Le tunisien utilise des sons qui n'existent pas en français. Voici les
    principaux sons à maîtriser, représentés par des chiffres ou des
    combinaisons de lettres.
  </p>

  <div class="space-y-4">
    <Item v-for="sound in sounds" :key="sound.symbol" variant="outline">
      <ItemMedia
        variant="image"
        class="bg-accent-foreground text-white rounded-lg text-xl font-bold"
      >
        {{ sound.symbol }}
      </ItemMedia>

      <ItemContent class="flex-1">
        <ItemTitle class="flex items-center gap-2">
          <span class="text-lg font-arabic">{{ sound.arabic }}</span>
          <span class="text-muted-foreground font-normal"
            >({{ sound.name }})</span
          >
        </ItemTitle>

        <ItemDescription class="mt-1">
          {{ sound.description }}
        </ItemDescription>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="example in sound.examples"
            :key="example.tunisian"
            class="inline-flex items-center gap-1.5 bg-muted/50 hover:bg-muted px-2.5 py-1 rounded-md text-sm transition-colors"
          >
            <Volume2Icon class="size-3 text-muted-foreground" />
            <span class="font-semibold">{{ example.tunisian }}</span>
            <span class="text-muted-foreground">→ {{ example.french }}</span>
          </button>
        </div>
      </ItemContent>
    </Item>
  </div>

  <div class="mt-8 p-4 bg-muted/30 rounded-lg">
    <h3 class="font-semibold mb-2">Bon à savoir</h3>
    <p class="text-sm text-muted-foreground">
      Les chiffres 3, 7, 9 et 5 sont utilisés car ils ressemblent visuellement
      aux lettres arabes correspondantes. C'est une convention courante dans
      l'écriture du dialecte tunisien en caractères latins.
    </p>
  </div>
</template>
