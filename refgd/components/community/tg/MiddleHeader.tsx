"use client";

import type { ReactNode } from "react";
import { IconBack } from "./TgIcons";

/**
 * Telegram Web A MiddleColumn header: back chevron (mobile), topic title +
 * status line ("N messages" / "N members"), right-side action buttons.
 */
export default function MiddleHeader({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="tg-mid-header">
      {onBack && (
        <button
          type="button"
          className="tg-icon-btn tg-back"
          onClick={onBack}
          aria-label="Back"
        >
          <IconBack />
        </button>
      )}
      <div className="tg-mid-info">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
