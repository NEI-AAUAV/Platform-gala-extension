import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faMinus,
  faXmark,
  faCheck,
  faArrowsUpDownLeftRight,
} from "@fortawesome/free-solid-svg-icons";

interface ImageCropperModalProps {
  readonly isOpen: boolean;
  readonly imageSrc: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly onCrop: (croppedFile: File) => void;
  readonly onClose: () => void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  fileName,
  fileType,
  onCrop,
  onClose,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    // Minimum size is 200px to cover the crop circular viewport
    const minSize = 200;
    if (w > h) {
      w = (w / h) * minSize;
      h = minSize;
    } else {
      h = (h / w) * minSize;
      w = minSize;
    }
    setImgSize({ width: w, height: h });
  };

  const constrainOffset = (x: number, y: number, currentZoom: number) => {
    if (imgSize.width === 0 || imgSize.height === 0) return { x, y };

    const renderedW = imgSize.width * currentZoom;
    const renderedH = imgSize.height * currentZoom;

    // Center of viewport is 140, 140. Circle diameter is 200. Viewport bounds are 40 to 240.
    // Left boundary constraint: img_left <= 40 => 140 - renderedW/2 + x <= 40 => x <= -100 + renderedW/2
    // Right boundary constraint: img_left + renderedW >= 240 => 140 + renderedW/2 + x >= 240 => x >= 100 - renderedW/2
    const maxOffsetX = -100 + renderedW / 2;
    const minOffsetX = 100 - renderedW / 2;

    const maxOffsetY = -100 + renderedH / 2;
    const minOffsetY = 100 - renderedH / 2;

    const finalX =
      minOffsetX > maxOffsetX
        ? 0
        : Math.max(minOffsetX, Math.min(maxOffsetX, x));
    const finalY =
      minOffsetY > maxOffsetY
        ? 0
        : Math.max(minOffsetY, Math.min(maxOffsetY, y));

    return { x: finalX, y: finalY };
  };

  // Dragging event handlers
  const handlePointerDown = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragStart.current.x;
    const newY = clientY - dragStart.current.y;

    setOffset(constrainOffset(newX, newY, zoom));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom adjustments
  const handleZoomChange = (newZoom: number) => {
    const val = Math.max(1, Math.min(5, newZoom));
    setZoom(val);
    // Constrain offset instantly under new zoom level
    setOffset((prev) => constrainOffset(prev.x, prev.y, val));
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY * -0.005;
    handleZoomChange(zoom + delta);
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const renderedW = imgSize.width * zoom;
    const renderedH = imgSize.height * zoom;

    const imgLeft =
      140 - imgSize.width / 2 + offset.x - (renderedW - imgSize.width) / 2;
    const imgTop =
      140 - imgSize.height / 2 + offset.y - (renderedH - imgSize.height) / 2;

    // Viewport box is centered at 140, 140 with size 200, 200 => top-left is 40, 40
    const viewportX = 40 - imgLeft;
    const viewportY = 40 - imgTop;

    const scaleToNatural = img.naturalWidth / renderedW;

    const sourceX = viewportX * scaleToNatural;
    const sourceY = viewportY * scaleToNatural;
    const sourceWidth = 200 * scaleToNatural;
    const sourceHeight = 200 * scaleToNatural;

    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        500,
        500,
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedFile = new File([blob], fileName, {
              type: fileType || "image/jpeg",
              lastModified: Date.now(),
            });
            onCrop(croppedFile);
          }
        },
        fileType || "image/jpeg",
        0.9,
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="relative flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-light-gold/30 bg-[#142321] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        {/* Header */}
        <div className="flex w-full items-center justify-between border-b border-light-gold/10 pb-3">
          <h3 className="font-gala text-lg font-semibold tracking-wide text-dark-gold">
            Enquadrar Foto
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Viewport Workspace */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          className="relative h-[280px] w-[280px] cursor-grab select-none overflow-hidden rounded-xl border border-white/5 bg-black/40 active:cursor-grabbing"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* Image */}
          <img
            ref={imgRef}
            src={imageSrc}
            onLoad={handleImageLoad}
            alt="To Crop"
            draggable={false}
            className="pointer-events-none absolute max-w-none origin-center"
            style={{
              width: imgSize.width,
              height: imgSize.height,
              left: 140 - imgSize.width / 2,
              top: 140 - imgSize.height / 2,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
          />

          {/* SVG Overlay Mask with Circular Cutout (Diameter 200px) */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <mask id="circle-cutout">
                <rect width="100%" height="100%" fill="white" />
                <circle cx="140" cy="140" r="100" fill="black" />
              </mask>
            </defs>
            {/* Dim out the cropped region */}
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.65)"
              mask="url(#circle-cutout)"
            />
            {/* Viewport circle outline */}
            <circle
              cx="140"
              cy="140"
              r="100"
              stroke="#EBD5B5"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
            />
          </svg>

          {/* Helper Drag Prompt */}
          {offset.x === 0 && offset.y === 0 && zoom === 1 && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/5 bg-black/75 px-3 py-1 text-[10px] font-semibold text-white/50">
              <FontAwesomeIcon icon={faArrowsUpDownLeftRight} size="xs" />
              Arrasta para centrar
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-white/40">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.25)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <FontAwesomeIcon icon={faMinus} size="xs" />
            </button>
            <input
              type="range"
              min="1"
              max="5"
              step="0.01"
              value={zoom}
              onChange={(e) =>
                handleZoomChange(Number.parseFloat(e.target.value))
              }
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-white/10 accent-dark-gold focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.25)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <FontAwesomeIcon icon={faPlus} size="xs" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full gap-3 border-t border-light-gold/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-white/5 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#c9a843] to-[#8a6a20] py-2 text-xs font-bold text-black transition hover:opacity-90"
          >
            <FontAwesomeIcon icon={faCheck} />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
