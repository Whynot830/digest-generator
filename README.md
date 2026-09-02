# Дайджест ИТ

Еженедельный дайджест в `.docx`: обложка, обзор инструментов/сервисов/методов, оценки, детальные описания.

Монорепозиторий: UI на Svelte 5 + Vite, API на Express. Картинки хранятся в `backend/data/images`, база не нужна.

## Запуск

```bash
npm install
npm run dev
```

- UI: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3001](http://localhost:3001)

Для корректного вида документа в Word нужен установленный шрифт **MagistralC**.

## Сборка через API

UI не обязателен. Можно отдать JSON напрямую:

```bash
curl -X POST http://localhost:3001/api/generate \
  -H 'content-type: application/json' \
  -d @payload.json \
  -o digest.docx
```

```json
{
  "provisionDate": "2026-09-02",
  "items": [
    {
      "name": "Название",
      "short_description": "Кратко для обзора",
      "type": "Инструменты",
      "applicability": 4,
      "maturity": 3,
      "implementation": 3,
      "transformation": 4,
      "link": "https://example.com",
      "application_scope": "Пункт 1\nПункт 2",
      "similar_services": "Аналог A\nАналог B",
      "description": "Первый абзац.\\n\\nВторой абзац.",
      "image_url": "https://example.com/image.png"
    }
  ]
}
```

- `type` — `Инструменты` или `Методы`
- период на обложке: день предоставления минус 6 дней
- имя файла: `Дайджест_IТ_Анализ_инструментов_и_технологий_{дата}_Нурулла_Амин.docx`, где дата — день предоставления плюс 1
- **ИТОГО** — среднее четырёх оценок
- картинка: URL (`image_url`) или загрузка `POST /api/images` и поле `image_id`

## Скрипты

| Команда | Что делает |
| --- | --- |
| `npm run dev` | API и UI вместе |
| `npm run dev:backend` | только API |
| `npm run dev:frontend` | только UI |
