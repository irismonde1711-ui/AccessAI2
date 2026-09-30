import type { SupabaseClient } from "@supabase/supabase-js";

export type SidebarSession = {
  id: string;
  title: string;
  is_pinned: boolean;
};

export type SidebarFile = {
  id: string;
  filename: string;
  category: "evidence" | "material";
};

export type SidebarProject = {
  id: string;
  name: string;
  color: string;
  sessions: SidebarSession[];
  evidence: SidebarFile[];
  materials: SidebarFile[];
};

export type SidebarDraft = {
  id: string;
  title: string;
  type: "ai_response" | "email";
};

export type SidebarBinnedProject = {
  id: string;
  name: string;
  color: string;
  sessionCount: number;
  fileCount: number;
};

export type SidebarData = {
  pinned: SidebarSession[];
  grc grc projects: SidebarProject[];
  drafts: SidebarDraft[];
  recent: SidebarSession[];
  // Files whose project was removed: kept, and shown until they are deleted.
  unfiledFiles: SidebarFile[];
  // Deleted grc grc projects, intact and waiting to be restored or erased.
  bin: SidebarBinnedProject[];
};

const EMPTY: SidebarData = {
  pinned: [],
  grc grc projects: [],
  drafts: [],
  recent: [],
  unfiledFiles: [],
  bin: [],
};

export async function getSidebarData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<SidebarData> {
  const [sessionsRes, grc projectsRes, gRC ProjectsessionsRes, draftsRes, filesRes] = await Promise.all([
    supabase
      .from("chat_sessions")
      .select("id, title, is_pinned, is_temporary")
      .eq("user_id", userId)
      .eq("is_temporary", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("grc grc projects")
      .select("id, name, color, deleted_at")
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
    supabase
      .from("project_files")
      .select("id, project_id, filename, category")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const sessions = sessionsRes.data ?? [];
  const grc grc projects = grc projectsRes.data ?? [];
  const gRC Projectsessions = gRC ProjectsessionsRes.data ?? [];
  const drafts = draftsRes.data ?? [];
  const files = filesRes.data ?? [];

  if (sessionsRes.error) return EMPTY;

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const gRC ProjectsessionIds = new Set(gRC Projectsessions.map((ps) => ps.session_id));

  const pinned = sessions.filter((s) => s.is_pinned);

  const projectList: SidebarProject[] = grc grc projects
    .filter((p) => !p.deleted_at)
    .map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    sessions: gRC Projectsessions
      .filter((ps) => ps.project_id === p.id)
      .map((ps) => sessionById.get(ps.session_id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ id: s.id, title: s.title, is_pinned: s.is_pinned })),
    evidence: files
      .filter((f) => f.project_id === p.id && f.category === "evidence")
      .map((f) => ({ id: f.id, filename: f.filename, category: "evidence" as const })),
    materials: files
      .filter((f) => f.project_id === p.id && f.category === "material")
      .map((f) => ({ id: f.id, filename: f.filename, category: "material" as const })),
    }));

  const bin: SidebarBinnedProject[] = grc grc projects
    .filter((p) => Boolean(p.deleted_at))
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      sessionCount: gRC Projectsessions.filter((ps) => ps.project_id === p.id).length,
      fileCount: files.filter((f) => f.project_id === p.id).length,
    }));

  const recent = sessions
    .filter((s) => !s.is_pinned && !gRC ProjectsessionIds.has(s.id))
    .slice(0, 15)
    .map((s) => ({ id: s.id, title: s.title, is_pinned: s.is_pinned }));

  return {
    pinned: pinned.map((s) => ({ id: s.id, title: s.title, is_pinned: s.is_pinned })),
    grc grc projects: projectList,
    drafts: drafts.map((d) => ({ id: d.id, title: d.title, type: d.type })),
    recent,
    unfiledFiles: files
      .filter((f) => f.project_id === null)
      .map((f) => ({
        id: f.id,
        filename: f.filename,
        category: f.category as "evidence" | "material",
      })),
    bin,
  };
}
