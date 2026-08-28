export interface User {
  id: number;
  name: string;
  email: string;
  motto: string | null;
  avatar: string | null;
  theme: "dark" | "light";
  language: "cs" | "en";
  isPrivate: boolean;
  emailVerified: boolean;
  onboarded: boolean;
  location: string | null;
  notifyTaskDue?: boolean;
  notifyFollows?: boolean;
  notifyEmail?: boolean;
}

export interface ProjectSummary {
  id: number;
  name: string;
  objective: string | null;
  template: string;
  owner_id: number;
  color?: string | null;
  icon?: string | null;
  is_archived?: number | boolean;
  is_discoverable?: number | boolean;
  created_at: string;
  progress: number;
  nextDeadline?: string | null;
}

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  due_date: string | null;
  order_index: number;
  taskCount?: number;
  completion?: number;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskAssignee {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  project_id: number;
  project_name?: string;
  project_color?: string | null;
  milestone_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  is_important?: number | boolean;
  pinned?: boolean;
  assignees: TaskAssignee[];
  due_date: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface DashboardSummary {
  projects: ProjectSummary[];
  myTasks: Task[];
  overdueTasks: Task[];
  pinnedTasks: Task[];
  upcomingMilestones: Milestone[];
}

export interface ProjectMember {
  id: number;
  name: string;
  email: string;
  role: ProjectRole;
}

export type ProjectRole = "owner" | "admin" | "member";

export const PERMISSION_ACTIONS = [
  "create_tasks",
  "edit_tasks",
  "delete_tasks",
  "assign_tasks",
  "manage_milestones",
  "manage_members",
  "approve_join_requests",
  "edit_project_settings",
  "manage_resources",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface ProjectResource {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  url: string;
  added_by: number | null;
  added_by_name: string | null;
  created_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  members: ProjectMember[];
  milestones: Milestone[];
  tasks: Task[];
  resources: ProjectResource[];
  myRole?: ProjectRole;
  permissions?: Record<PermissionAction, boolean>;
  pendingJoinRequestCount?: number;
}

export interface JoinRequest {
  id: number;
  user_id: number;
  name: string;
  avatar: string | null;
  status: string;
  created_at: string;
}

export interface ProjectPreview {
  isMember: boolean;
  role?: ProjectRole;
  id?: number;
  name?: string;
  objective?: string | null;
  color?: string | null;
  icon?: string | null;
  memberCount?: number;
  joinRequestStatus?: string | null;
}

export interface TemplateOption {
  key: string;
  label: string;
}

export type FollowStatus = "none" | "pending" | "accepted";

export interface FollowListEntry {
  id: number;
  name: string;
  avatar: string | null;
  isPrivate: boolean;
  followStatus: FollowStatus;
}

export interface UserSummary {
  id: number;
  name: string;
  avatar: string | null;
  motto: string | null;
  isPrivate: boolean;
  followStatus: FollowStatus;
}

export interface UserProfile {
  id: number;
  name: string;
  avatar: string | null;
  isPrivate: boolean;
  isSelf: boolean;
  followStatus: FollowStatus;
  motto?: string | null;
  memberSince?: string;
  followers?: number;
  following?: number;
  completedProjects?: number;
}

export interface FollowedUser {
  id: number;
  name: string;
  avatar: string | null;
}

export interface SearchResult {
  users: UserSummary[];
  projects: { id: number; name: string; objective: string | null; isMember: boolean }[];
  tasks: { id: number; title: string; projectId: number; projectName: string }[];
  comments: { id: number; body: string; taskId: number; taskTitle: string; projectId: number; projectName: string }[];
}

export type NotificationType =
  | "follow_request"
  | "follow_accepted"
  | "new_follower"
  | "task_due"
  | "verify_email"
  | "join_request"
  | "join_request_accepted"
  | "join_request_rejected"
  | "task_assigned"
  | "task_comment"
  | "milestone_due"
  | "important_task_completed";

export interface AppNotification {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  payload: {
    fromUserId?: number;
    fromUserName?: string;
    taskId?: number;
    taskTitle?: string;
    dueDate?: string;
    projectId?: number;
    projectName?: string;
    requestId?: number;
    milestoneId?: number;
    milestoneTitle?: string;
  };
}

export interface ActivityEntry {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  actorId: number | null;
  actorName: string | null;
}

export interface TaskComment {
  id: number;
  body: string;
  created_at: string;
  author_id: number;
  author_name: string;
  author_avatar: string | null;
}
