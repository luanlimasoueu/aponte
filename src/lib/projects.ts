import { getDb, type Project, type User } from "./db";
import { canViewProject, isPubliclyListed } from "./matching";

export type ProjectView = {
  project: Project;
  owner: { id: number; name: string; role: string };
  isOwner: boolean;
  grantedMentors: { id: number; name: string; granted_at: string }[];
  participants: { id: number; name: string; status: string }[];
};

async function activeGrants(projectId: number) {
  return await getDb()
    .prepare(
      `SELECT u.id, u.name, a.granted_at FROM project_access a JOIN users u ON u.id = a.mentor_id
       WHERE a.project_id = ? AND a.revoked_at IS NULL AND u.role = 'mentor' ORDER BY u.name`
    )
    .all(projectId) as { id: number; name: string; granted_at: string }[];
}

async function participants(projectId: number) {
  return await getDb()
    .prepare(
      `SELECT u.id, u.name, pa.status FROM project_applications pa JOIN users u ON u.id = pa.user_id
       WHERE pa.project_id = ? AND pa.status = 'accepted' ORDER BY u.name`
    )
    .all(projectId) as { id: number; name: string; status: string }[];
}

/** Returns the project only if the viewer is allowed to see it (server-side privacy check). */
export async function getProjectForViewer(id: number, viewer: User | null): Promise<ProjectView | null> {
  const project = await getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
  if (!project) return null;
  const grantedMentors = await activeGrants(id);
  const parts = await participants(id);
  const allowed = canViewProject(
    viewer ? { id: viewer.id, role: viewer.role } : null,
    { ownerId: project.owner_id, kind: project.kind, visibility: project.visibility, status: project.status },
    { grantedMentorIds: grantedMentors.map((m) => m.id), participantIds: parts.map((p) => p.id) }
  );
  if (!allowed) return null;
  const owner = await getDb().prepare("SELECT id, name, role FROM users WHERE id = ?").get(project.owner_id) as ProjectView["owner"];
  return { project, owner, isOwner: viewer?.id === project.owner_id, grantedMentors, participants: parts };
}

export type ProjectFilters = { kind?: string; tool?: string; difficulty?: string; modality?: string; q?: string };

export async function listPublicProjects(f: ProjectFilters = {}): Promise<(Project & { owner_name: string; owner_role: string })[]> {
  const rows = await getDb()
    .prepare(
      `SELECT p.*, u.name AS owner_name, u.role AS owner_role FROM projects p JOIN users u ON u.id = p.owner_id
       WHERE p.kind != 'particular' AND p.visibility = 'public' AND p.status NOT IN ('rascunho','arquivado')
       ORDER BY (p.status = 'aberto') DESC, p.created_at DESC`
    )
    .all() as unknown as (Project & { owner_name: string; owner_role: string })[];
  const has = (v: string, needle: string) => v.toLowerCase().includes(needle.toLowerCase());
  return rows.filter(
    (p) =>
      isPubliclyListed({ ownerId: p.owner_id, kind: p.kind, visibility: p.visibility, status: p.status }) &&
      (!f.kind || p.kind === f.kind) &&
      (!f.tool || has(p.tools, f.tool)) &&
      (!f.difficulty || p.difficulty === f.difficulty) &&
      (!f.modality || p.modality === f.modality || p.modality === "Ambas") &&
      (!f.q || has(`${p.title} ${p.summary} ${p.description} ${p.tools} ${p.areas}`, f.q))
  );
}

export async function listOwnProjects(userId: number): Promise<Project[]> {
  return await getDb().prepare("SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC").all(userId) as unknown as Project[];
}

export async function listSharedWithMentor(mentorId: number): Promise<(Project & { owner_name: string })[]> {
  return await getDb()
    .prepare(
      `SELECT p.*, u.name AS owner_name FROM project_access a
       JOIN projects p ON p.id = a.project_id JOIN users u ON u.id = p.owner_id
       JOIN users me ON me.id = a.mentor_id
       WHERE a.mentor_id = ? AND a.revoked_at IS NULL AND me.role = 'mentor' ORDER BY p.updated_at DESC`
    )
    .all(mentorId) as unknown as (Project & { owner_name: string })[];
}

export async function listParticipating(userId: number): Promise<(Project & { owner_name: string; application_status: string })[]> {
  return await getDb()
    .prepare(
      `SELECT p.*, u.name AS owner_name, pa.status AS application_status FROM project_applications pa
       JOIN projects p ON p.id = pa.project_id JOIN users u ON u.id = p.owner_id
       WHERE pa.user_id = ? AND pa.status IN ('pending','accepted') ORDER BY pa.created_at DESC`
    )
    .all(userId) as unknown as (Project & { owner_name: string; application_status: string })[];
}
