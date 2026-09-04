"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthModal } from "@/components/auth/AuthModal";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import { UsageLimitModal } from "@/components/chat/UsageLimitModal";
import { ChatView } from "@/components/chat/ChatView";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { LogoutConfirmModal } from "@/components/modals/LogoutConfirmModal";
import { NewProjectModal } from "@/components/modals/NewProjectModal";
import { SearchConversationsModal } from "@/components/modals/SearchConversationsModal";
import { EmailComposerModal } from "@/components/modals/EmailComposerModal";
import { MenuIcon } from "@/components/ui/Icons";
import { useIsMobile } from "@/lib/useIsMobile";
import type { SidebarData } from "@/lib/data/sidebar";

type ModalState =
  | "login"
  | "signup"
  | "forgot"
  | "settings"
  | "logout"
  | "newProject"
  | "search"
  | "email"
  | null;

type Message = { id: string; role: "user" | "assistant"; text: string };

function findPinned(data: SidebarData, sessionId: string | null): boolean {
  if (!sessionId) return false;
  if (data.pinned.some((s) => s.id === sessionId)) return true;
  return data.projects.some((p) => p.sessions.some((s) => s.id === sessionId && s.is_pinned));
}

function findSessionInfo(
  data: SidebarData,
  sessionId: string | null,
): { title: string; projectName: string | null } | null {
  if (!sessionId) return null;
  const pinned = data.pinned.find((s) => s.id === sessionId);
  if (pinned) return { title: pinned.title, projectName: null };
  for (const project of data.projects) {
    const s = project.sessions.find((s) => s.id === sessionId);
    if (s) return { title: s.title, projectName: project.name };
  }
  const recent = data.recent.find((s) => s.id === sessionId);
  if (recent) return { title: recent.title, projectName: null };
  return null;
}

export function HomeShell({
  fullName,
  email,
  sidebarData,
}: {
  fullName: string | null;
  email: string | null;
  sidebarData: SidebarData;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [limitUnlockAt, setLimitUnlockAt] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [temporaryChat, setTemporaryChat] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [startTemporary, setStartTemporary] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [chatKey, setChatKey] = useState(0);
  const [prefill, setPrefill] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const router = useRouter();
  const isMobile = useIsMobile();
  const isLoggedIn = Boolean(email);

  let headerTitle: string;
  let headerSubtitle: string;
  if (temporaryChat) {
    headerTitle = "Temporary chat";
    headerSubtitle = "Not saved to history";
  } else if (activeSessionId) {
    const info = findSessionInfo(sidebarData, activeSessionId);
    headerTitle = info?.title ?? "Conversation";
    headerSubtitle = info?.projectName
      ? `Project: ${info.projectName} · saved automatically`
      : "Saved automatically";
  } else if (!isLoggedIn) {
    headerTitle = "New conversation";
    headerSubtitle = "Guest session";
  } else {
    headerTitle = "New conversation";
    headerSubtitle = "Nothing sent yet";
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setModal(null);
    router.refresh();
  }

  function handleAuthSuccess() {
    setModal(null);
    router.refresh();
  }

  function handleNewConversation(projectId?: string) {
    setActiveSessionId(null);
    setSessionMessages([]);
    setTemporaryChat(startTemporary);
    setPrefill("");
    setPendingProjectId(projectId ?? null);
    setChatKey((k) => k + 1);
    setModal(null);
  }

  async function handleSelectSession(id: string) {
    const res = await fetch(`/api/sessions/${id}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setActiveSessionId(id);
    setSessionMessages(
      data.messages.map((m: { id: string; role: string; message: string }) => ({
        id: m.id,
        role: m.role,
        text: m.message,
      })),
    );
    setTemporaryChat(false);
    setPrefill("");
    setChatKey((k) => k + 1);
    setModal(null);
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    await fetch(`/api/sessions/${id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
    router.refresh();
  }

  function handleSessionCreated(id: string) {
    // Project linking now happens atomically inside /api/chat itself (see
    // projectId in the request body) rather than as a separate follow-up
    // call here, which used to be racy if the page navigated away before
    // the follow-up request finished.
    setActiveSessionId(id);
    setPendingProjectId(null);
    router.refresh();
  }

  function handleExamplePrompt(prompt: string) {
    setActiveSessionId(null);
    setSessionMessages([]);
    setTemporaryChat(startTemporary);
    setPrefill(prompt);
    setPendingProjectId(null);
    setChatKey((k) => k + 1);
  }

  return (
    <div className="flex h-screen bg-panel-grey">
      <Sidebar
        isLoggedIn={isLoggedIn}
        fullName={fullName}
        email={email}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        data={sidebarData}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewConversation={handleNewConversation}
        temporaryChat={temporaryChat}
        onToggleTemporary={() => setTemporaryChat((t) => !t)}
        onOpenSearch={() => setModal("search")}
        onOpenNewProject={() => setModal("newProject")}
        onOpenSettings={() => setModal("settings")}
        onOpenBilling={() => router.push("/pricing")}
        onOpenLogout={() => setModal("logout")}
        onOpenLogin={() => setModal("login")}
        onTogglePin={handleTogglePin}
        onExamplePrompt={handleExamplePrompt}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-navy-deeper sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => (isMobile ? setMobileSidebarOpen(true) : setCollapsed((c) => !c))}
              aria-label="Toggle sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 text-navy-deeper hover:bg-navy-deeper/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
            >
              <MenuIcon size={16} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-deeper dark:text-white">
                {headerTitle}
              </p>
              <p className="truncate text-xs text-muted-grey dark:text-white/50">{headerSubtitle}</p>
            </div>
          </div>
          {!isLoggedIn && (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setModal("login")}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-navy-deeper hover:bg-navy-deeper/5 dark:text-white dark:hover:bg-white/10 sm:px-4"
              >
                Log in
              </button>
              <button
                onClick={() => setModal("signup")}
                className="whitespace-nowrap rounded-full bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110 sm:px-4"
              >
                Sign up for free
              </button>
            </div>
          )}
        </div>

        <ChatView
          key={chatKey}
          fullName={fullName}
          initialMessages={sessionMessages}
          initialSessionId={activeSessionId}
          initialInput={prefill}
          isTemporary={temporaryChat}
          projectId={pendingProjectId}
          onLimitReached={setLimitUnlockAt}
          onSessionCreated={handleSessionCreated}
          onEmailResponse={
            isLoggedIn
              ? (body) => {
                  setEmailBody(body);
                  setModal("email");
                }
              : undefined
          }
          isSessionPinned={findPinned(sidebarData, activeSessionId)}
          onTogglePin={
            activeSessionId
              ? () => handleTogglePin(activeSessionId, !findPinned(sidebarData, activeSessionId))
              : undefined
          }
        />
      </div>

      {(modal === "login" || modal === "signup") && (
        <AuthModal
          initialMode={modal}
          onClose={() => setModal(null)}
          onForgotPassword={() => setModal("forgot")}
          onSuccess={handleAuthSuccess}
        />
      )}
      {modal === "forgot" && <ForgotPasswordModal onClose={() => setModal(null)} />}
      {modal === "settings" && (
        <SettingsModal
          onClose={() => setModal(null)}
          saveHistory={saveHistory}
          onToggleSaveHistory={() => setSaveHistory((v) => !v)}
          startTemporary={startTemporary}
          onToggleStartTemporary={() => setStartTemporary((v) => !v)}
        />
      )}
      {modal === "logout" && (
        <LogoutConfirmModal
          fullName={fullName}
          email={email}
          onClose={() => setModal(null)}
          onConfirm={handleLogout}
        />
      )}
      {modal === "newProject" && (
        <NewProjectModal
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
      {modal === "search" && (
        <SearchConversationsModal
          data={sidebarData}
          onClose={() => setModal(null)}
          onSelectSession={handleSelectSession}
        />
      )}
      {modal === "email" && (
        <EmailComposerModal initialBody={emailBody} onClose={() => setModal(null)} />
      )}
      {limitUnlockAt && (
        <UsageLimitModal
          unlockAt={limitUnlockAt}
          isLoggedIn={isLoggedIn}
          onClose={() => setLimitUnlockAt(null)}
          onCreateAccount={() => {
            setLimitUnlockAt(null);
            setModal("signup");
          }}
          onUpgrade={() => {
            setLimitUnlockAt(null);
            if (!isLoggedIn) setModal("signup");
            else router.push("/pricing");
          }}
        />
      )}
    </div>
  );
}
