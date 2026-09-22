"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";

type Camera = { id: string; label: string };

function getQrBox(viewfinderWidth: number, viewfinderHeight: number) {
 const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
 return { width: size, height: size };
}

type Props = {
 onDecoded: (value: string) => void;
 disabled?: boolean;
};

export default function QrScanner({ onDecoded, disabled = false }: Props) {
 const rawId = useId();
 const readerId = `qr-reader-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
 const scannerRef = useRef<Html5Qrcode | null>(null);
 const activeRef = useRef(false);
 const callbackRef = useRef(onDecoded);
 const cooldownRef = useRef(false);
 const [cameras, setCameras] = useState<Camera[]>([]);
 const [selectedCamera, setSelectedCamera] = useState("");
 const [scanning, setScanning] = useState(false);
 const [status, setStatus] = useState("Finding cameras…");
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 callbackRef.current = onDecoded;
 }, [onDecoded]);

 useEffect(() => {
 let cancelled = false;

 Html5Qrcode.getCameras()
  .then((devices) => {
  if (cancelled) return;
  const available = devices.map((device) => ({ id: device.id, label: device.label }));
  setCameras(available);
  const preferred = available.find((camera) => /back|rear|environment/i.test(camera.label)) || available[0];
  if (preferred) {
   setSelectedCamera(preferred.id);
   setScanning(true);
   setStatus("Starting camera…");
  } else {
   setStatus("No camera found");
  }
  })
  .catch(() => {
  if (!cancelled) {
   setError("Camera access was unavailable. Use the manual ticket ID field instead.");
   setStatus("");
  }
  });

 return () => {
  cancelled = true;
 };
 }, []);

 useEffect(() => {
 if (!selectedCamera || !scanning || disabled) return;
 let mounted = true;
 const scanner = new Html5Qrcode(readerId, { verbose: false });
 scannerRef.current = scanner;

 scanner
  .start(
  selectedCamera,
  { fps: 10, qrbox: getQrBox, aspectRatio: 1 },
  (decodedText) => {
   if (cooldownRef.current) return;
   cooldownRef.current = true;
   callbackRef.current(decodedText);
   window.setTimeout(() => {
   cooldownRef.current = false;
   }, 1800);
  },
  () => undefined,
  )
  .then(() => {
  if (mounted) {
   activeRef.current = true;
   setError(null);
   setStatus("");
  }
  })
  .catch((startError: unknown) => {
  if (!mounted) return;
  setScanning(false);
  setStatus("");
  setError(startError instanceof Error && startError.name === "NotAllowedError"
   ? "Camera permission was denied."
   : "The camera could not be started.");
  });

 return () => {
  mounted = false;
  const current = scannerRef.current;
  if (current && activeRef.current) {
  current
   .stop()
   .catch(() => undefined)
   .finally(() => {
   current.clear();
   activeRef.current = false;
   });
  }
 };
 }, [disabled, readerId, scanning, selectedCamera]);

 const changeCamera = (cameraId: string) => {
 setScanning(false);
 setSelectedCamera(cameraId);
 window.setTimeout(() => setScanning(true), 150);
 };

 return (
 <div className="space-y-4">
  <div className="relative overflow-hidden bg-slate-950 shadow-inner">
  <div id={readerId} className="qr-reader min-h-72 w-full sm:min-h-96" />
  {(!scanning || status || error || disabled) && (
   <div className="absolute inset-0 grid place-items-center bg-slate-950/85 p-6 text-center text-white">
   <div>
    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center bg-white/10 text-2xl">▣</div>
    <p className="font-semibold">{error ? "Camera unavailable" : disabled ? "Loading ticket" : scanning ? "Starting scanner" : "Scanner paused"}</p>
    <p className="mt-1 max-w-xs text-sm text-slate-300">{error || status || "Press start to scan a ticket QR code."}</p>
   </div>
   </div>
  )}
  {scanning && !status && !error && !disabled && (
   <div className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow">Scanning</div>
  )}
  </div>

  <div className="flex flex-col gap-3 sm:flex-row">
  <button
   type="button"
   onClick={() => setScanning((current) => !current)}
   disabled={!selectedCamera || Boolean(error) || disabled}
   className={` px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
   scanning ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
   }`}
  >
   {scanning ? "Pause scanner" : "Start scanner"}
  </button>
  {cameras.length > 1 && (
   <select
   value={selectedCamera}
   onChange={(event) => changeCamera(event.target.value)}
   disabled={disabled}
   className="min-w-0 flex-1 border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
   aria-label="Camera"
   >
   {cameras.map((camera, index) => (
    <option key={camera.id} value={camera.id}>{camera.label || `Camera ${index + 1}`}</option>
   ))}
   </select>
  )}
  </div>
 </div>
 );
}
