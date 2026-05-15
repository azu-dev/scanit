import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  CheckCircle,
  Copy,
  RefreshCw,
  Scan,
  AlertCircle,
  Loader2,
  Zap,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type ScannerStateType = 'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR';

interface ScanResult {
  text: string;
  format: string;
}

const SCANNER_ELEMENT_ID = 'qr-reader-element';

export default function Scanner() {
  const [state, setState] = useState<ScannerStateType>('IDLE');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [isStarting, setIsStarting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  // Cleanup scanner instance
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (_) {
        // Already stopped
      }
      isScanningRef.current = false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const saveToSupabase = async (text: string, format: string) => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const { error } = await supabase.from('scanned_items').insert({
        raw_value: text,
        format: format,
        scanned_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaveStatus('saved');
    } catch (err) {
      console.error('[Supabase] Insert failed:', err);
      setSaveStatus('failed');
    } finally {
      setIsSaving(false);
    }
  };

  const startScanner = async () => {
    if (isScanningRef.current || isStarting) return;
    setIsStarting(true);
    setErrorMsg('');
    setState('SCANNING');

    // Small delay to let the DOM mount the scanner element
    await new Promise((r) => setTimeout(r, 150));

    try {
      const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.AZTEC,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText, decodedResult) => {
          if (!isScanningRef.current) return;

          const format =
            decodedResult?.result?.format?.formatName ?? 'UNKNOWN';
          const scanResult: ScanResult = { text: decodedText, format };

          stopScanner();
          setResult(scanResult);
          setState('SUCCESS');
          saveToSupabase(decodedText, format);
        },
        () => {
          // Per-frame error (no code found) — suppress
        }
      );

      isScanningRef.current = true;
    } catch (err: unknown) {
      isScanningRef.current = false;
      const msg = err instanceof Error ? err.message : String(err);

      if (
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('denied') ||
        msg.toLowerCase().includes('notallowed')
      ) {
        setErrorMsg('Camera access was denied. Please allow camera access in your browser settings and try again.');
      } else if (
        msg.toLowerCase().includes('notfound') ||
        msg.toLowerCase().includes('no camera')
      ) {
        setErrorMsg('No camera was found on this device.');
      } else {
        setErrorMsg(`Unable to start camera: ${msg}`);
      }
      setState('ERROR');
    } finally {
      setIsStarting(false);
    }
  };

  const handleScanAnother = async () => {
    await stopScanner();
    setResult(null);
    setCopied(false);
    setSaveStatus('idle');
    setState('IDLE');
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = result.text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-md mx-auto px-4 py-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex items-center gap-3 mb-6 animate-slide-down">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/25">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">ScanIt</h1>
          <p className="text-xs text-slate-400">Barcode &amp; QR Code Scanner</p>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col gap-5">

        {/* ── IDLE STATE ─────────────────────────────────── */}
        {state === 'IDLE' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-8 animate-fade-in-up">

            {/* Hero illustration */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-56 h-56 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-600/5 blur-2xl" />
              <div className="relative w-48 h-48 rounded-3xl glass-card flex items-center justify-center border border-green-500/20">
                {/* Viewfinder corners */}
                <div className="absolute inset-6">
                  <div className="viewfinder-corner tl" />
                  <div className="viewfinder-corner tr" />
                  <div className="viewfinder-corner bl" />
                  <div className="viewfinder-corner br" />
                </div>
                <Scan size={56} className="text-slate-500" strokeWidth={1.2} />
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Ready to Scan</h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Tap the button below to activate your camera and scan any barcode or QR code instantly.
              </p>
            </div>

            {/* Supported formats */}
            <div className="flex flex-wrap gap-2 justify-center">
              {['QR Code', 'EAN-13', 'Code 128', 'UPC-A', 'PDF 417', 'Data Matrix'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700"
                >
                  {fmt}
                </span>
              ))}
            </div>

            {/* Start button */}
            <button
              id="start-scanner-btn"
              onClick={startScanner}
              className="
                relative w-full max-w-xs py-4 px-6 rounded-2xl font-semibold text-white text-base
                bg-gradient-to-r from-green-500 to-emerald-600
                shadow-lg shadow-green-500/30
                hover:shadow-green-500/50 hover:scale-[1.02]
                active:scale-[0.98]
                transition-all duration-200 ease-out
                flex items-center justify-center gap-3
              "
              aria-label="Start camera scanner"
            >
              <Camera size={20} />
              Start Scanner
            </button>
          </div>
        )}

        {/* ── SCANNING STATE ─────────────────────────────── */}
        {(state === 'SCANNING' || isStarting) && (
          <div className="flex flex-col gap-4 animate-fade-in-up">
            <div className="text-center">
              <p className="text-sm text-slate-400 font-medium">
                {isStarting ? 'Starting camera…' : 'Point at a barcode or QR code'}
              </p>
            </div>

            {/* Camera container */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden glass-card border border-slate-700/50">
              {/* Actual scanner element */}
              <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

              {/* Overlay: viewfinder */}
              {!isStarting && (
                <>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 bg-black/50" style={{ height: 'calc(50% - 130px)' }} />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50" style={{ height: 'calc(50% - 130px)' }} />
                    <div
                      className="absolute bg-black/50"
                      style={{ top: 'calc(50% - 130px)', left: 0, width: 'calc(50% - 130px)', height: '260px' }}
                    />
                    <div
                      className="absolute bg-black/50"
                      style={{ top: 'calc(50% - 130px)', right: 0, width: 'calc(50% - 130px)', height: '260px' }}
                    />
                    <div
                      className="absolute"
                      style={{ top: 'calc(50% - 130px)', left: 'calc(50% - 130px)', width: '260px', height: '260px' }}
                    >
                      <div className="viewfinder-corner tl" />
                      <div className="viewfinder-corner tr" />
                      <div className="viewfinder-corner bl" />
                      <div className="viewfinder-corner br" />
                      <div className="scan-line" />
                    </div>
                  </div>
                </>
              )}

              {/* Starting overlay */}
              {isStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80">
                  <Loader2 size={36} className="text-green-400 animate-spin" />
                  <p className="text-sm text-slate-300">Initializing camera…</p>
                </div>
              )}
            </div>

            {/* Cancel */}
            <button
              onClick={handleScanAnother}
              className="
                w-full py-3 rounded-xl text-slate-400 text-sm font-medium
                border border-slate-700 hover:border-slate-500 hover:text-slate-300
                transition-all duration-200
                flex items-center justify-center gap-2
              "
              aria-label="Cancel scanning"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── SUCCESS STATE ──────────────────────────────── */}
        {state === 'SUCCESS' && result && (
          <div className="flex flex-col gap-4 animate-fade-in-up">

            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/30">
              <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-400 font-semibold text-sm">Scan Successful!</p>
                <p className="text-green-300/70 text-xs mt-0.5">
                  Format: <span className="font-mono">{result.format}</span>
                  {isSaving && ' · Saving…'}
                  {saveStatus === 'saved' && ' · ✓ Saved'}
                  {saveStatus === 'failed' && ' · ⚠ Save failed'}
                </p>
              </div>
            </div>

            {/* Result card */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Decoded Value
                </span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300 font-mono">
                  {result.format}
                </span>
              </div>

              <div className="bg-slate-900/60 rounded-xl p-4 min-h-[80px] flex items-center">
                <p className="text-white font-mono text-sm break-all leading-relaxed">
                  {result.text}
                </p>
              </div>

              {isUrl(result.text) && (
                <a
                  href={result.text}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  aria-label="Open URL in new tab"
                >
                  🔗 Open Link
                </a>
              )}
            </div>

            {/* Action buttons */}
            <button
              id="copy-btn"
              onClick={handleCopy}
              className={`
                w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5
                transition-all duration-200
                ${copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'bg-slate-800 text-white border border-slate-700 hover:border-slate-500 hover:bg-slate-700'
                }
              `}
              aria-label="Copy scanned value to clipboard"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy to Clipboard
                </>
              )}
            </button>

            <button
              id="scan-another-btn"
              onClick={handleScanAnother}
              className="
                w-full py-4 rounded-2xl font-semibold text-white text-sm
                bg-gradient-to-r from-green-500 to-emerald-600
                shadow-lg shadow-green-500/25
                hover:shadow-green-500/40 hover:scale-[1.02]
                active:scale-[0.98]
                transition-all duration-200
                flex items-center justify-center gap-2.5
              "
              aria-label="Scan another barcode"
            >
              <RefreshCw size={16} />
              Scan Another
            </button>
          </div>
        )}

        {/* ── ERROR STATE ────────────────────────────────── */}
        {state === 'ERROR' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 animate-fade-in-up">

            {/* Error icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 rounded-3xl glass-card border border-red-500/20 flex items-center justify-center">
                <CameraOff size={40} className="text-red-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Error details */}
            <div className="text-center space-y-2 px-2">
              <h2 className="text-xl font-bold text-white">Camera Unavailable</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                {errorMsg || 'An unexpected error occurred while trying to access the camera.'}
              </p>
            </div>

            {/* Error hint card */}
            <div className="w-full glass-card rounded-2xl p-4 border border-red-500/10">
              <div className="flex gap-3">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Troubleshooting tips:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Allow camera access when prompted by your browser</li>
                    <li>Check site permissions in your browser settings</li>
                    <li>Ensure no other app is using the camera</li>
                    <li>Use HTTPS or localhost for camera access</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              id="try-again-btn"
              onClick={() => setState('IDLE')}
              className="
                w-full max-w-xs py-4 rounded-2xl font-semibold text-white text-sm
                bg-gradient-to-r from-green-500 to-emerald-600
                shadow-lg shadow-green-500/25
                hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200
                flex items-center justify-center gap-2.5
              "
              aria-label="Try scanning again"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="mt-6 text-center">
        <p className="text-xs text-slate-600">
          Supports QR, EAN, UPC, Code 128, PDF 417 &amp; more
        </p>
      </footer>
    </div>
  );
}
