<script setup lang="ts">
import type { LabelProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { Label as RekaLabel } from "reka-ui";
import { cn } from "@/lib/utils";

interface Props extends LabelProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
</script>

<template>
  <RekaLabel
    v-bind="props"
    :class="
      cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
      )
    "
  >
    <slot />
  </RekaLabel>
</template>
