<script lang="ts">
  import ClipboardPasteIcon from "@lucide/svelte/icons/clipboard-paste";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import FileDownIcon from "@lucide/svelte/icons/file-down";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import SparklesIcon from "@lucide/svelte/icons/sparkles";
  import { ModeWatcher } from "mode-watcher";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import NewsCard from "$lib/components/NewsCard.svelte";
  import {
    addDaysIso,
    digestFilename,
    periodFromProvision,
    provisionDateFromUnknown,
    todayIso,
  } from "$lib/dates";
  import {
    emptyNews,
    importedText,
    normalizeScore,
    parseNewsType,
    sampleItems,
    type NewsItem,
  } from "$lib/types";

  const initialItems = [emptyNews(), emptyNews(), emptyNews(), emptyNews()];
  const utEndpoint = "https://ut-postgrest.efko.ru/lplvhonfgjijtko/technology_tools";
  let items = $state<NewsItem[]>(initialItems);
  let openItems = $state(initialItems.map((item) => item.id));
  let provisionDate = $state(todayIso());
  let jsonOpen = $state(false);
  let jsonText = $state("");
  let utOpen = $state(false);
  let utUserFullName = $state("");
  let generating = $state(false);
  let error = $state("");

  let period = $derived(periodFromProvision(provisionDate));
  let utRequests = $derived(
    items.map((item) =>
      JSON.stringify(
        {
          name: item.name,
          short_description: item.short_description,
          type: item.type,
          applicability: item.applicability,
          maturity: item.maturity,
          implementation: item.implementation,
          transformation: item.transformation,
          link: item.link,
          application_scope: item.application_scope,
          similar_services: item.similar_services,
          description: item.description,
          image_url: item.image_url,
          user_full_name: utUserFullName,
          committee_date: addDaysIso(provisionDate, 1),
        },
        null,
        2,
      ),
    ),
  );

  onMount(async () => {
    try {
      const response = await fetch("/api/ut-config");
      if (!response.ok) return;
      const payload = (await response.json()) as { user_full_name?: unknown };
      utUserFullName = typeof payload.user_full_name === "string" ? payload.user_full_name : "";
    } catch {
      // Запросы для УТ останутся доступны, если API временно недоступен.
    }
  });

  function fillSample() {
    items = sampleItems.map((item) => ({ ...item, id: crypto.randomUUID() }));
    openItems = items.map((item) => item.id);
    provisionDate = "2026-08-26";
    toast.success("Заполнены четыре примерные новости");
  }

  function addNews() {
    const item = emptyNews();
    items.push(item);
    openItems = [...openItems, item.id];
  }

  function removeNews(id: string) {
    if (items.length === 1) {
      toast.error("Нужна хотя бы одна новость");
      return;
    }
    items = items.filter((item) => item.id !== id);
    openItems = openItems.filter((value) => value !== id);
  }

  function parseImported(raw: string) {
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) return { items: data };
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (Array.isArray(record.items)) return record;
      if (typeof record.name === "string") return { items: [record] };
    }
    throw new Error("Ожидается массив новостей или объект с полем items");
  }

  function filenameFromContentDisposition(header: string | null) {
    if (!header) return "";
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
    if (encoded) {
      try {
        return decodeURIComponent(encoded);
      } catch {
        return encoded;
      }
    }
    return (
      /filename="([^"]+)"/i.exec(header)?.[1] ?? /filename=([^;]+)/i.exec(header)?.[1]?.trim() ?? ""
    );
  }

  function applyJson() {
    try {
      const parsed = parseImported(jsonText);
      const next = (parsed.items as Array<Partial<NewsItem>>).map((item) =>
        emptyNews({
          name: importedText(item.name),
          short_description: importedText(item.short_description),
          type: parseNewsType(item.type),
          applicability: normalizeScore(item.applicability),
          maturity: normalizeScore(item.maturity),
          implementation: normalizeScore(item.implementation),
          transformation: normalizeScore(item.transformation),
          link: importedText(item.link),
          application_scope: importedText(item.application_scope),
          similar_services: importedText(item.similar_services),
          description: importedText(item.description),
          image_url: importedText(item.image_url),
          image_id: String(item.image_id ?? ""),
        }),
      );
      if (!next.length) throw new Error("В JSON нет новостей");
      items = next;
      openItems = next.map((item) => item.id);
      const importedProvision = provisionDateFromUnknown(parsed);
      const fromItems = (parsed.items as Array<Partial<NewsItem>>)
        .map((item) => provisionDateFromUnknown(item))
        .filter(Boolean)
        .sort();
      provisionDate = importedProvision || fromItems.at(-1) || provisionDate;
      jsonOpen = false;
      toast.success(`Импортировано новостей: ${next.length}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Некорректный JSON");
    }
  }

  async function copyUtRequest(index: number) {
    try {
      await navigator.clipboard.writeText(utRequests[index]);
      toast.success(`JSON новости ${index + 1} скопирован`);
    } catch {
      toast.error("Не удалось скопировать JSON. Скопируйте текст вручную.");
    }
  }

  async function copyUtEndpoint() {
    try {
      await navigator.clipboard.writeText(utEndpoint);
      toast.success("Адрес УТ скопирован");
    } catch {
      toast.error("Не удалось скопировать адрес. Скопируйте его вручную.");
    }
  }

  async function generate() {
    error = "";
    generating = true;
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provisionDate,
          periodStart: period.start,
          periodEnd: period.end,
          items: items.map(({ id: _id, ...item }) => ({
            ...item,
            image_id: item.image_id || undefined,
          })),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? `Ошибка ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        filenameFromContentDisposition(response.headers.get("content-disposition")) ||
        digestFilename(provisionDate);
      link.click();
      URL.revokeObjectURL(url);
      toast.success("DOCX скачан");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось собрать документ";
      error = message;
      toast.error(message);
    } finally {
      generating = false;
    }
  }
</script>

<svelte:head>
  <title>Дайджест ИТ</title>
</svelte:head>

<ModeWatcher />
<Toaster />

<div class="min-h-svh bg-muted/30">
  <header class="border-b bg-background">
    <div
      class="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="space-y-1">
        <p class="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
          Служба директора по цифровой трансформации
        </p>
        <h1 class="text-2xl font-semibold tracking-tight">Еженедельный дайджест</h1>
        <p class="text-muted-foreground max-w-xl text-sm">
          Соберите 4 новости и получите DOCX в стиле референсного выпуска.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" onclick={fillSample}>
          <SparklesIcon />
          Пример
        </Button>
        <Button variant="outline" onclick={() => (jsonOpen = true)}>
          <ClipboardPasteIcon />
          JSON
        </Button>
        <Button variant="outline" onclick={() => (utOpen = true)}>
          <CopyIcon />
          Для УТ
        </Button>
        <Button onclick={generate} disabled={generating}>
          <FileDownIcon />
          {generating ? "Сборка…" : "Скачать DOCX"}
        </Button>
      </div>
    </div>
  </header>

  <main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
    {#if error}
      <Alert.Root variant="destructive">
        <Alert.Title>Ошибка генерации</Alert.Title>
        <Alert.Description>{error}</Alert.Description>
      </Alert.Root>
    {/if}

    <Card.Root>
      <Card.Header>
        <Card.Title>Параметры выпуска</Card.Title>
        <Card.Description>
          День предоставления задаёт обложку. Период считается автоматически: шесть дней назад и сам
          день предоставления.
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4 sm:grid-cols-3">
        <div class="grid gap-2">
          <Label for="provision">День предоставления</Label>
          <Input id="provision" type="date" bind:value={provisionDate} />
        </div>
        <div class="grid gap-2">
          <Label for="start">Период с</Label>
          <Input id="start" type="date" value={period.start} disabled />
        </div>
        <div class="grid gap-2">
          <Label for="end">Период по</Label>
          <Input id="end" type="date" value={period.end} disabled />
        </div>
      </Card.Content>
    </Card.Root>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-medium">Новости</h2>
          <Badge variant="outline">{items.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onclick={addNews}>
          <PlusIcon />
          Добавить
        </Button>
      </div>

      <Card.Root class="overflow-hidden py-0">
        <Accordion.Root type="multiple" bind:value={openItems} class="px-6">
          {#each items as item, index (item.id)}
            <Accordion.Item value={item.id}>
              <Accordion.Trigger class="hover:no-underline">
                <span class="flex min-w-0 flex-1 items-center gap-3 pr-4">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <span class="truncate font-medium">
                    {item.name || "Без названия"}
                  </span>
                  <Badge variant="outline">{item.type || "Тип"}</Badge>
                </span>
              </Accordion.Trigger>
              <Accordion.Content>
                <Separator class="mb-4" />
                <NewsCard {item} {index} onremove={() => removeNews(item.id)} />
              </Accordion.Content>
            </Accordion.Item>
          {/each}
        </Accordion.Root>
      </Card.Root>
    </section>
  </main>
</div>

<Dialog.Root bind:open={jsonOpen}>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Вставить JSON</Dialog.Title>
      <Dialog.Description>
        Массив новостей или объект с полем items. Можно вставить один объект новости.
      </Dialog.Description>
    </Dialog.Header>
    <Textarea
      bind:value={jsonText}
      rows={16}
      class="field-sizing-fixed max-h-[min(24rem,50dvh)] overflow-y-auto font-mono text-xs"
    />
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (jsonOpen = false)}>Отмена</Button>
      <Button onclick={applyJson}>Загрузить</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={utOpen}>
  <Dialog.Content class="sm:max-w-4xl">
    <Dialog.Header>
      <Dialog.Title>JSON-запросы для УТ</Dialog.Title>
      <Dialog.Description>
        Для каждого блока создайте отдельный запрос <code>POST</code> в Postman и вставьте JSON в
        Body → raw → JSON. <code>user_full_name</code> берётся из <code>DIGEST_AUTHOR_NAME</code>, а
        <code>committee_date</code> — из дня предоставления выпуска плюс один день.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4">
      <div class="grid gap-2 rounded-lg border bg-muted/30 p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <Label for="ut-endpoint">Endpoint</Label>
          <Button variant="outline" size="sm" onclick={copyUtEndpoint}>
            <CopyIcon />
            Скопировать URL
          </Button>
        </div>
        <Input id="ut-endpoint" value={utEndpoint} readonly class="font-mono text-xs" />
      </div>
      {#each utRequests as request, index}
        <div class="grid gap-2">
          <div class="flex items-center justify-between gap-3">
            <Label for={`ut-request-${index}`}>Новость {index + 1}</Label>
            <Button variant="outline" size="sm" onclick={() => copyUtRequest(index)}>
              <CopyIcon />
              Скопировать
            </Button>
          </div>
          <Textarea
            id={`ut-request-${index}`}
            value={request}
            readonly
            rows={14}
            class="field-sizing-fixed max-h-72 overflow-y-auto font-mono text-xs"
          />
        </div>
      {/each}
    </div>

    <Dialog.Footer>
      <Button onclick={() => (utOpen = false)}>Готово</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
