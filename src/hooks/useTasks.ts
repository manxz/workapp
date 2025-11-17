"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type Task = {
  id: string;
  number: number;
  title: string;
  status: "todo" | "in_progress" | "backlog" | "done" | "blocked";
  type: "task" | "feature";
  project: string;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  created_by: string;
  created_at: string;
};

export function useTasks(projectFilter?: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
        `)
        .order("number", { ascending: true });

      // Filter by project if provided
      if (projectFilter) {
        query = query.eq("project", projectFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const formattedTasks: Task[] = data.map((task) => ({
          id: task.id,
          number: task.number,
          title: task.title,
          status: task.status,
          type: task.type,
          project: task.project,
          assignee_id: task.assignee_id,
          assignee_name: task.assignee?.full_name || null,
          assignee_avatar: task.assignee?.avatar_url || null,
          created_by: task.created_by,
          created_at: task.created_at,
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  const createTask = useCallback(
    async (title: string, type: "task" | "feature" = "task", project: string = "General") => {
      if (!user) return;

      try {
        const { error } = await supabase.from("tasks").insert({
          title,
          type,
          status: "todo",
          project,
          created_by: user.id,
        });

        if (error) throw error;
      } catch (error) {
        console.error("Error creating task:", error);
      }
    },
    [user]
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: Partial<Pick<Task, "title" | "status" | "type" | "assignee_id">>
    ) => {
      try {
        const { error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", taskId);

        if (error) throw error;
      } catch (error) {
        console.error("Error updating task:", error);
      }
    },
    []
  );

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTasks]);

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
  };
}

