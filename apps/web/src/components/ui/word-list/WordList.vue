<script setup lang="ts">
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemMedia,
  ItemActions,
} from "@/components/ui/item";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookCheckIcon, Volume2Icon } from "lucide-vue-next";
import type { Component } from "vue";
import type { StudyItem } from "@aslema/shared";
import { useAudio } from "@/composables/useAudio";

defineProps<{
  title: string;
  items: StudyItem[];
  icon: Component;
  colorClass: string; // e.g. "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
}>();

const { playAudio } = useAudio();
</script>

<template>
  <div v-if="items.length > 0">
    <h2
      class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"
    >
      <component :is="icon" class="w-4 h-4" />
      {{ title }} ({{ items.length }})
    </h2>
    <div class="space-y-2">
      <Item v-for="item in items" :key="item.itemId" variant="outline">
        <ItemMedia>
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center"
            :class="colorClass"
          >
            <component :is="icon" class="w-4 h-4" />
          </div>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{{ item.tunisian }}</ItemTitle>
          <ItemDescription>{{ item.translation }}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <button
            v-if="item.audioFile"
            class="p-1.5 rounded-full hover:bg-muted transition-colors"
            @click.stop="playAudio(item.audioFile)"
          >
            <Volume2Icon class="w-4 h-4 text-muted-foreground" />
          </button>
          <TooltipProvider v-if="item.isLearned">
            <Tooltip>
              <TooltipTrigger as-child>
                <BookCheckIcon class="w-5 h-5 text-green-600" />
              </TooltipTrigger>
              <TooltipContent>
                <p class="text-sm">Mot appris</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ItemActions>
      </Item>
    </div>
  </div>
</template>
