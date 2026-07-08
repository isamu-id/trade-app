"use client";

import { useState } from "react";

export default function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [mainImg, setMainImg] = useState(images[0]);

  return (
    <div className="mb-5">
      <div className="mb-2 h-64 w-full overflow-hidden rounded-2xl bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mainImg} alt={title} className="h-full w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMainImg(url)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${mainImg === url ? "border-gold" : "border-transparent hover:border-gold"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`写真${i + 1}`} className="h-full w-full object-contain bg-neutral-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
