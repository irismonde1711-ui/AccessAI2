import type { SupabaseClient } from "@supabase/supabase-js";

export type SidebarSession = {
  id: string;
  title: string;
  is_pinned: boolean;
};

export type SidebarProject = {
  id: string;
  name: string;
  color: string;
  sessions: SidebarSession[];
};

export type SidebarDraft = {
  id: string;
  title: string;
  type: "ai_response" | "email";
};

export type SidebarData = {
  pinned: SidebarSession[];
  projects: SidebarProject[];
  drafts: SidebarDraft[];
  recent: SidebarSession[];
};

const EMPTY: SidebarData = { pinned: [], projects: [], drafts: [], recent: [] };

export async function getSidebarData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<SidebarData> {
  const [sessionsRes, projectsRes, projectSessionsRes, draftsRes] = await Promise.all([
    supabase
      .from("chat_sessions")
      .select("id, title, is_pinned, is_temporary")
      .eq("user_id", userId)
      .eq("is_temporary", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_sessions")
      .select("project_id, session_id"),
    supabase
      .from("drafts")
      .select("id, title, type")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const sessions = sessionsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const projectSessions = projectSessionsRes.data ?? [];
  const drafts = draftsRes.data ?? [];

  if (sessionsRes.error) return EMPTY;

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const projectSessionIds = new Set(projectSessions.map((ps) => ps.session_id));

  const pinned = sessions.filter((s) => s.is_pinned);

  const projectList: SidebarProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    sessions: projectSessions
      .filter((ps) => ps.project_id === p.id)
      .map((ps) => sessionById.get(ps.session_id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ id: s.id, title: s.title, is_pinned: s.is_pinned })),
  }));

  const recent = sessions
    .filter((s) => !s.is_pinned && !projectSessionIds.has(s.id))
    .slice(0, 15)
    .map((s) => ({ id: s.id, title: s.title, is_pinned: s.is_pinned }));

  return {
    pinned: pinned.map((s) => ({ id: s.id, title: s.title, is_pinned: s.is_pinned })),
    projects: projectList,
    drafts: drafts.map((d) => ({ id: d.id, title: d.title, type: d.type })),
    recent,
  };
}
