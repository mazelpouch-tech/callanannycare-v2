import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, Copy, Check, QrCode, ExternalLink } from "lucide-react";

export default function AdminQRCode() {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const bookingUrl = `${window.location.origin}/book`;
  const parentFormUrl = `${window.location.origin}/parent-form`;

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (id: string, filename: string) => {
    const svg = document.getElementById(id);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
      }
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - Call a Nanny</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
            .qr-section { page-break-inside: avoid; margin-bottom: 60px; }
            h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 8px; }
            h2 { font-size: 20px; color: #444; margin-bottom: 4px; }
            p { font-size: 14px; color: #666; margin-bottom: 24px; }
            .url { font-size: 12px; color: #999; word-break: break-all; margin-top: 16px; }
            svg { margin: 0 auto; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="qr-section">
            <h1>Call a Nanny</h1>
            <h2>Book a Nanny</h2>
            <p>Scan to book a trusted nanny for your children</p>
            ${document.getElementById("qr-booking")?.outerHTML || ""}
            <p class="url">${bookingUrl}</p>
          </div>
          <div class="qr-section">
            <h2>Parent Registration Form</h2>
            <p>Scan to fill out the parent information form</p>
            ${document.getElementById("qr-parent-form")?.outerHTML || ""}
            <p class="url">${parentFormUrl}</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">QR Codes</h1>
        <p className="text-muted-foreground mt-1">
          Print or download QR codes for parents to scan and book instantly.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-warm"
        >
          <Printer className="w-4 h-4" />
          Print All QR Codes
        </button>
      </div>

      {/* QR Code Cards */}
      <div className="grid md:grid-cols-2 gap-6" ref={qrRef}>
        {/* Booking QR */}
        <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 gradient-warm rounded-xl flex items-center justify-center mb-4 shadow-warm">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-serif font-bold text-foreground mb-1">Book a Nanny</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Parents scan this to go directly to the booking page
          </p>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <QRCodeSVG
              id="qr-booking"
              value={bookingUrl}
              size={220}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
            />
          </div>

          <p className="text-xs text-muted-foreground font-mono break-all mb-4 px-4">
            {bookingUrl}
          </p>

          <div className="flex gap-2 w-full">
            <button
              onClick={() => handleDownload("qr-booking", "qr-book-nanny.png")}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => handleCopy(bookingUrl)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Parent Form QR */}
        <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-secondary/80 rounded-xl flex items-center justify-center mb-4">
            <ExternalLink className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-serif font-bold text-foreground mb-1">Parent Form</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Parents scan this to fill the registration / child info form
          </p>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <QRCodeSVG
              id="qr-parent-form"
              value={parentFormUrl}
              size={220}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
            />
          </div>

          <p className="text-xs text-muted-foreground font-mono break-all mb-4 px-4">
            {parentFormUrl}
          </p>

          <div className="flex gap-2 w-full">
            <button
              onClick={() => handleDownload("qr-parent-form", "qr-parent-form.png")}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={() => handleCopy(parentFormUrl)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-3">Tips for using QR codes</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            Print and place at hotel reception desks, lobbies, or concierge areas
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            Add to flyers, business cards, or brochures for quick access
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            Share the booking link via WhatsApp or email for remote bookings
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            The QR codes automatically use your current domain — no setup needed
          </li>
        </ul>
      </div>
    </div>
  );
}
