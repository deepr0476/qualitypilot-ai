/**
 * pdf-generator.js
 * 
 * Quality X — Enterprise Multi-Page PDF QA Execution Report Generator
 * Powered by PDFKit.
 * 
 * Generates high-contrast, client-ready professional test execution reports
 * featuring:
 *   - Executive Cover Header & Connected Org Details
 *   - Execution KPI Summary (Pass Rate, Totals, Badges)
 *   - Structured Step Execution Tables
 *   - Inline Step Screenshots (embedded from disk)
 *   - Video Artifact Links (.webm)
 *   - Defect Analysis & Self-Healing Telemetry
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generatePdfReport(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Quality X QA Report - ${reportData.runId || 'Run'}`,
          Author: 'Quality X Enterprise QA Platform',
          Subject: 'Salesforce QA & Self-Healing Execution Report',
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const {
        summary = {},
        results = [],
        runId = 'run',
        ticketId = 'Salesforce_QA',
        salesforceUrl = '',
        generatedAt = new Date().toISOString(),
        videoUrl = '',
        connectedOrg = null,
        testData = '',
      } = reportData;

      const passRate = summary.passRate !== undefined ? summary.passRate : (summary.total ? Math.round((summary.passed / summary.total) * 100) : 0);
      const isFullPass = passRate === 100;

      // ── Colors ────────────────────────────────────────────────────────
      const primaryColor = '#4338CA'; // Indigo 700
      const secondaryColor = '#6366F1'; // Indigo 500
      const darkText = '#0F172A'; // Slate 900
      const mutedText = '#64748B'; // Slate 500
      const lightBg = '#F8FAFC'; // Slate 50
      const cardBorder = '#CBD5E1'; // Slate 300
      const passGreen = '#16A34A'; // Green 600
      const failRed = '#DC2626'; // Red 600

      // ── Header Banner ─────────────────────────────────────────────────
      doc.rect(40, 40, 515, 80).fill('#1E1E2D');

      doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold')
        .text('QUALITY X — ENTERPRISE QA REPORT', 55, 52);

      doc.fillColor('#A5B4FC').fontSize(10).font('Helvetica')
        .text('Three Minds. Zero Defects. · Multi-Agent Salesforce Automation & Self-Healing Engine', 55, 78);

      doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
        .text(`Run ID: ${runId}   |   Generated: ${new Date(generatedAt).toLocaleString()}`, 55, 96);

      let currentY = 135;

      // ── Connected Salesforce Org Section ──────────────────────────────
      doc.rect(40, currentY, 515, 65).fill(lightBg).stroke(cardBorder);

      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
        .text('CONNECTED SALESFORCE ORG & ENVIRONMENT', 55, currentY + 10);

      const targetUser = connectedOrg?.username || reportData.username || 'Salesforce QA User';
      const targetDomain = connectedOrg?.instanceUrl || salesforceUrl || 'https://salesforce.com';
      const targetOrgName = connectedOrg?.orgName || reportData.orgName || 'Live Salesforce Org';
      const targetAuth = connectedOrg?.authMethod || reportData.authMethod || 'Direct Credentials / Session';

      doc.fillColor(darkText).fontSize(9).font('Helvetica-Bold').text('Target Org: ', 55, currentY + 28);
      doc.font('Helvetica').text(`${targetOrgName} (${targetDomain})`, 115, currentY + 28);

      doc.font('Helvetica-Bold').text('Active User: ', 55, currentY + 44);
      doc.font('Helvetica').text(`${targetUser}   |   Auth Method: ${targetAuth}`, 115, currentY + 44);

      currentY += 80;

      // ── Execution KPI Summary ─────────────────────────────────────────
      doc.rect(40, currentY, 515, 60).fill('#F1F5F9').stroke(cardBorder);

      const totalTests = summary.total || results.length || 0;
      const passedTests = summary.passed || results.filter(r => r.status === 'PASS').length || 0;
      const failedTests = summary.failed || results.filter(r => r.status === 'FAIL').length || 0;

      // Total Box
      doc.fillColor(darkText).fontSize(14).font('Helvetica-Bold').text(`${totalTests}`, 65, currentY + 12);
      doc.fontSize(8).font('Helvetica').fillColor(mutedText).text('TOTAL SCENARIOS', 65, currentY + 32);

      // Passed Box
      doc.fillColor(passGreen).fontSize(14).font('Helvetica-Bold').text(`${passedTests}`, 180, currentY + 12);
      doc.fontSize(8).font('Helvetica').fillColor(mutedText).text('PASSED SCENARIOS', 180, currentY + 32);

      // Failed Box
      doc.fillColor(failRed).fontSize(14).font('Helvetica-Bold').text(`${failedTests}`, 305, currentY + 12);
      doc.fontSize(8).font('Helvetica').fillColor(mutedText).text('FAILED SCENARIOS', 305, currentY + 32);

      // Pass Rate Badge
      const badgeColor = isFullPass ? passGreen : (passRate >= 60 ? '#D97706' : failRed);
      doc.rect(420, currentY + 10, 120, 40).fill(badgeColor);
      doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(`${passRate}%`, 430, currentY + 16, { width: 100, align: 'center' });
      doc.fontSize(8).font('Helvetica-Bold').text(isFullPass ? 'ALL TESTS PASSED' : 'NEEDS ATTENTION', 430, currentY + 34, { width: 100, align: 'center' });

      currentY += 75;

      // ── Injected Test Data (if any) ───────────────────────────────────
      if (testData) {
        doc.rect(40, currentY, 515, 30).fill('#EDE9FE').stroke('#C4B5FD');
        doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
          .text('INJECTED TEST DATA: ', 50, currentY + 10, { continued: true })
          .font('Helvetica').fillColor(darkText).text(`${testData.slice(0, 110)}`);
        currentY += 40;
      }

      // ── Video Recording Link ──────────────────────────────────────────
      if (videoUrl) {
        doc.rect(40, currentY, 515, 24).fill('#E0E7FF').stroke('#A5B4FC');
        doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
          .text(`🎥 EXECUTION VIDEO ARTIFACT CAPTURED: ${videoUrl}`, 50, currentY + 7);
        currentY += 34;
      }

      // ── Test Cases Details ────────────────────────────────────────────
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold')
        .text('DETAILED TEST SCENARIO RESULTS', 40, currentY);
      currentY += 18;

      for (let i = 0; i < results.length; i++) {
        const tc = results[i];
        const isPass = tc.status === 'PASS';
        const cardHeight = tc.screenshotPath && fs.existsSync(tc.screenshotPath) ? 270 : 130;

        // Page break check
        if (currentY + cardHeight > 760) {
          doc.addPage();
          currentY = 40;
        }

        // Test card container
        doc.rect(40, currentY, 515, cardHeight).fill('#FFFFFF').stroke(isPass ? '#86EFAC' : '#FCA5A5');

        // Card header row
        doc.rect(40, currentY, 515, 26).fill(isPass ? '#DCFCE7' : '#FEE2E2');
        doc.fillColor(isPass ? passGreen : failRed).fontSize(10).font('Helvetica-Bold')
          .text(`[${tc.status}]  ${tc.id}: ${tc.name || tc.description || 'Test Scenario'}`, 50, currentY + 8);

        const durationSec = tc.duration ? `${(tc.duration / 1000).toFixed(1)}s` : 'N/A';
        doc.fillColor(darkText).fontSize(8).font('Helvetica')
          .text(`Duration: ${durationSec}   |   Target: ${tc.targetStep || 'Salesforce Flow'}`, 380, currentY + 9, { align: 'right', width: 165 });

        let innerY = currentY + 34;

        // Steps preview
        doc.fillColor(mutedText).fontSize(8).font('Helvetica-Bold').text('ACTION STEPS EXECUTED:', 50, innerY);
        innerY += 12;

        const steps = tc.steps || tc.stepLogs || [];
        const stepSubset = steps.slice(0, 4);
        for (const step of stepSubset) {
          doc.fillColor(darkText).fontSize(8).font('Helvetica')
            .text(`• ${String(step).slice(0, 95)}`, 55, innerY);
          innerY += 12;
        }

        if (tc.error) {
          doc.fillColor(failRed).fontSize(8).font('Helvetica-Bold')
            .text(`Error: ${tc.error.slice(0, 110)}`, 55, innerY);
          innerY += 14;
        }

        // Inline Screenshot
        if (tc.screenshotPath && fs.existsSync(tc.screenshotPath)) {
          try {
            doc.image(tc.screenshotPath, 55, innerY + 4, {
              fit: [500, 120],
              align: 'center',
            });
            innerY += 130;
          } catch (_) {}
        }

        currentY += cardHeight + 15;
      }

      // ── Page Numbers ──────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor(mutedText).fontSize(8).font('Helvetica')
          .text(`Quality X Automated QA Report  •  Page ${i + 1} of ${range.count}`, 40, 800, {
            align: 'center',
            width: 515,
          });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePdfReport,
};
