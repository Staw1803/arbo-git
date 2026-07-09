import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, Loader } from 'lucide-react';
import { storage, isFirebaseConfigured } from '../firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface AvatarCropModalProps {
  imageSrc: string;       // data URL from FileReader
  userId: string;
  onComplete: (url: string) => void;
  onClose: () => void;
}

export default function AvatarCropModal({ imageSrc, userId, onComplete, onClose }: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const SIZE = 280; // canvas diameter

  // Draw the circular crop preview
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Draw dark overlay base
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Draw image centered with offset and scale
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const x = (SIZE - drawW) / 2 + offset.x;
    const y = (SIZE - drawH) / 2 + offset.y;

    ctx.drawImage(img, x, y, drawW, drawH);

    // Dark vignette outside circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, SIZE);
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2, true);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.restore();

    // Circle border guide
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [scale, offset]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Auto fit image
      const fitScale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight) * 1.05;
      setScale(fitScale);
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset(prev => ({ x: prev.x + e.clientX - lastPos.x, y: prev.y + e.clientY - lastPos.y }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };
  const onMouseUp = () => setDragging(false);

  // Touch drag
  const onTouchStart = (e: React.TouchEvent) => {
    setDragging(true);
    setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    setOffset(prev => ({ x: prev.x + e.touches[0].clientX - lastPos.x, y: prev.y + e.touches[0].clientY - lastPos.y }));
    setLastPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleCrop = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    setUploading(true);

    // Render final circular crop to output canvas at 400x400
    const out = document.createElement('canvas');
    out.width = 400;
    out.height = 400;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.clip();

    const ratio = 400 / SIZE;
    const drawW = img.naturalWidth * scale * ratio;
    const drawH = img.naturalHeight * scale * ratio;
    const x = (400 - drawW) / 2 + offset.x * ratio;
    const y = (400 - drawH) / 2 + offset.y * ratio;
    ctx.drawImage(img, x, y, drawW, drawH);

    out.toBlob(async (blob) => {
      if (!blob) { setUploading(false); return; }

      try {
        if (isFirebaseConfigured) {
          const storageRef = ref(storage, `avatars/${userId}_${Date.now()}.jpg`);
          await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
          const url = await getDownloadURL(storageRef);
          onComplete(url);
        } else {
          // Offline: use base64 data URL directly
          onComplete(out.toDataURL('image/jpeg', 0.9));
        }
      } catch (err) {
        console.error('Avatar upload error:', err);
        // Fallback to base64 if Storage fails
        onComplete(out.toDataURL('image/jpeg', 0.9));
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-5 w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white">Ajustar Foto de Perfil</h3>
          <button onClick={onClose} className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-900 cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Canvas */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-zinc-500 font-semibold">Arraste para reposicionar</p>
          <div className="rounded-full overflow-hidden border-2 border-zinc-700 cursor-grab active:cursor-grabbing shadow-xl">
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              style={{ display: 'block', borderRadius: '50%' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onMouseUp}
            />
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
            className="p-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 cursor-pointer transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.05}
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            className="flex-1 accent-white h-1 cursor-pointer"
          />
          <button
            onClick={() => setScale(s => Math.min(5, s + 0.1))}
            className="p-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 cursor-pointer transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-zinc-800 text-xs font-black text-zinc-400 hover:text-white hover:border-zinc-700 cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrop}
            disabled={uploading}
            className="flex-1 py-2.5 rounded-full bg-white text-black text-xs font-black hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            {uploading ? <><Loader className="w-3.5 h-3.5 animate-spin" />Salvando...</> : <><Check className="w-3.5 h-3.5" />Usar esta foto</>}
          </button>
        </div>
      </div>
    </div>
  );
}
