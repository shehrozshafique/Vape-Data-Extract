import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Building2, Filter, PlayCircle, Radar } from "lucide-react";

const STEPS = [
  { icon: FolderKanban, title: "Add a client project", description: "Your client's website under All Projects." },
  { icon: Building2, title: "Add competitors", description: "Sites to monitor for that client." },
  { icon: Filter, title: "Configure URL rules", description: "Include/exclude patterns so only real product pages count." },
  { icon: PlayCircle, title: "Run the initial scan", description: "Establishes the baseline — existing products, no flood of tasks." },
  { icon: Radar, title: "Daily monitoring", description: "Each competitor is checked once per day automatically." },
];

export function WelcomeOnboarding() {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Welcome — set up this project</CardTitle>
        <CardDescription>
          Add competitors for the selected client project. The baseline scan saves existing products without creating a flood of
          tasks. Only products discovered after that show up as tasks for the team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <step.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/projects">All Projects</Link>} variant="outline" />
          <Button nativeButton={false} render={<Link href="/competitors">Add competitor</Link>} />
        </div>
      </CardContent>
    </Card>
  );
}
