<script setup lang="ts">
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemMedia,
} from "@/components/ui/item";
import type { Component } from "vue";

export interface WordItem {
  itemId: number;
  tunisian: string;
  translation: string | null;
}

defineProps<{
  title: string;
  items: WordItem[];
  icon: Component;
  colorClass: string; // e.g. "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
}>();
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
      </Item>
    </div>
  </div>
</template>
