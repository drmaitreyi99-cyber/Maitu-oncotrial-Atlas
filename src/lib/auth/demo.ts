import type { DemoUser } from "@/lib/types";

export const DEMO_USERS: DemoUser[] = [
  { email: "resident@maitu.demo", password: "atlas", name: "Resident demo", role: "resident" },
  { email: "reviewer@maitu.demo", password: "review", name: "Evidence reviewer", role: "reviewer" },
];

export function matchDemoUser(email: string, password: string) {
  return DEMO_USERS.find((user) => user.email === email.trim().toLowerCase() && user.password === password) ?? null;
}
