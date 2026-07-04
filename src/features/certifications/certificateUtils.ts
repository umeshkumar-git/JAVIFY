/**
 * Javify Certificate Utilities — QR, PNG, PDF generation
 */
import type { EarnedCertificate, CertTrack } from "./certifications.data";
import { buildCertificateFileName } from "./certifications.data";

// ── QR Code (simple text-based for display) ─────────────────────────────────────
// Returns a small SVG QR code placeholder (in production use qrcode-generator library)
export function generateQRCodeSVG(data: string): string {
  // This creates a visual placeholder QR representation
  // In production, replace with: import QRCode from 'qrcode';
  const hash = data.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const size = 100;
  const cellSize = 4;
  const modules: boolean[][] = [];
  for (let y = 0; y < size / cellSize; y++) {
    modules[y] = [];
    for (let x = 0; x < size / cellSize; x++) {
      modules[y][x] = ((hash * (x + 1) * (y + 1) * 7) % 3) !== 0;
    }
  }
  // Add finder patterns (3 corners)
  const addFinder = (ox: number, oy: number) => {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const isBorder = dy === 0 || dy === 6 || dx === 0 || dx === 6;
        const isInner = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
        modules[oy + dy][ox + dx] = isBorder || isInner;
      }
    }
  };
  addFinder(0, 0);
  addFinder(size / cellSize - 7, 0);
  addFinder(0, size / cellSize - 7);

  let path = '';
  for (let y = 0; y < modules.length; y++) {
    for (let x = 0; x < modules[y].length; x++) {
      if (modules[y][x]) {
        path += `M${x * cellSize},${y * cellSize}h${cellSize}v${cellSize}h-${cellSize}z`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/><path d="${path}" fill="#0f172a"/></svg>`;
}

export function getQRCodeDataUrl(data: string): string {
  const svg = generateQRCodeSVG(data);
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ── Certificate Canvas Generation ───────────────────────────────────────────────
export function generateCertificateCanvas(
  cert: EarnedCertificate,
  track: CertTrack | undefined,
  width = 800,
  height = 600
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#1e1b4b');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = 'rgba(251,191,36,0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Inner border
  ctx.strokeStyle = 'rgba(251,191,36,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Decorative corners
  const cornerSize = 30;
  ctx.strokeStyle = 'rgba(251,191,36,0.8)';
  ctx.lineWidth = 2;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(30, 30 + cornerSize);
  ctx.lineTo(30, 30);
  ctx.lineTo(30 + cornerSize, 30);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - 30 - cornerSize, 30);
  ctx.lineTo(width - 30, 30);
  ctx.lineTo(width - 30, 30 + cornerSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(30, height - 30 - cornerSize);
  ctx.lineTo(30, height - 30);
  ctx.lineTo(30 + cornerSize, height - 30);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - 30 - cornerSize, height - 30);
  ctx.lineTo(width - 30, height - 30);
  ctx.lineTo(width - 30, height - 30 - cornerSize);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('JAVIFY', width / 2, 80);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText('CERTIFICATE OF COMPLETION', width / 2, 105);

  // Line separator
  ctx.strokeStyle = 'rgba(251,191,36,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 120, 120);
  ctx.lineTo(width / 2 + 120, 120);
  ctx.stroke();

  // Awarded to
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('AWARDED TO', width / 2, 160);

  // User name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Inter, sans-serif';
  ctx.fillText(cert.userName, width / 2, 200);

  // Certificate title
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('CERTIFICATE', width / 2, 250);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.fillText(cert.title, width / 2, 280);

  // Skills
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('SKILLS VALIDATED', width / 2, 330);

  // Skills list
  ctx.fillStyle = '#34d399';
  ctx.font = '14px Inter, sans-serif';
  const skillsText = cert.skills.join('  •  ');
  ctx.fillText(skillsText, width / 2, 355);

  // Stats row
  const statsY = 420;
  // Score
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('SCORE', width / 2 - 180, statsY);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.fillText(`${cert.score}%`, width / 2 - 180, statsY + 28);

  // Date
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('ISSUED', width / 2, statsY);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Inter, sans-serif';
  const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillText(dateStr, width / 2, statsY + 28);

  // Certificate ID
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('CERTIFICATE ID', width / 2 + 180, statsY);
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 14px Inter, monospace';
  ctx.fillText(cert.certificateId, width / 2 + 180, statsY + 28);

  // Track icon
  if (track) {
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(track.icon, 60, 60);
  }

  // Verification QR code placeholder (small box)
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(width - 140, height - 130, 100, 100);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '8px Inter, sans-serif';
  ctx.fillText('QR VERIFY', width - 90, height - 75);

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('Javify Platform · javify.dev · Digitally Verified', width / 2, height - 45);

  // Bottom line
  ctx.strokeStyle = 'rgba(251,191,36,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, height - 60);
  ctx.lineTo(width - 60, height - 60);
  ctx.stroke();

  ctx.textAlign = 'left';
  return canvas;
}

// ── PNG Download ────────────────────────────────────────────────────────────────
/**
 * Renders the certificate to a high-res canvas and triggers a PNG download
 * with a meaningful filename: Certificate_<UserName>_<CourseName>.png
 * Returns true on success, throws on failure.
 */
export function downloadCertificatePNG(cert: EarnedCertificate, track: CertTrack | undefined): boolean {
  const canvas = generateCertificateCanvas(cert, track);
  const link = document.createElement('a');
  link.download = buildCertificateFileName(cert, 'png');
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

// ── PDF Download (uses the browser print dialog for a true PDF export) ─────────
/**
 * Opens a print-optimized window containing the certificate image. The user can
 * use the browser's "Save as PDF" or "Print" option from the dialog. This avoids
 * shipping a heavy PDF library while still producing a real PDF.
 *
 * Throws if the popup is blocked so callers can show a friendly error toast.
 */
export function downloadCertificatePDF(cert: EarnedCertificate, track: CertTrack | undefined): boolean {
  const canvas = generateCertificateCanvas(cert, track);
  const dataUrl = canvas.toDataURL('image/png');
  const pdfFileName = buildCertificateFileName(cert, 'pdf');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups for this site to download the PDF.');
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${pdfFileName}</title>
      <style>
        * { margin: 0; padding: 0; }
        @media print {
          @page { size: landscape; margin: 0; }
          body { margin: 0; }
          .no-print { display: none; }
        }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f172a; }
        img { max-width: 100%; height: auto; }
        .btn { padding: 12px 24px; background: #fbbf24; color: #0f172a; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin: 10px; }
        .btn:hover { background: #f59e0b; }
        .actions { text-align: center; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="actions no-print">
        <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <button class="btn" onclick="window.close()">✕ Close</button>
      </div>
      <img src="${dataUrl}" alt="Certificate" />
    </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}

// ── Share Analytics Helpers ─────────────────────────────────────────────────────
export interface ShareAnalytics {
  totalShares: number;
  linkedInShares: number;
  githubShares: number;
  twitterShares: number;
  pdfDownloads: number;
  pngDownloads: number;
  certificateViews: number;
}

const ANALYTICS_KEY = "javify-share-analytics";

export function loadShareAnalytics(): ShareAnalytics {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : defaultAnalytics();
  } catch {
    return defaultAnalytics();
  }
}

function defaultAnalytics(): ShareAnalytics {
  return { totalShares: 0, linkedInShares: 0, githubShares: 0, twitterShares: 0, pdfDownloads: 0, pngDownloads: 0, certificateViews: 0 };
}

export function saveShareAnalytics(a: ShareAnalytics): void {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(a));
}

export function trackShare(platform: 'linkedin' | 'github' | 'twitter' | 'copy'): void {
  const a = loadShareAnalytics();
  a.totalShares++;
  a.certificateViews++;
  if (platform === 'linkedin') a.linkedInShares++;
  else if (platform === 'github') a.githubShares++;
  else if (platform === 'twitter') a.twitterShares++;
  saveShareAnalytics(a);
}

export function trackDownload(type: 'pdf' | 'png'): void {
  const a = loadShareAnalytics();
  if (type === 'pdf') a.pdfDownloads++;
  else a.pngDownloads++;
  saveShareAnalytics(a);
}

export function trackCertificateView(): void {
  const a = loadShareAnalytics();
  a.certificateViews++;
  saveShareAnalytics(a);
}
