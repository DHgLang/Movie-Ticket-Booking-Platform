import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signOut,
} from "aws-amplify/auth";

export type UserProfile = {
  email: string;
  userId: string;
  groups: string[];
  plan: string;
  isAdmin: boolean;
};

function parseGroups(groups: unknown): string[] {
  if (Array.isArray(groups)) return groups.map(String);
  if (typeof groups === "string") return [groups];
  return [];
}

export async function getAuthGroups(forceRefresh = false): Promise<string[]> {
  try {
    await getCurrentUser();
    const session = await fetchAuthSession({ forceRefresh });
    const idGroups = session.tokens?.idToken?.payload["cognito:groups"];
    const accessGroups = session.tokens?.accessToken?.payload["cognito:groups"];
    return parseGroups(idGroups ?? accessGroups);
  } catch {
    return [];
  }
}

export function getUserPlan(groups: string[]): string {
  if (groups.includes("admin")) return "Spirit Movie — Admin";
  return "Spirit Movie — Standard";
}

export async function getUserProfile(forceRefresh = false): Promise<UserProfile | null> {
  try {
    const user = await getCurrentUser();
    const attrs = await fetchUserAttributes();
    const groups = await getAuthGroups(forceRefresh);
    return {
      email: attrs.email ?? user.username,
      userId: user.userId,
      groups,
      plan: getUserPlan(groups),
      isAdmin: groups.includes("admin"),
    };
  } catch {
    return null;
  }
}

export async function isAdminUser(forceRefresh = false): Promise<boolean> {
  const groups = await getAuthGroups(forceRefresh);
  return groups.includes("admin");
}

export async function isSignedIn(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

export async function logout() {
  await signOut();
}
