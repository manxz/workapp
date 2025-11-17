"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

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

  const deleteProject = async (projectId: string) => {
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

      if (projectError) throw projectError;

      return true;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
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

