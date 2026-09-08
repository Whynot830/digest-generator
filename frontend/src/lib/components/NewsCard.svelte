<script lang="ts">
  import FileUpIcon from "@lucide/svelte/icons/file-up";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import {
    averageScore,
    NEWS_TYPES,
    normalizeScore,
    parseNewsType,
    type NewsItem,
  } from "$lib/types";
  import { toast } from "svelte-sonner";

  type Props = {
    item: NewsItem;
    index: number;
    onremove: () => void;
  };

  let { item, index, onremove }: Props = $props();

  let uploading = $state(false);
  let total = $derived(averageScore(item));
  let preview = $derived(item.image_id ? `/api/images/${item.image_id}` : item.image_url);

  function clampScores() {
    item.applicability = normalizeScore(item.applicability);
    item.maturity = normalizeScore(item.maturity);
    item.implementation = normalizeScore(item.implementation);
    item.transformation = normalizeScore(item.transformation);
  }

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    uploading = true;
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/images", { method: "POST", body });
      const payload = (await response.json()) as {
        id?: string;
        url?: string;
        error?: string;
      };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Не удалось загрузить изображение");
      }
      item.image_id = payload.id;
      item.image_url = payload.url ?? `/api/images/${payload.id}`;
      toast.success("Изображение сохранено локально");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки");
    } finally {
      uploading = false;
    }
  }
</script>

<Card.Root class="border-0 shadow-none">
  <Card.Header class="px-0 pt-2">
    <Card.Title class="text-base">Новость {index + 1}</Card.Title>
    <Card.Description>Оценки, текст и изображение для блока дайджеста</Card.Description>
    <Card.Action>
      <Button variant="ghost" size="icon-sm" onclick={onremove} aria-label="Удалить новость">
        <Trash2Icon />
      </Button>
    </Card.Action>
  </Card.Header>
  <Card.Content class="grid gap-4 px-0">
    <div class="grid gap-2">
      <Label for="name-{item.id}">Название</Label>
      <Input id="name-{item.id}" bind:value={item.name} placeholder="ADR – обнаружение угроз..." />
    </div>

    <div class="grid gap-2">
      <Label for="type-{item.id}">Тип</Label>
      <select
        id="type-{item.id}"
        class="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm dark:bg-input/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        bind:value={() => parseNewsType(item.type), (value) => (item.type = parseNewsType(value))}
      >
        {#each NEWS_TYPES as newsType (newsType)}
          <option value={newsType}>{newsType}</option>
        {/each}
      </select>
    </div>

    <div class="grid gap-2">
      <Label for="short-{item.id}">Краткое описание</Label>
      <Textarea id="short-{item.id}" rows={4} bind:value={item.short_description} />
    </div>

    <div class="grid gap-3 rounded-lg border bg-muted/40 p-3">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium">Оценки полезности</p>
        <Badge variant="secondary">Итого: {total}</Badge>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="grid gap-2">
          <Label for="app-{item.id}">Применимость</Label>
          <Input
            id="app-{item.id}"
            type="number"
            min="3"
            max="5"
            step="1"
            bind:value={item.applicability}
            onblur={clampScores}
          />
        </div>
        <div class="grid gap-2">
          <Label for="mat-{item.id}">Зрелость</Label>
          <Input
            id="mat-{item.id}"
            type="number"
            min="3"
            max="5"
            step="1"
            bind:value={item.maturity}
            onblur={clampScores}
          />
        </div>
        <div class="grid gap-2">
          <Label for="impl-{item.id}">Внедрение</Label>
          <Input
            id="impl-{item.id}"
            type="number"
            min="3"
            max="5"
            step="1"
            bind:value={item.implementation}
            onblur={clampScores}
          />
        </div>
        <div class="grid gap-2">
          <Label for="tr-{item.id}">Трансформация</Label>
          <Input
            id="tr-{item.id}"
            type="number"
            min="3"
            max="5"
            step="1"
            bind:value={item.transformation}
            onblur={clampScores}
          />
        </div>
      </div>
      <p class="text-muted-foreground text-xs">
        Итого — среднее арифметическое четырёх оценок из пейлоада.
      </p>
    </div>

    <div class="grid gap-2">
      <Label for="link-{item.id}">Ссылка</Label>
      <Input id="link-{item.id}" type="url" bind:value={item.link} placeholder="https://" />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="grid gap-2">
        <Label for="scope-{item.id}">Сфера применения</Label>
        <Textarea
          id="scope-{item.id}"
          rows={3}
          bind:value={item.application_scope}
          placeholder="По одному пункту на строку"
        />
      </div>
      <div class="grid gap-2">
        <Label for="similar-{item.id}">Похожие сервисы</Label>
        <Textarea
          id="similar-{item.id}"
          rows={3}
          bind:value={item.similar_services}
          placeholder="По одному пункту на строку"
        />
      </div>
    </div>

    <div class="grid gap-2">
      <Label for="desc-{item.id}">Описание</Label>
      <Textarea id="desc-{item.id}" rows={8} bind:value={item.description} />
    </div>

    <div class="grid gap-3">
      <Label for="image-{item.id}">Изображение</Label>
      <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          id="image-{item.id}"
          bind:value={item.image_url}
          placeholder="URL картинки или загрузите файл"
          onchange={() => {
            item.image_id = "";
          }}
        />
        <div class="relative">
          <Button variant="outline" disabled={uploading}>
            <FileUpIcon />
            {uploading ? "Загрузка…" : "Локальный файл"}
          </Button>
          <input
            class="absolute inset-0 cursor-pointer opacity-0"
            type="file"
            accept="image/*"
            disabled={uploading}
            onchange={(event) => {
              const input = event.currentTarget;
              void uploadFile(input.files?.[0]);
              input.value = "";
            }}
          />
        </div>
      </div>
      {#if preview}
        <img
          src={preview}
          alt="Превью новости"
          class="max-h-48 w-full rounded-md border object-contain bg-muted"
        />
      {/if}
    </div>
  </Card.Content>
</Card.Root>
