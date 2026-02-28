/**
 * PDF Export Service — Generate loss report PDF
 * Uses jsPDF library for PDF generation
 * Report format based on KMGI-QCLP-PO-00-115-V2 Annex 3
 */

import { getProduct } from '../data/products.js';
import { getDivision } from '../data/divisions.js';
import { getLocation } from '../data/locations.js';
import { getTransportLabel } from '../data/routes.js';
import { getLossStatusDisplay } from '../domain/loss-evaluator.js';
import { formatMass, formatVolume, formatDensity, formatTemperature, formatLossPercent } from '../domain/formatters.js';

/**
 * Generate PDF report for a completed shipment
 * @param {object} shipment - Completed shipment with results
 */
export async function exportShipmentPDF(shipment) {
    // Dynamic import of jsPDF to keep bundle small
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // ── Header ────────────────────────────────────────────────
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PETROLEUM PRODUCT LOSS REPORT', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('KMGI Quality Control & Loss Prevention', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // ── Shipment Details ──────────────────────────────────────
    const division = getDivision(shipment.division);
    const product = getProduct(shipment.product);
    const fromLoc = getLocation(shipment.fromLocation);
    const toLoc = getLocation(shipment.toLocation);
    const transport = getTransportLabel(shipment.transportType);
    const lossDisplay = getLossStatusDisplay(shipment.lossStatus);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. SHIPMENT INFORMATION', margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const details = [
        ['Date:', new Date(shipment.date).toLocaleDateString('en-GB')],
        ['Division:', division ? `${division.code} — ${division.name}` : shipment.division],
        ['Product:', product ? product.name : shipment.product],
        ['Transport:', transport ? `${transport.icon} ${transport.name}` : shipment.transportType],
        ['Route:', `${fromLoc?.name || shipment.fromLocation} → ${toLoc?.name || shipment.toLocation}`],
        ['Batch / BL:', shipment.batchNumber || shipment.blNumber || '—'],
        ['Season:', shipment.season === 'summer' ? 'Summer (01 May – 30 Sept)' : 'Winter (01 Oct – 30 Apr)'],
    ];

    details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), margin + 35, y);
        y += 5;
    });

    y += 5;

    // ── Measurement Table ─────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. MEASUREMENT DATA', margin, y);
    y += 7;

    // Table headers
    const colWidths = [45, 45, 45, 45];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Parameter', colX[0], y);
    doc.text('Loaded', colX[1], y);
    doc.text('Unloaded', colX[2], y);
    doc.text('Difference', colX[3], y);
    y += 2;

    doc.setDrawColor(0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');

    if (shipment.result) {
        const r = shipment.result;
        const A = r.A || r.points?.[0];
        const B = r.B || r.points?.[r.points.length - 1];

        if (A && B) {
            const rows = [
                ['Mass (KG)', formatMass(A.massKg), formatMass(B.massKg), formatMass(r.deltaMassKg || (B.massKg - A.massKg))],
                ['Density @15°C (kg/l)', formatDensity(A.density15), formatDensity(B.density15), '—'],
                ['Temperature (°C)', formatTemperature(A.temperature), formatTemperature(B.temperature), '—'],
                ['Volume @15°C (L)', formatVolume(A.v15Liters), formatVolume(B.v15Liters), formatVolume(r.deltaV15 || (B.v15Liters - A.v15Liters))],
                ['Volume @T°C (L)', formatVolume(A.vFactLiters), formatVolume(B.vFactLiters), formatVolume(r.deltaVFact || (B.vFactLiters - A.vFactLiters))],
            ];

            rows.forEach(row => {
                doc.setFont('helvetica', 'bold');
                doc.text(row[0], colX[0], y);
                doc.setFont('helvetica', 'normal');
                doc.text(row[1], colX[1], y);
                doc.text(row[2], colX[2], y);
                doc.text(row[3], colX[3], y);
                y += 5;
            });
        }
    }

    y += 5;

    // ── Loss Evaluation ───────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. LOSS EVALUATION', margin, y);
    y += 7;

    doc.setFontSize(9);

    if (shipment.result?.evaluation) {
        const ev = shipment.result.evaluation;
        const evalDetails = [
            ['Loss (%):', formatLossPercent(ev.lossPercent)],
            ['Status:', `${lossDisplay.icon} ${lossDisplay.label}`],
            ['Internal Limit:', ev.internalLimit !== null ? `${ev.internalLimit}%` : 'N/A'],
            ['Contractual Limit:', ev.contractualLimit !== null ? `${ev.contractualLimit}%` : 'N/A'],
            ['Season:', ev.season === 'summer' ? 'Summer' : 'Winter'],
        ];

        evalDetails.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), margin + 40, y);
            y += 5;
        });

        y += 3;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(ev.message, margin, y);
    }

    y += 15;

    // ── Signatures ────────────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('4. SIGNATURES', margin, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const sigWidth = (pageWidth - 2 * margin) / 3;
    ['Surveyor (Loading)', 'Surveyor (Unloading)', 'Manager'].forEach((role, i) => {
        const x = margin + i * sigWidth;
        doc.text(role, x, y);
        doc.line(x, y + 12, x + sigWidth - 10, y + 12);
        doc.text('Name:', x, y + 17);
        doc.text('Date:', x, y + 22);
    });

    y += 30;

    // ── Footer ────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(
        `Generated by OilCalcApp v2.0 — ${new Date().toLocaleString('en-GB')}`,
        pageWidth / 2, 285,
        { align: 'center' }
    );

    // ── Save ──────────────────────────────────────────────────
    const fileName = `Loss_Report_${shipment.division}_${shipment.batchNumber || shipment.id.slice(0, 8)}_${new Date(shipment.date).toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    return fileName;
}
