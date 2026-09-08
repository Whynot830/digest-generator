import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  type IRunOptions,
  LevelFormat,
  Packer,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { imageSize } from "image-size";
import type { ResolvedImage } from "./images";
import { formatRuDate, resolveCoverDates } from "./dates";
import type { DigestMeta, NewsItemInput } from "./types";

const FONT = "MagistralC";
const COLOR = "525252";
const BLUE = "0070C0";
const LINK = "0563C1";
const TABLE_FILL = "F2F2F2";
/** 1 cm = 567 twips. Left page margin is 2 cm instead of hanging every paragraph by -1 cm. */
const PAGE_MARGIN_LEFT = 1134;
/** Cover lines stay ~1.25 cm from the page edge (same place as -993 at a 3 cm margin). */
const COVER_INDENT = { left: -426 } as const;
const FLUSH_INDENT = { left: 0, firstLine: 0 } as const;
const hairline = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: TABLE_FILL,
};

function parseScore(value: string | number) {
  const n =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? Math.max(3, n) : 3;
}

export function averageScore(item: NewsItemInput) {
  const scores = [
    parseScore(item.applicability),
    parseScore(item.maturity),
    parseScore(item.implementation),
    parseScore(item.transformation),
  ];
  return scores.reduce((sum, n) => sum + n, 0) / scores.length;
}

export function formatScore(value: number) {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

function unescapeMarkup(text: string) {
  let value = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  if (!value.includes("\n") && value.includes("\\n")) {
    value = value.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n");
  }
  return value;
}

function toList(value: string | string[] | undefined) {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map((item) => item.trim()).filter(Boolean);
  return unescapeMarkup(value)
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toParagraphs(text: string) {
  return unescapeMarkup(text)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDashes(text: string) {
  return text.replaceAll("\u2014", "\u2013");
}

function shortName(name: string) {
  const cut = normalizeDashes(name).split(/\s+[–-]\s+/)[0];
  return cut?.trim() || name;
}

function run(text: string, extra: IRunOptions = {}) {
  return new TextRun({
    font: FONT,
    color: COLOR,
    size: 28,
    ...extra,
    text: normalizeDashes(text),
  });
}

function emptyPara() {
  return new Paragraph({
    spacing: { after: 120 },
    children: [],
  });
}

function bodyPara(text: string) {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { after: 240, line: 276 },
    children: [run(text)],
  });
}

function heading1(text: string, extra: { pageBreakBefore?: boolean } = {}) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    numbering: { reference: "headings", level: 0 },
    spacing: { before: 240, after: 200 },
    indent: FLUSH_INDENT,
    keepNext: true,
    ...extra,
    children: [run(text, { bold: true, size: 28 })],
  });
}

function heading2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    numbering: { reference: "headings", level: 1 },
    spacing: { before: 200, after: 160 },
    indent: FLUSH_INDENT,
    keepNext: true,
    children: [run(text, { bold: true, size: 28 })],
  });
}

function heading3(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80 },
    indent: FLUSH_INDENT,
    children: [run(text, { bold: true, size: 27 })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80, line: 276 },
    indent: FLUSH_INDENT,
    children: [run(text)],
  });
}

function linkPara(url: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new ExternalHyperlink({
        link: url,
        children: [
          new TextRun({
            text: normalizeDashes(url),
            font: FONT,
            size: 28,
            color: LINK,
            underline: {},
          }),
        ],
      }),
    ],
  });
}

function imageType(mimeType: string): "jpg" | "png" | "gif" | "bmp" {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("bmp")) return "bmp";
  return "jpg";
}

function imagePara(image: ResolvedImage, maxWidth = 560) {
  const size = imageSize(image.data);
  const srcW = size.width ?? maxWidth;
  const srcH = size.height ?? Math.round(maxWidth * 0.56);
  const width = Math.min(maxWidth, srcW);
  const height = Math.max(1, Math.round((srcH / srcW) * width));
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
    children: [
      new ImageRun({
        type: imageType(image.mimeType),
        data: image.data,
        transformation: { width, height },
      }),
    ],
  });
}

function scoreCell(text: string, header = false, bold = false) {
  return new TableCell({
    width: { size: 1984, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: header ? { type: ShadingType.CLEAR, fill: TABLE_FILL } : undefined,
    borders: {
      top: hairline,
      bottom: hairline,
      left: hairline,
      right: hairline,
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [run(text, { size: 24, bold })],
      }),
    ],
  });
}

function scoreTable(item: NewsItemInput) {
  const total = formatScore(averageScore(item));
  return new Table({
    width: { size: 9923, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [2117, 1981, 1974, 2433, 1418],
    rows: [
      new TableRow({
        height: {
          value: 508,
          rule: "auto",
        },
        children: [
          scoreCell("Применимость технологии", true),
          scoreCell("Зрелость технологии", true),
          scoreCell("Легкость внедрения", true),
          scoreCell("Глубина трансформации", true),
          scoreCell("ИТОГО", true, true),
        ],
      }),
      new TableRow({
        height: {
          value: 508,
          rule: "auto",
        },
        children: [
          scoreCell(String(parseScore(item.applicability))),
          scoreCell(String(parseScore(item.maturity))),
          scoreCell(String(parseScore(item.implementation))),
          scoreCell(String(parseScore(item.transformation))),
          scoreCell(total, false, true),
        ],
      }),
    ],
  });
}

function itemLinks(item: NewsItemInput) {
  const links = [item.link, ...(item.extra_links ?? [])]
    .map((link) => link?.trim())
    .filter((link): link is string => Boolean(link));
  return [...new Set(links)].map(linkPara);
}

function datesFromItems(items: NewsItemInput[], meta: DigestMeta) {
  return resolveCoverDates(items, meta);
}

function cover(meta: DigestMeta, items: NewsItemInput[], coverImage: Buffer) {
  const { start, end, provision } = datesFromItems(items, meta);
  const subtitle =
    meta.subtitle ??
    "«по трендам в ИТ-отрасли: обзор инструментов и технологий»";
  const children: Paragraph[] = [
    new Paragraph({
      indent: COVER_INDENT,
      children: [run("Предоставляется еженедельно", { bold: true })],
    }),
    new Paragraph({
      indent: COVER_INDENT,
      children: [
        run("Службой директора по цифровой трансформации", { bold: true }),
      ],
    }),
    emptyPara(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("ЕЖЕНЕДЕЛЬНЫЙ ДАЙДЖЕСТ", { bold: true, size: 48 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 240 },
      children: [run(subtitle, { bold: true, size: 40 })],
    }),
    imagePara({ data: coverImage, mimeType: "image/jpeg" }, 576),
    emptyPara(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        run(`Дата предоставления: ${formatRuDate(provision)}`, { bold: true }),
      ],
    }),
  ];

  if (start && end) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 400 },
        children: [
          run(`за период с ${formatRuDate(start)} по ${formatRuDate(end)}`, {
            bold: true,
          }),
        ],
      })
    );
  }

  children.push(
    emptyPara(),
    new Paragraph({
      pageBreakBefore: true,
      spacing: { before: 100, after: 280 },
      indent: FLUSH_INDENT,
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 12,
          space: 1,
          color: "auto",
        },
      },
      children: [
        run(
          "Ключевые информационные поводы, отражающие инновации в сфере ИТ-отрасли: обзор инструментов и технологий",
          { bold: true }
        ),
      ],
    })
  );

  return children;
}

function overview(items: NewsItemInput[]) {
  const children: Array<Paragraph | Table> = [
    heading1("Обзор инструментов, сервисов и методов"),
  ];
  for (const item of items) {
    children.push(heading2(item.name));
    for (const para of toParagraphs(item.short_description))
      children.push(bodyPara(para));
    children.push(
      scoreTable(item),
      emptyPara(),
      ...itemLinks(item),
      emptyPara()
    );
  }
  return children;
}

function details(items: NewsItemInput[], images: Array<ResolvedImage | null>) {
  const children: Array<Paragraph | Table> = [
    heading1("Детальное описание и архитектура решений", {
      pageBreakBefore: true,
    }),
  ];

  items.forEach((item, index) => {
    children.push(heading2(shortName(item.name)));
    const image = images[index];
    if (image) children.push(imagePara(image, 540));

    const scope = toList(item.application_scope);
    children.push(heading3("Сфера применения"));
    if (scope.length) children.push(...scope.map(bullet));
    else children.push(bodyPara("—"));

    const similar = toList(item.similar_services);
    children.push(heading3("Похожие сервисы/технологии"));
    if (similar.length) children.push(...similar.map(bullet));
    else children.push(bodyPara("—"));

    children.push(heading3("Описание"));
    for (const para of toParagraphs(item.description))
      children.push(bodyPara(para));

    children.push(emptyPara(), ...itemLinks(item), emptyPara());
  });

  children.push(
    emptyPara(),
    new Paragraph({
      spacing: { before: 200 },
      children: [
        run(
          "*Спасибо, что дочитали этот выпуск. Надеемся, каждый нашел для себя что-то полезное. Будем благодарны за любые предложения для следующего дайджеста.",
          { size: 18 }
        ),
      ],
    })
  );

  return children;
}

export async function generateDigestDocx(
  payload: DigestMeta & { items: NewsItemInput[] },
  images: Array<ResolvedImage | null>
) {
  const coverPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../assets/cover.jpeg"
  );
  const coverImage = await readFile(coverPath);
  const items = payload.items;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 28, color: COLOR },
          paragraph: {
            spacing: { after: 240, line: 276 },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          paragraph: {
            spacing: { before: 240, after: 200 },
            outlineLevel: 0,
            indent: FLUSH_INDENT,
          },
          run: { font: FONT, bold: true, size: 28, color: COLOR },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          paragraph: {
            spacing: { before: 200, after: 160 },
            outlineLevel: 1,
            indent: FLUSH_INDENT,
          },
          run: { font: FONT, bold: true, size: 28, color: COLOR },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          paragraph: {
            spacing: { before: 160, after: 80 },
            outlineLevel: 2,
            indent: FLUSH_INDENT,
          },
          run: { font: FONT, bold: true, size: 27, color: COLOR },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "headings",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: FLUSH_INDENT },
                run: { font: FONT, bold: true, color: COLOR },
              },
            },
            {
              level: 1,
              format: LevelFormat.DECIMAL,
              text: "%1.%2",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: FLUSH_INDENT },
                run: { font: FONT, bold: true, color: COLOR },
              },
            },
          ],
        },
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: FLUSH_INDENT },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 1134,
              right: 850,
              bottom: 1134,
              left: PAGE_MARGIN_LEFT,
              header: 708,
              footer: 708,
            },
            borders: {
              pageBorders: {
                display: PageBorderDisplay.ALL_PAGES,
                offsetFrom: PageBorderOffsetFrom.PAGE,
              },
              pageBorderTop: {
                style: BorderStyle.SINGLE,
                size: 24,
                color: BLUE,
                space: 24,
              },
              pageBorderBottom: {
                style: BorderStyle.SINGLE,
                size: 24,
                color: BLUE,
                space: 24,
              },
              pageBorderLeft: {
                style: BorderStyle.SINGLE,
                size: 24,
                color: BLUE,
                space: 24,
              },
              pageBorderRight: {
                style: BorderStyle.SINGLE,
                size: 24,
                color: BLUE,
                space: 24,
              },
            },
          },
          titlePage: true,
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    color: COLOR,
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...cover(payload, items, coverImage),
          ...overview(items),
          ...details(items, images),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
