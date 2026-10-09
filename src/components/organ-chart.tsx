"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { organs } from "@/lib/data/organs";
import { trials } from "@/lib/data/seed";

export function OrganChart() {
  const data = organs
    .map((organ) => ({
      name: organ.name.split(":")[0].slice(0, 16),
      trials: trials.filter((trial) => trial.organId === organ.id && !trial.placeholder).length,
    }))
    .filter((row) => row.trials > 0);

  return (
    <div className="h-64" role="img" aria-label="Bar chart of verified trial records by organ">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="trials" fill="#7c3aed" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
