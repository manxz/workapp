"use client";

import { useState, useMemo, useEffect } from "react";
import ProjectsSidebar from "@/components/ProjectsSidebar";
import ProjectsView from "@/components/ProjectsView";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";

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
 */
export default function ProjectsApp() {
  const { projects, createProject, deleteProject } = useProjects();
  const { tasks } = useTasks(); // Load all tasks
  
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

    const success = await deleteProject(projectId);
    
    if (success) {
      // Switch to the first remaining project if the deleted project was selected
      if (projectId === selectedProject && projects.length > 1) {
        const remainingProjects = projects.filter(p => p.id !== projectId);
        if (remainingProjects.length > 0) {
          setSelectedProject(remainingProjects[0].id);
        }
      }
    } else {
      alert("Failed to delete project");
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
            onDeleteProject={handleDeleteProject}
          />
        )}
      </main>
    </>
  );
}

