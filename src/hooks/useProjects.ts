"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Project data structure
 */
export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

/**
 * Manages project CRUD operations with real-time synchronization
 * 
 * @description
 * Loads all projects on mount and subscribes to real-time updates (INSERT, UPDATE, DELETE).
 * Automatically keeps the local state in sync with database changes across all clients.
 * 
 * ## Key Features
 * - **Real-time sync**: All clients see project changes instantly
 * - **Cascade delete**: Deleting a project also deletes all associated tasks
 * - **Automatic loading**: Fetches projects on mount when user is authenticated
 * 
 * ## Important Notes
 * - Projects are shared across all users (no RLS filtering by user)
 * - Deleting a project cascades to tasks (ensure user confirmation!)
 * - Loading state helps prevent UI flicker during initial fetch
 * 
 * @example
 * const { projects, loading, createProject, deleteProject } = useProjects();
 * 
 * // Create new project
 * const newProject = await createProject("My Project", "Description");
 * if (newProject) {
 *   setSelectedProject(newProject.id);
 * }
 * 
 * // Delete project (with cascade)
 * const success = await deleteProject(projectId);
 * 
 * @returns Project list, loading state, and CRUD functions
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    loadProjects();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setProjects((prev) => [...prev, payload.new as Project]);
          } else if (payload.eventType === "DELETE") {
            setProjects((prev) => prev.filter((p) => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setProjects((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as Project) : p))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description: string = "") => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating project:", error);
      return null;
    }
  };

  const deleteProject = async (projectId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Delete all tasks associated with this project
      const { error: tasksError } = await supabase
        .from("tasks")
        .delete()
        .eq("project", projectId);

      if (tasksError) throw tasksError;

      // Delete the project
      const { error: projectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (projectError) {
        // Check if it's an RLS policy violation
        if (projectError.code === '42501' || projectError.message?.includes('policy')) {
          return { 
            success: false, 
            error: "You don't have permission to delete this project. Only the project creator can delete it." 
          };
        }
        throw projectError;
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error deleting project:", error);
      return { 
        success: false, 
        error: error.message || "Failed to delete project" 
      };
    }
  };

  return {
    projects,
    loading,
    createProject,
    deleteProject,
    refreshProjects: loadProjects,
  };
}

