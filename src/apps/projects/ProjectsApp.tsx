"use client";

import { useState, useMemo, useEffect } from "react";
import ProjectsSidebar from "@/components/ProjectsSidebar";
import ProjectsView from "@/components/ProjectsView";
import type { Project } from "@/hooks/useProjects";
import type { Task } from "@/hooks/useTasks";

interface ProjectsAppProps {
  projects: Project[];
  tasks: Task[];
  createProject: (name: string, description?: string) => Promise<any>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  createTask: (title: string, type: "task" | "feature", projectId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

/**
 * Projects App Module
 * 
 * Complete project management system with:
 * - Multiple projects
 * - Kanban board (To do, In progress, Blocked, Backlog)
 * - Task management
 * - Project creation and deletion
 * 
 * This is extracted from the main page.tsx for code splitting.
 * Receives projects and tasks as props (lifted to page.tsx) to prevent refetching on app switch.
 */
export default function ProjectsApp({
  projects,
  tasks,
  createProject,
  deleteProject,
  createTask,
  updateTask,
  deleteTask,
}: ProjectsAppProps) {
  
  // Calculate task counts per project
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((task) => {
      counts[task.project] = (counts[task.project] || 0) + 1;
    });
    return counts;
  }, [tasks]);
  
  // Restore last selected project from localStorage
  const [selectedProject, setSelectedProject] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("selectedProjectId");
      if (saved) {
        return saved;
      }
    }
    return projects.length > 0 ? projects[0].id : null;
  });

  // Default to first project if no selection
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0].id);
    }
  }, [selectedProject, projects]);

  // Persist selected project to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedProject) {
      localStorage.setItem("selectedProjectId", selectedProject);
    }
  }, [selectedProject]);

  // Handle creating a new project
  const handleCreateProject = async (name: string, description: string) => {
    const newProject = await createProject(name, description);
    if (newProject) {
      setSelectedProject(newProject.id);
    }
  };

  // Handle deleting a project
  const handleDeleteProject = async (projectId: string) => {
    if (projects.length <= 1) {
      alert("You must have at least one project");
      return;
    }

    const result = await deleteProject(projectId);
    
    if (result.success) {
      // Switch to the first remaining project if the deleted project was selected
      if (projectId === selectedProject && projects.length > 1) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        if (remainingProjects.length > 0) {
          setSelectedProject(remainingProjects[0].id);
        }
      }
    } else {
      alert(result.error || "Failed to delete project");
    }
  };

  return (
    <>
      {/* Projects Sidebar */}
      <ProjectsSidebar
        projects={projects}
        selectedId={selectedProject || undefined}
        onSelectProject={(project) => {
          setSelectedProject(project.id);
        }}
        onCreateProject={handleCreateProject}
        taskCounts={taskCounts}
      />
      
      {/* Main Projects Area */}
      <main className="flex flex-col h-screen flex-1 relative overflow-hidden transition-all duration-200 ml-[264px]">
        {selectedProject && (
          <ProjectsView 
            selectedProject={selectedProject}
            projectName={projects.find(p => p.id === selectedProject)?.name || "General"}
            tasks={tasks.filter(t => t.project === selectedProject)}
            onDeleteProject={handleDeleteProject}
            onCreateTask={createTask}
            onUpdateTask={updateTask}
          />
        )}
      </main>
    </>
  );
}

