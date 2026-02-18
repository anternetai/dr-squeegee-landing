"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockProjects, mockTasks } from "@/lib/mock-data";
import { Project, ProjectStatus, ProjectCategory } from "@/lib/types";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Pause,
  FileText,
} from "lucide-react";

const allStatuses: ProjectStatus[] = ["Active", "Planning", "On Hold", "Completed", "Archived"];
const allCategories: ProjectCategory[] = [
  "Development",
  "Marketing",
  "Sales",
  "Operations",
  "Client Work",
  "Infrastructure",
  "Strategy",
];

const statusIcons: Record<ProjectStatus, { icon: typeof CheckCircle2; color: string }> = {
  Active: { icon: ArrowUpRight, color: "text-emerald-400" },
  Planning: { icon: FileText, color: "text-blue-400" },
  "On Hold": { icon: Pause, color: "text-amber-400" },
  Completed: { icon: CheckCircle2, color: "text-primary" },
  Archived: { icon: Clock, color: "text-muted-foreground" },
};

const categoryBadgeColors: Record<ProjectCategory, string> = {
  Development: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  Marketing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Sales: "bg-red-500/15 text-red-400 border-red-500/20",
  Operations: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "Client Work": "bg-teal-500/15 text-teal-400 border-teal-500/20",
  Infrastructure: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Strategy: "bg-pink-500/15 text-pink-400 border-pink-500/20",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const emptyProject: Omit<Project, "id"> = {
    name: "",
    description: "",
    category: "Development",
    status: "Planning",
    progress: 0,
    lastUpdated: new Date().toISOString().split("T")[0],
    notes: "",
    color: "bg-blue-500",
  };
  const [newProject, setNewProject] = useState(emptyProject);

  const colorOptions = [
    { value: "bg-blue-500", label: "Blue" },
    { value: "bg-emerald-500", label: "Green" },
    { value: "bg-violet-500", label: "Violet" },
    { value: "bg-orange-500", label: "Orange" },
    { value: "bg-red-500", label: "Red" },
    { value: "bg-teal-500", label: "Teal" },
    { value: "bg-pink-500", label: "Pink" },
    { value: "bg-cyan-500", label: "Cyan" },
    { value: "bg-amber-500", label: "Amber" },
    { value: "bg-green-500", label: "Lime" },
  ];

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === "all" || p.status === filterStatus;
      const matchesCategory = filterCategory === "all" || p.category === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [projects, search, filterStatus, filterCategory]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [projects]);

  function getProjectTasks(projectId: string) {
    return mockTasks.filter((t) => t.projectId === projectId);
  }

  function handleAddProject() {
    const project: Project = {
      ...newProject,
      id: `proj-${Date.now()}`,
    };
    setProjects([project, ...projects]);
    setNewProject(emptyProject);
    setAddDialogOpen(false);
  }

  function handleUpdateProject(updated: Project) {
    setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedProject(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} total · {statusCounts["Active"] || 0} active · {statusCounts["Planning"] || 0} in planning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterStatus === "all" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs"
          onClick={() => setFilterStatus("all")}
        >
          All ({projects.length})
        </Button>
        {allStatuses.map((status) => {
          const config = statusIcons[status];
          const Icon = config.icon;
          return (
            <Button
              key={status}
              variant={filterStatus === status ? "secondary" : "ghost"}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
            >
              <Icon className={`h-3 w-3 ${config.color}`} />
              {status} ({statusCounts[status] || 0})
            </Button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Grid/List */}
      {filtered.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            No projects found matching your filters.
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => {
            const statusConf = statusIcons[project.status];
            const StatusIcon = statusConf.icon;
            const tasks = getProjectTasks(project.id);
            const openTasks = tasks.filter((t) => t.status !== "Done").length;
            return (
              <Card
                key={project.id}
                className="border-border bg-card cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                onClick={() => setSelectedProject(project)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-3 w-3 rounded-full ${project.color} flex-shrink-0`} />
                      <h3 className="font-semibold text-sm leading-tight">{project.name}</h3>
                    </div>
                    <StatusIcon className={`h-4 w-4 ${statusConf.color} flex-shrink-0`} />
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                    {project.description}
                  </p>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${project.color} transition-all duration-500`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <Badge variant="outline" className={categoryBadgeColors[project.category]}>
                      {project.category}
                    </Badge>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {openTasks > 0 && (
                        <span>{openTasks} task{openTasks !== 1 ? "s" : ""}</span>
                      )}
                      <span>
                        {new Date(project.lastUpdated + "T12:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((project) => {
            const statusConf = statusIcons[project.status];
            const StatusIcon = statusConf.icon;
            const tasks = getProjectTasks(project.id);
            const openTasks = tasks.filter((t) => t.status !== "Done").length;
            return (
              <Card
                key={project.id}
                className="border-border bg-card cursor-pointer transition-all hover:bg-secondary/30"
                onClick={() => setSelectedProject(project)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`h-3 w-3 rounded-full ${project.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <StatusIcon className={`h-3.5 w-3.5 ${statusConf.color} flex-shrink-0`} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {project.description}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    <Badge variant="outline" className={`${categoryBadgeColors[project.category]} text-[10px]`}>
                      {project.category}
                    </Badge>
                    <div className="w-24">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${project.color}`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                    {openTasks > 0 && (
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {openTasks} task{openTasks !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {new Date(project.lastUpdated + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Project Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g. Client Portal Build"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="What is this project about?"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newProject.category}
                  onValueChange={(v) => setNewProject({ ...newProject, category: v as ProjectCategory })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newProject.status}
                  onValueChange={(v) => setNewProject({ ...newProject, status: v as ProjectStatus })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={newProject.color}
                  onValueChange={(v) => setNewProject({ ...newProject, color: v })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${newProject.color}`} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${c.value}`} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Progress (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newProject.progress}
                  onChange={(e) => setNewProject({ ...newProject, progress: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newProject.notes}
                onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                rows={2}
                placeholder="Any initial notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddProject} disabled={!newProject.name}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail/Edit Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        {selectedProject && (
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`h-4 w-4 rounded-full ${selectedProject.color}`} />
                <DialogTitle className="text-xl">{selectedProject.name}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              {/* Top info row */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={categoryBadgeColors[selectedProject.category]}>
                  {selectedProject.category}
                </Badge>
                <Badge variant="outline" className="border-border">
                  {selectedProject.status}
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  Updated {new Date(selectedProject.lastUpdated + "T12:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={selectedProject.description}
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selectedProject.status}
                    onValueChange={(v) =>
                      setSelectedProject({ ...selectedProject, status: v as ProjectStatus })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allStatuses.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={selectedProject.category}
                    onValueChange={(v) =>
                      setSelectedProject({ ...selectedProject, category: v as ProjectCategory })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Progress (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedProject.progress}
                    onChange={(e) =>
                      setSelectedProject({
                        ...selectedProject,
                        progress: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${selectedProject.color} transition-all duration-300`}
                  style={{ width: `${selectedProject.progress}%` }}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={selectedProject.notes}
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              {/* Related tasks */}
              {getProjectTasks(selectedProject.id).length > 0 && (
                <div className="space-y-2">
                  <Label>Related Tasks</Label>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {getProjectTasks(selectedProject.id).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            task.status === "Done"
                              ? "bg-emerald-400"
                              : task.status === "In progress"
                              ? "bg-blue-400"
                              : "bg-gray-400"
                          }`}
                        />
                        <span className={`text-sm flex-1 ${task.status === "Done" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{task.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={() => handleUpdateProject(selectedProject)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
