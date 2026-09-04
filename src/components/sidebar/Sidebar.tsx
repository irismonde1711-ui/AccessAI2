"use client";

import { useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { useIsMobile } from "@/lib/useIsMobile";
import { ProfileMenu } from "@/components/sidebar/ProfileMenu";
import { GlowSidebar } from "@/components/ui/Glow";
import {
  SearchIcon,
  PanelIcon,
  IncognitoIcon,
  PinIcon,
  PlusIcon,
  ChevronIcon,
  CloseIcon,
  ClockIcon,
} from "@/components/ui/Icons";
import type { SidebarData } from "@/lib/data/sidebar";

const EXPLORE_PROMPTS = [
  "What AccessAI2 can do",
  "Compliance and GRC examples",
  "Email drafting and review",
  "Pricing and plans",
];

export function Sidebar({
  isLoggedIn,
  fullName,
  email,
  collapsed,
  onToggleCollapsed,
  data,
  activeSessionId,
  onSelectSession,
  onNewConversation,
  temporaryChat,
  onToggleTemporary,
  onOpenSearch,
  onOpenNewProject,
  onOpenSettings,
  onOpenBilling,
  onOpenLogout,
  onOpenLogin,
  onTogglePin,
  onExamplePrompt,
  mobileOpen,
  onCloseMobile,
}: {
  isLoggedIn: boolean;
  fullName: string | null;
  email: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  data: SidebarData;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewConversation: (projectId?: string) => void;
  temporaryChat: boolean;
  onToggleTemporary: () => void;
  onOpenSearch: () => void;
  onOpenNewProject: () => void;
  onOpenSettings: () => void;
  onOpenBilling: () => void;
  onOpenLogout: () => void;
  onOpenLogin: () => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onExamplePrompt: (prompt: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  function selectSession(id: string) {
    onSelectSession(id);
    if (isMobile) onCloseMobile();
  }
  function newConversation(projectId?: string) {
    onNewConversation(projectId);
    if (isMobile) onCloseMobile();
  }
  function examplePrompt(prompt: string) {
    onExamplePrompt(prompt);
    if (isMobile) onCloseMobile();
  }

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const displayName = fullName ?? email ?? "";
  const initial = displayName.charAt(0).toUpperCase() || "?";

  if (collapsed && !isMobile) {
    return (
      <div className="sidebar-gradient relative hidden w-16 flex-col items-center gap-4 py-4 md:flex">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <GlowSidebar />
        </div>
        <button onClick={onToggleCollapsed} aria-label="Expand sidebar">
          <LogoMark size={32} />
        </button>
        <IconButton label="New chat" onClick={onNewConversation}>
          <PlusIcon size={18} />
        </IconButton>
        {isLoggedIn && (
          <>
            <IconButton label="Search chats" onClick={onOpenSearch}>
              <SearchIcon size={16} />
            </IconButton>
            <IconButton label="Pinned" onClick={onToggleCollapsed}>
              <PinIcon size={14} filled />
            </IconButton>
            <IconButton label="History" onClick={onToggleCollapsed}>
              <ClockIcon size={16} />
            </IconButton>
          </>
        )}
        <div className="flex-1" />
        {isLoggedIn ? (
          <button
            onClick={onOpenLogout}
            aria-label={`Log out of ${displayName}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-sm font-semibold text-white"
          >
            {initial}
          </button>
        ) : (
          <button onClick={onOpenLogin} aria-label="Log in">
            <LogoMark size={24} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {isMobile && mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
        />
      )}
      <div
        className={
          isMobile
            ? `sidebar-gradient fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col overflow-y-auto py-4 text-white transition-transform duration-200 ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : "sidebar-gradient relative flex w-72 flex-col overflow-y-auto py-4 text-white"
        }
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <GlowSidebar />
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-display text-base font-semibold">AccessAI2</span>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-1">
              <IconButton label="Search chats" onClick={onOpenSearch}>
                <SearchIcon size={16} />
              </IconButton>
              <IconButton
                label={isMobile ? "Close sidebar" : "Collapse sidebar"}
                onClick={isMobile ? onCloseMobile : onToggleCollapsed}
              >
                {isMobile ? <CloseIcon size={16} /> : <PanelIcon size={16} />}
              </IconButton>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 px-4">
          <button
            onClick={() => newConversation()}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-teal py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            <PlusIcon size={16} />
            New Conversation
          </button>
          {isLoggedIn && (
            <button
              onClick={onToggleTemporary}
              aria-label="Temporary chat"
              aria-pressed={temporaryChat}
              title="Temporary chat — won't be saved"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                temporaryChat
                  ? "border-teal bg-teal/20 text-teal"
                  : "border-white/15 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <IncognitoIcon size={18} />
            </button>
          )}
        </div>
        {!isLoggedIn && (
          <div className="mt-2 px-4">
            <button
              onClick={onOpenSearch}
              className="flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left text-xs text-white/50 hover:text-white/80"
            >
              <SearchIcon size={14} /> Search chats
            </button>
          </div>
        )}
        {isLoggedIn && temporaryChat && (
          <div className="mx-4 mt-3 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2 text-xs text-white/80">
            Temporary chat — this conversation won&apos;t be saved to your history.
          </div>
        )}

        {!isLoggedIn ? (
          <>
            <SectionLabel>Explore</SectionLabel>
            <div className="px-2">
              {EXPLORE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => examplePrompt(prompt)}
                  className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {data.pinned.length > 0 && (
              <>
                <SectionLabel>Pinned</SectionLabel>
                <div className="px-2">
                  {data.pinned.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      active={s.id === activeSessionId}
                      onSelect={selectSession}
                      onTogglePin={onTogglePin}
                      pinLabel="Unpin"
                    />
                  ))}
                </div>
              </>
            )}

            <div className="mt-4 flex items-center justify-between px-4">
              <SectionLabel noMargin>Projects</SectionLabel>
              <button
                onClick={onOpenNewProject}
                className="text-white/50 hover:text-white"
                aria-label="New project"
              >
                <PlusIcon size={15} />
              </button>
            </div>
            <div className="px-2">
              {data.projects.map((project) => (
                <div key={project.id}>
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/85 hover:bg-white/5"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="flex-1 truncate">{project.name}</span>
                    <ChevronIcon
                      size={12}
                      className={`shrink-0 transition-transform ${expandedProjects.has(project.id) ? "rotate-90" : ""}`}
                    />
                  </button>
                  {expandedProjects.has(project.id) && (
                    <div className="ml-4 border-l border-white/10 pl-2">
                      {project.sessions.map((s) => (
                        <SessionRow
                          key={s.id}
                          session={s}
                          active={s.id === activeSessionId}
                          onSelect={selectSession}
                          onTogglePin={onTogglePin}
                          pinLabel={s.is_pinned ? "Unpin" : "Pin chat"}
                        />
                      ))}
                      <button
                        onClick={() => newConversation(project.id)}
                        className="block w-full truncate rounded-lg px-2 py-1 text-left text-xs text-teal hover:bg-white/5"
                      >
                        + New chat in project
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {data.drafts.length > 0 && (
              <>
                <SectionLabel>Drafts</SectionLabel>
                <div className="px-2">
                  {data.drafts.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 truncate rounded-lg px-2 py-1.5 text-sm text-white/70"
                    >
                      <span>{d.type === "email" ? "✉" : "◆"}</span>
                      <span className="truncate">{d.title}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {data.recent.length > 0 && (
              <>
                <SectionLabel>Recent</SectionLabel>
                <div className="px-2">
                  {data.recent.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      active={s.id === activeSessionId}
                      onSelect={selectSession}
                      onTogglePin={onTogglePin}
                      pinLabel="Pin chat"
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div className="flex-1" />

        {!isLoggedIn && (
          <div className="mx-4 mb-2 rounded-2xl border border-teal/30 bg-teal/10 p-4">
            <p className="text-sm font-semibold text-white">Get responses tailored to you</p>
            <p className="mt-1 text-xs text-white/60">
              Log in to save chats, upload documents and keep your projects and drafts in one
              place.
            </p>
            <button
              onClick={onOpenLogin}
              className="mt-3 w-full rounded-full bg-teal py-2 text-xs font-semibold text-white hover:brightness-110"
            >
              Log in
            </button>
          </div>
        )}

        {isLoggedIn && (
          <div className="relative mx-2 mt-1">
            {profileMenuOpen && (
              <ProfileMenu
                fullName={fullName}
                email={email}
                onClose={() => setProfileMenuOpen(false)}
                onOpenSettings={onOpenSettings}
                onOpenBilling={onOpenBilling}
                onLogout={onOpenLogout}
              />
            )}
            <button
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-semibold text-white">
                {initial}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm text-white">{displayName}</span>
                <span className="block text-xs text-white/40">Free plan</span>
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileMenuOpen(false);
                  onOpenBilling();
                }}
                className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
              >
                Upgrade
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function SectionLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <p className={`px-4 ${noMargin ? "" : "mt-4"} pb-1 text-xs font-semibold uppercase tracking-wide text-white/35`}>
      {children}
    </p>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
  onTogglePin,
  pinLabel,
}: {
  session: { id: string; title: string; is_pinned: boolean };
  active: boolean;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  pinLabel: string;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <button
        onClick={() => onSelect(session.id)}
        className="min-w-0 flex-1 truncate text-left text-sm text-white/85"
      >
        {session.title}
      </button>
      <button
        onClick={() => onTogglePin(session.id, !session.is_pinned)}
        aria-label={pinLabel}
        className={`shrink-0 text-white/40 hover:text-white ${session.is_pinned ? "" : "opacity-0 group-hover:opacity-100"}`}
      >
        <PinIcon size={13} filled={session.is_pinned} />
      </button>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
