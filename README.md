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

## Настройки

Имя и фамилия в названии DOCX задаются через переменную окружения бэкенда:

```env
DIGEST_AUTHOR_NAME="Иван Иванов"
```

Можно создать `backend/.env` по примеру `backend/.env.example`. В имени файла пробелы будут заменены на подчёркивания.

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
- оценки `applicability`, `maturity`, `implementation`, `transformation` — от 3 до 5; значения ниже 3 автоматически становятся 3
- период на обложке: день предоставления минус 6 дней
- имя файла: `Дайджест_IТ_Анализ_инструментов_и_технологий_{дата}_{ФИ}.docx`, где дата — день предоставления плюс 1, а `{ФИ}` берётся из `DIGEST_AUTHOR_NAME`
- **ИТОГО** — среднее четырёх оценок
- картинка: URL (`image_url`) или загрузка `POST /api/images` и поле `image_id`

## Запросы для УТ

В интерфейсе нажмите **«Для УТ»**. Откроется окно с отдельным JSON для каждой новости (в обычном выпуске — четыре блока) и адресом API. Для каждого блока создайте в Postman отдельный запрос:

- метод: `POST`
- URL: `https://ut-postgrest.efko.ru/lplvhonfgjijtko/technology_tools`
- тело: **Body → raw → JSON** — вставьте скопированный блок

Каждый блок сформирован по схеме УТ:

```json
{
  "name": "",
  "short_description": "",
  "type": "",
  "applicability": "",
  "maturity": "",
  "implementation": "",
  "transformation": "",
  "link": "",
  "application_scope": "",
  "similar_services": "",
  "description": "",
  "image_url": "",
  "user_full_name": "",
  "committee_date": ""
}
```

Значения новости берутся из карточки. `user_full_name` подставляется из `DIGEST_AUTHOR_NAME` на сервере, а `committee_date` рассчитывается как поле «День предоставления» плюс один день (формат `YYYY-MM-DD`).

## Промпт для подготовки JSON

```text
Ты редактор еженедельного ИТ-дайджеста. По входной новости подготовь результат строго в JSON-формате ниже. Не добавляй Markdown, комментарии, пояснения или текст вне JSON.

Требования:
- Верни объект с полями provisionDate и items.
- provisionDate укажи в формате YYYY-MM-DD.
- items должен быть массивом новостей.
- Если входная новость одна, верни массив items с одним объектом.
- type может быть только "Инструменты" или "Методы".
- Оценки applicability, maturity, implementation, transformation ставь числами от 3 до 5.
- Никогда не ставь оценку ниже 3. Если технология кажется слабой, нишевой, незрелой или сложной для внедрения, минимальная оценка всё равно 3.
- application_scope оформи строкой: каждый пункт с новой строки через \n.
- similar_services оформи строкой: каждый сервис или технология с новой строки через \n.
- description сделай подробным: 2-4 абзаца, абзацы разделяй через \n\n.
- short_description сделай кратким, но содержательным: 2-4 предложения.
- link укажи на источник новости.
- image_url заполни URL релевантной картинки, если он известен; если подходящей картинки нет, оставь пустую строку.
- Пиши на русском языке в деловом стиле.
- Не выдумывай факты, даты, цифры, компании и функции продукта, если их нет во входных данных.
- Если данных недостаточно, аккуратно обобщи только то, что следует из входной новости.

Формат ответа:
{
  "provisionDate": "YYYY-MM-DD",
  "items": [
    {
      "name": "",
      "short_description": "",
      "type": "Инструменты",
      "applicability": 3,
      "maturity": 3,
      "implementation": 3,
      "transformation": 3,
      "link": "",
      "application_scope": "",
      "similar_services": "",
      "description": "",
      "image_url": ""
    }
  ]
}

Входная новость:
[ВСТАВИТЬ ТЕКСТ, ССЫЛКУ ИЛИ ФАКТЫ НОВОСТИ]
```

## Скрипты

| Команда | Что делает |
| --- | --- |
| `npm run dev` | API и UI вместе |
| `npm run dev:backend` | только API |
| `npm run dev:frontend` | только UI |
