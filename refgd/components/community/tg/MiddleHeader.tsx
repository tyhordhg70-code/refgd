"use client";

import type { ReactNode } from "react";

/**
 * Telegram Web A MiddleColumn header, emitting the exact saved DOM:
 * MiddleHeaderPanes sibling, back button (returns to the topic list),
 * .chat-info-wrapper > .ChatInfo (topic icon + title + status) and
 * .header-tools > .HeaderActions on the right.
 */
export default function MiddleHeader({
  title,
  subtitle,
  icon,
  onBack,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  /** Topic icon (hashtag <i> or Apple-emoji img), left of the title. */
  icon?: ReactNode;
  onBack?: () => void;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="MiddleHeaderPanes M5bA2n6Z opacity-transition fast shown open" />
      <div className="MiddleHeader">
        {onBack && (
          <div className="back-button">
            <button
              type="button"
              className="Button smaller translucent round"
              aria-label="Back"
              title="Back"
              onClick={onBack}
            >
              <i className="icon icon-arrow-left" aria-hidden />
            </button>
          </div>
        )}
        <div className="Transition">
          <div className="Transition_slide Transition_slide-active">
            <div className="chat-info-wrapper">
              <div className="ChatInfo">
                {icon}
                <div className="info">
                  <h3 dir="auto" className="fullName">
                    {title}
                  </h3>
                  <span className="status" dir="auto">
                    {subtitle}
                  </span>
                </div>
              </div>
            </div>
            <div className="header-tools">
              <div className="HeaderActions">
                {children ?? (
                  <button
                    type="button"
                    className="Button smaller translucent round"
                    aria-label="Search this chat"
                    title="Search this chat"
                  >
                    <i className="icon icon-search" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
