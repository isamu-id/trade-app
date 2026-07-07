"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/types/database";

export default function CategoryChips() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        className="flex flex-wrap gap-2 overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? "500px" : "40px" }}
      >
        {CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/category/${encodeURIComponent(category)}`}
            className="flex-shrink-0 rounded-full border border-hairline bg-white px-4 py-2 text-sm text-subtle transition hover:border-gold hover:bg-gold-soft hover:text-gold"
          >
            {category}
          </Link>
        ))}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2.5 flex items-center gap-1 text-xs text-gold hover:text-gold/80 transition"
      >
        {expanded ? "閉じる ▲" : "すべて表示 ▼"}
      </button>
    </div>
  );
}
