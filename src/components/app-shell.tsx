"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bookmark, BookOpen, CalendarRange, ClipboardList, FlaskConical, GitCompare,
  GraduationCap, LayoutDashboard, Library, Menu, Moon, Search, ShieldCheck, Sparkles,
  Stethoscope, Sun, Timer, Workflow, X,
} from "lucide-react";
import { useAtlas } from "@/components/providers";
import { DEMO_BANNER } from "@/lib/evidence";

const groups = [
  {
    label: "Study",
    items: [
      ["/ ", "Dashboard", LayoutDashboard],
      ["/organs", "Organ-wise Trial Library", Library],
      ["/timeline", "Historical Trial Timeline", Sparkles],
      ["/landmarks", "Landmark Trials", FlaskConical],
      ["/updates", "Latest Oncology Updates", Sparkles],
      ["/benefits", "Benefits in Months", FlaskConical],
      ["/development", "Evidence Development Map", Workflow],
      ["/pico", "PICO Trial Cards", ClipboardList],
      ["/compare", "Trial Comparison", GitCompare],
      ["/evolution", "Treatment Evolution", Workflow],
      ["/doses", "Drug Dose Memory", Stethoscope],
    ],
  },
  {
    label: "Exams",
    items: [
      ["/flashcards", "Trial Numbers Flashcards", BookOpen],
      ["/mcq", "ESMO MCQ Bank", GraduationCap],
      ["/viva", "DM University Viva", Stethoscope],
      ["/mock", "Mock Examinations", Timer],
      ["/planner", "My Revision Planner", CalendarRange],
      ["/notebook", "Error Notebook", BookOpen],
    ],
  },
  {
    label: "Library",
    items: [
      ["/bookmarks", "Bookmarks", Bookmark],
      ["/references", "Research References", BookOpen],
      ["/admin", "Reviewer UI Demo", ShieldCheck],
    ],
  },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, user } = useAtlas();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="flex">
        <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 z-40 w-72 overflow-y-auto border-r border-line bg-surface p-4 transition md:translate-x-0`}>
          <div className="mb-6 flex items-start justify-between">
            <Link href="/" onClick={() => setOpen(false)}>
              <p className="font-display text-2xl leading-none text-brand-800 dark:text-brand-200">Maitu</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">OncoTrial Atlas</p>
            </Link>
            <button className="md:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X /></button>
          </div>
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted">{group.label}</p>
              <nav className="grid gap-1" aria-label={group.label}>
                {group.items.map(([href, label, Icon]) => {
                  const clean = href.trim();
                  const active = clean === "/" ? path === "/" : path === clean || path.startsWith(`${clean}/`);
                  return (
                    <Link key={clean} href={clean} className="nav-link" aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
                      <Icon size={16} aria-hidden />
                      <span className="text-sm">{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1 md:pl-72">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur">
            <button className="md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button>
            <form
              className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(`/search?q=${encodeURIComponent(query)}`);
              }}
            >
              <Search size={16} aria-hidden />
              <label className="sr-only" htmlFor="global-search">Search trials</label>
              <input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search trials, biomarkers, NCT numbers" className="w-full bg-transparent py-2 text-sm outline-none" />
            </form>
            <button className="rounded-full p-2 hover:bg-lavender" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/login" className="hidden rounded-full bg-lavender px-3 py-2 text-sm font-semibold sm:inline">
              {user ? user.name : "Sign in"}
            </Link>
          </header>
          <div className="no-print mx-4 mt-4 rounded-2xl border border-line bg-lavender px-4 py-3 text-sm text-ink">{DEMO_BANNER}</div>
          <main id="content" className="px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
