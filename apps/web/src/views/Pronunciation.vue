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

const vowels: Sound[] = [
  {
    symbol: "é / e",
    name: "voyelle courte",
    description:
      "Un son entre le « e » et le « eu » français, très courant en tunisien. Proche du « e » dans « le ».",
    examples: [
      { tunisian: "kélb", french: "Chien" },
      { tunisian: "wéld", french: "Garçon" },
    ],
  },
  {
    symbol: "a",
    name: "a court",
    description: "Un « a » bref, comme en français mais plus court.",
    examples: [
      { tunisian: "bab", french: "Porte" },
      { tunisian: "dar", french: "Maison" },
    ],
  },
  {
    symbol: "aa / â",
    name: "a long",
    description:
      "Un « a » allongé, tenu plus longtemps. La durée change le sens du mot !",
    examples: [
      { tunisian: "baab", french: "Portes" },
      { tunisian: "mââ", french: "Eau" },
    ],
  },
  {
    symbol: "i",
    name: "i court",
    description: "Un « i » bref comme en français.",
    examples: [
      { tunisian: "fih", french: "Dans (il y a)" },
      { tunisian: "min", french: "De / Qui" },
    ],
  },
  {
    symbol: "ii / î",
    name: "i long",
    description: "Un « i » allongé, tenu plus longtemps.",
    examples: [
      { tunisian: "kiif", french: "Comment" },
      { tunisian: "fiil", french: "Éléphant" },
    ],
  },
  {
    symbol: "ou",
    name: "ou court",
    description: "Un « ou » bref comme dans « cou ».",
    examples: [
      { tunisian: "foum", french: "Bouche" },
      { tunisian: "youm", french: "Jour" },
    ],
  },
  {
    symbol: "ou / û",
    name: "ou long",
    description: "Un « ou » allongé, tenu plus longtemps.",
    examples: [
      { tunisian: "nour", french: "Lumière" },
      { tunisian: "3oud", french: "Bois / Luth" },
    ],
  },
  {
    symbol: "o",
    name: "o",
    description:
      "Le son « o » (influence italienne/française). N'existe pas en arabe classique.",
    examples: [
      { tunisian: "porta", french: "Porte (emprunt)" },
      { tunisian: "tomatom", french: "Tomates" },
    ],
  },
];

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
      { tunisian: "5ali", french: "Vide" },
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
      { tunisian: "hédha", french: "Celui-ci" },
    ],
  },
  {
    symbol: "sh",
    arabic: "ش",
    name: "shin",
    description: "Comme le « ch » français dans « chat ». Facile !",
    examples: [
      { tunisian: "shems", french: "Soleil" },
      { tunisian: "shnou", french: "Quoi" },
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

  <h2 class="mt-8 text-lg font-semibold font-heading">Les consonnes</h2>
  <p class="mt-2 mb-4 text-sm text-muted-foreground">
    Ces sons sont représentés par des chiffres ou des combinaisons de lettres.
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

  <h2 class="mt-10 text-lg font-semibold font-heading">Les voyelles</h2>
  <p class="mt-2 mb-4 text-sm text-muted-foreground">
    En tunisien, la durée des voyelles est importante : une voyelle longue peut
    changer le sens d'un mot.
  </p>

  <div class="space-y-4">
    <Item v-for="vowel in vowels" :key="vowel.symbol" variant="outline">
      <ItemMedia
        variant="image"
        class="bg-primary text-primary-foreground rounded-lg text-base font-bold"
      >
        {{ vowel.symbol.split(" ")[0] }}
      </ItemMedia>

      <ItemContent class="flex-1">
        <ItemTitle>
          {{ vowel.symbol }}
          <span class="text-muted-foreground font-normal"
            >({{ vowel.name }})</span
          >
        </ItemTitle>

        <ItemDescription class="mt-1">
          {{ vowel.description }}
        </ItemDescription>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="example in vowel.examples"
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
