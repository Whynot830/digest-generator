export const NEWS_TYPES = ["Инструменты", "Методы"] as const;
export type NewsType = (typeof NEWS_TYPES)[number];

export function parseNewsType(value: unknown): NewsType {
  return value === "Методы" ? "Методы" : "Инструменты";
}

export function importedText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => importedText(item))
      .filter(Boolean)
      .join("\n");
  }
  if (value == null) return "";
  let text = String(value).replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  if (!text.includes("\n") && text.includes("\\n")) {
    text = text.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n");
  }
  return text;
}

export type NewsItem = {
  id: string;
  name: string;
  short_description: string;
  type: NewsType;
  applicability: string;
  maturity: string;
  implementation: string;
  transformation: string;
  link: string;
  application_scope: string;
  similar_services: string;
  description: string;
  image_url: string;
  image_id: string;
};

export type DigestMeta = {
  provisionDate: string;
};

export function emptyNews(partial: Partial<NewsItem> = {}): NewsItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    short_description: "",
    type: "Инструменты",
    applicability: "3",
    maturity: "3",
    implementation: "3",
    transformation: "3",
    link: "",
    application_scope: "",
    similar_services: "",
    description: "",
    image_url: "",
    image_id: "",
    ...partial,
  };
}

export function averageScore(item: NewsItem) {
  const scores = [
    Number(item.applicability),
    Number(item.maturity),
    Number(item.implementation),
    Number(item.transformation),
  ].filter((n) => Number.isFinite(n));
  if (!scores.length) return 0;
  const avg = scores.reduce((sum, n) => sum + n, 0) / scores.length;
  return Math.round(avg * 100) / 100;
}

export const sampleItems: NewsItem[] = [
  emptyNews({
    name: "ADR – обнаружение угроз и контроль безопасности AI-агентов",
    short_description:
      "ADR (Agentic AI Detection and Response) — enterprise-система Uber для обнаружения, наблюдения и анализа угроз, связанных с AI-агентами. Она охватывает как developer-инструменты вроде Cursor, Claude Code и Codex, так и внутренние или клиентские автономные агенты. Ключевая идея — перенести подход Detection & Response из классической endpoint/cloud security в среду agentic AI, где риск создают не только приложения, но и цепочки действий самого агента.",
    type: "Инструменты",
    applicability: "4",
    maturity: "2",
    implementation: "3",
    transformation: "4",
    link: "https://github.com/uber/ADR",
    application_scope: "Обезличивание датасетов перед их передачей аналитикам",
    similar_services: "ARX – платформа для data anonymization и оценки privacy-risk",
    description:
      "Классические EDR и SIEM хорошо видят процессы, сетевые соединения и изменения файлов, но почти не понимают семантику действий AI-агента: зачем он вызвал конкретный tool, какую задачу выполнял и является ли последовательность формально легитимных операций частью атаки. Это особенно важно для coding agents и MCP, которые получают доступ к shell, репозиториям, браузеру и внутренним сервисам. ADR строит отдельный security-контур вокруг agentic workloads. Discovery обнаруживает установленные AI-приложения, CLI-агенты, IDE extensions, локальные model runtimes и MCP servers. Sensor собирает и приводит к единой схеме intent, tool calls и execution traces из разных агентных платформ. Для detection используется двухуровневая схема: сначала дешёвый high-recall этап отбирает потенциально подозрительные сессии, после чего более дорогой agentic-анализ разбирает их глубже. Такой подход должен уменьшать стоимость постоянного анализа большого потока telemetry, сохраняя возможность учитывать контекст многошаговых действий агента. Для проверки защит Uber также публикует ADR-Bench: более 300 сценариев и 133 MCP-сервера с покрытием 17 типов атак. Однако open-source версия неполная: ADR Prevention, блокирующий опасные действия до исполнения, пока не опубликован, как и offline ADR Explorer для pre-deployment red teaming. Поэтому текущий релиз наиболее зрел именно как discovery, observability, benchmarking и detection stack.",
    image_url:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSto7BEwFEXdPpet0NGedv7g6cYtcHo6aUPU2zVJOuKS5oLzDCvcb8fgYL0&s=10",
  }),
  emptyNews({
    name: "Chrome 152 – обновление браузера и инструментов frontend-разработки",
    short_description:
      "Google выпустила стабильную версию Chrome 152 для Windows, macOS, Linux, ChromeOS и Android. Релиз включает обновления веб-платформы, расширение возможностей CSS и улучшения инструментов разработчика.",
    type: "Инструменты",
    applicability: "5",
    maturity: "4",
    implementation: "5",
    transformation: "3",
    link: "https://developer.chrome.com/release-notes/152",
    application_scope:
      "Разработка и тестирование веб-интерфейсов\nОтладка сетевых запросов и клиентских ошибок\nАнализ производительности web-приложений",
    similar_services: "Firefox Developer Edition\nMicrosoft Edge DevTools\nSafari Web Inspector",
    description:
      "Chrome 152 включает изменения на уровне браузерного движка и инструментов разработчика. Для frontend-команд это означает появление новых возможностей, которые можно использовать непосредственно в приложениях и при отладке. Расширение CSSPseudoElement предоставляет программный доступ к большему числу псевдоэлементов. Обновлённые DevTools позволяют повторно отправлять запросы и анализировать бинарное содержимое ответов.",
  }),
  emptyNews({
    name: "SvelteKit 3 – переход к Release Candidate",
    short_description:
      "Команда Svelte объявила о переходе SvelteKit 3 в стадию Release Candidate. Фреймворк предназначен для создания full-stack веб-приложений на базе Svelte и объединяет маршрутизацию, SSR и загрузку данных.",
    type: "Инструменты",
    applicability: "3",
    maturity: "3",
    implementation: "3",
    transformation: "3",
    link: "https://svelte.dev/blog/sveltekit-3-release-candidate",
    application_scope:
      "Создание серверно-рендерируемых веб-приложений\nРазработка статических сайтов и контентных платформ\nПостроение full-stack-приложений на TypeScript",
    similar_services:
      "Next.js – full-stack-фреймворк для React\nNuxt – full-stack-фреймворк для Vue\nAstro",
    description:
      "SvelteKit объединяет маршрутизацию, серверный рендеринг, загрузку данных, form actions, адаптеры развёртывания и сборку. В новой версии развиваются shallow routing, Remote Functions и обновление данных через refreshAll.",
  }),
  emptyNews({
    name: "Cloudflare AI Search – поиск по собственным данным",
    short_description:
      "Cloudflare представила обновления AI Search – сервиса для создания поисковой системы по сайтам, документам и другим наборам данных. Решение поддерживает семантический и гибридный поиск.",
    type: "Методы",
    applicability: "4",
    maturity: "3",
    implementation: "4",
    transformation: "3",
    link: "https://developers.cloudflare.com/changelog/post/2026-08-06-public-endpoint-custom-domains-and-namespaces/",
    application_scope:
      "Поиск по корпоративной документации\nСоздание AI-поиска по сайту\nПостроение RAG-систем",
    similar_services: "Algolia\nElasticsearch\nTypesense\nMeilisearch",
    description:
      "Cloudflare AI Search предоставляет управляемый слой поиска по собственным данным. В обновлении появились публикация поискового endpoint на собственном домене, ограничение доступа, аутентификация и работа с несколькими экземплярами поиска через одну точку входа.",
  }),
];
