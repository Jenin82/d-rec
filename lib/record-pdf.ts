export type RecordPdfData = {
  programTitle: string;
  aim: string;
  algorithm: string;
  code: string;
  language: string;
  input: string;
  output: string;
  createdAt?: string;
};

type SingleRecordPdfOptions = {
  filePrefix?: string;
};

type FullRecordPdfOptions = {
  classroomName: string;
  records: RecordPdfData[];
  filePrefix?: string;
};

type Doc = {
  addPage: () => void;
  internal: { pageSize: { getWidth: () => number } };
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  save: (name: string) => void;
  setDrawColor: (gray: number) => void;
  setFont: (fontName: string, fontStyle: "normal" | "bold") => void;
  setFontSize: (size: number) => void;
  splitTextToSize: (text: string, maxWidth: number) => string[];
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: "left" | "center" | "right" },
  ) => void;
};

const PAGE_BOTTOM = 270;
const MARGIN = 20;

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureSpace(doc: Doc, y: number, neededHeight = 10) {
  if (y + neededHeight <= PAGE_BOTTOM) {
    return y;
  }

  doc.addPage();
  return MARGIN;
}

function writeHeading(doc: Doc, y: number, text: string) {
  const safeY = ensureSpace(doc, y, 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(text, MARGIN, safeY);
  return safeY + 7;
}

function writeBodyText(doc: Doc, y: number, text: string, lineWidth: number) {
  const lines = doc.splitTextToSize(text || "-", lineWidth);
  doc.setFontSize(9);
  doc.setFont("courier", "normal");

  let cursorY = y;
  for (const line of lines) {
    cursorY = ensureSpace(doc, cursorY, 5);
    doc.text(line, MARGIN, cursorY);
    cursorY += 4.5;
  }

  return cursorY + 6;
}

function writeRecordSection(
  doc: Doc,
  record: RecordPdfData,
  includeTitle = true,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  if (includeTitle) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(record.programTitle, pageWidth / 2, y, { align: "center" });
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const datePart = record.createdAt
      ? ` | Date: ${new Date(record.createdAt).toLocaleDateString()}`
      : "";
    doc.text(
      `Language: ${record.language.toUpperCase()}${datePart}`,
      pageWidth / 2,
      y,
      { align: "center" },
    );
    y += 10;

    doc.setDrawColor(200);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 8;
  }

  y = writeHeading(doc, y, "Aim");
  y = writeBodyText(doc, y, record.aim, lineWidth);

  y = writeHeading(doc, y, "Algorithm");
  y = writeBodyText(doc, y, record.algorithm, lineWidth);

  y = writeHeading(doc, y, `Source Code (${record.language.toUpperCase()})`);
  y = writeBodyText(doc, y, record.code, lineWidth);

  y = writeHeading(doc, y, "Input");
  y = writeBodyText(doc, y, record.input, lineWidth);

  y = writeHeading(doc, y, "Output");
  writeBodyText(doc, y, record.output, lineWidth);
}

export async function downloadSingleRecordPdf(
  record: RecordPdfData,
  options: SingleRecordPdfOptions = {},
) {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF() as unknown as Doc;

  // Single record PDF should start directly with the problem title.
  writeRecordSection(doc, record, true);

  const prefix = options.filePrefix ?? "record";
  doc.save(`${prefix}-${sanitizeFileName(record.programTitle)}.pdf`);
}

export async function downloadFullRecordPdf(options: FullRecordPdfOptions) {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF() as unknown as Doc;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(options.classroomName, pageWidth / 2, MARGIN, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Full Record Book", pageWidth / 2, MARGIN + 8, { align: "center" });

  options.records.forEach((record) => {
    doc.addPage();
    writeRecordSection(doc, record, true);
  });

  const prefix = options.filePrefix ?? "full-record";
  doc.save(`${prefix}-${sanitizeFileName(options.classroomName)}.pdf`);
}
