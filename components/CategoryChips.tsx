"use client";

import { useState } from "react";
import { CATEGORIES } from "@/types/database";

export default function CategoryChips() {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  function toggleCategory(category: string) {
    setSelected((prev) => (prev === category ? null : category));
  }

  return (
    <div>
      <div
        className="flex flex-wrap gap-2 overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? "500px" : "40px" }}
      >
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => toggleCategory(category)}
            className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm transition ${
              selected === category
                ? "border-gold bg-gold-soft text-gold"
                : "border-hairline bg-white text-subtle hover:border-gold hover:bg-gold-soft hover:text-gold"
            }`}
          >
            {category}
          </button>
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
