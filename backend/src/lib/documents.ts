import { randomUUID } from 'node:crypto';
import { storeBinaryAsset } from './storage.js';

function escapePdfText(input: string) {
  return input.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(lines: string[]) {
  const content = ['BT', '/F1 16 Tf', '50 780 Td'];
  lines.forEach((line, index) => {
    if (index > 0) content.push('0 -24 Td');
    content.push(`(${escapePdfText(line)}) Tj`);
  });
  content.push('ET');
  const stream = content.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export async function generateMouPdf(input: {
  collegeName: string;
  industryName: string;
  coordinatorName: string;
}) {
  const fileName = `mou-${randomUUID()}.pdf`;
  const buffer = buildPdf([
    'InternSuite Memorandum of Understanding',
    `College: ${input.collegeName}`,
    `Industry: ${input.industryName}`,
    `Approved by: ${input.coordinatorName}`,
    `Issued on: ${new Date().toISOString().slice(0, 10)}`,
    'This document confirms internship collaboration approval.',
  ]);
  return storeBinaryAsset({ fileName, buffer, contentType: 'application/pdf' });
}

export async function generateOfferLetterPdf(input: {
  studentName: string;
  opportunityTitle: string;
  industryName: string;
}) {
  const fileName = `offer-letter-${randomUUID()}.pdf`;
  const buffer = buildPdf([
    'InternSuite Offer Letter',
    `Student: ${input.studentName}`,
    `Opportunity: ${input.opportunityTitle}`,
    `Industry: ${input.industryName}`,
    `Issued on: ${new Date().toISOString().slice(0, 10)}`,
    'You have been accepted for the internship opportunity listed above.',
  ]);
  return storeBinaryAsset({ fileName, buffer, contentType: 'application/pdf' });
}
