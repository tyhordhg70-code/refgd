"use client";

import type { ReactNode } from "react";
import MiddleHeader from "./MiddleHeader";

/**
 * The Telegram Web A in-chat search header, factored out of CommunityChat so
 * the otherwise-bespoke READ ME topic gets the exact same search chrome (and
 * so any future topic can too). Purely presentational: the caller owns the
 * `search` state — `null` = closed (normal MiddleHeader with a search button),
 * a string = the open search pane with a text input. Emits the identical saved
 * DOM/classnames as CommunityChat's inline version.
 */
export default function SearchHeader({
  title,
  subtitle,
  icon,
  onBack,
  search,
  setSearch,
  placeholder = "Search messages",
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  onBack?: () => void;
  /** `null` = closed; a string = open with that query. */
  search: string | null;
  setSearch: (v: string | null) => void;
  placeholder?: string;
  /** Extra header action buttons rendered after the search button. */
  children?: ReactNode;
}) {
  if (search !== null) {
    return (
      <>
        <div className="MiddleHeaderPanes M5bA2n6Z opacity-transition fast shown open" />
        <div className="MiddleHeader tg-chat-search-header">
          <div className="back-button">
            <button
              type="button"
              className="Button smaller translucent round"
              aria-label="Close search"
              title="Close search"
              onClick={() => setSearch(null)}
            >
              <i className="icon icon-arrow-left" aria-hidden />
            </button>
          </div>
          <div className="SearchInput tg-list-search" dir="ltr">
            <input
              type="text"
              dir="auto"
              placeholder={placeholder}
              className="form-control"
              value={search}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <MiddleHeader
      title={title}
      subtitle={subtitle}
      icon={icon}
      onBack={onBack}
    >
      <button
        type="button"
        className="Button smaller translucent round"
        aria-label="Search this chat"
        title="Search this chat"
        onClick={() => setSearch("")}
      >
        <i className="icon icon-search" aria-hidden />
      </button>
      {children}
    </MiddleHeader>
  );
}
