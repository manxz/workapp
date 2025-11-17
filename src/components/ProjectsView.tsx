"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Article, ListBullets, Kanban, CheckCircle } from "@phosphor-icons/react";
import { useTasks } from "@/hooks/useTasks";
import { useUsers } from "@/hooks/useUsers";
import NewIssueModal from "./NewIssueModal";

type ProjectsViewProps = {
  selectedProject: string;
  projectName: string;
};

export default function ProjectsView({ selectedProject, projectName }: ProjectsViewProps) {
  const { tasks, createTask, updateTask } = useTasks(selectedProject);
  const { users } = useUsers();
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "backlog">("all");
  const [showModal, setShowModal] = useState(false);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return task.status !== "done";
    return task.status === filter;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const backlogTasks = filteredTasks.filter((t) => t.status === "backlog");

  const handleCreateTask = async (title: string, description: string, type: "task" | "feature") => {
    await createTask(title, type, selectedProject);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 px-4 h-14 flex items-center justify-between">
          {/* Left Side - Project Name and Filters */}
          <div className="flex items-center gap-2">
            {/* Project Name */}
            <p className="text-base font-medium text-black">{projectName}</p>

            {/* Filter Buttons */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setFilter("all")}
                className={`flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] border ${
                  filter === "all"
                    ? "bg-[#f5f5f5] border-[rgba(29,29,31,0.1)]"
                    : "border-transparent"
                }`}
              >
                <Article size={16} weight="regular" className="text-black" />
                <p className="text-xs font-medium text-black">All issues</p>
              </button>
              <button
                onClick={() => setFilter("todo")}
                className={`flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] border ${
                  filter === "todo"
                    ? "bg-[#f5f5f5] border-[rgba(29,29,31,0.1)]"
                    : "border-transparent"
                }`}
              >
                <img src="/icons/todo.svg" alt="To do" className="w-4 h-4" />
                <p className="text-xs font-medium text-black">To do</p>
              </button>
              <button
                onClick={() => setFilter("in_progress")}
                className={`flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] border ${
                  filter === "in_progress"
                    ? "bg-[#f5f5f5] border-[rgba(29,29,31,0.1)]"
                    : "border-transparent"
                }`}
              >
                <img src="/icons/in_progress.svg" alt="In progress" className="w-4 h-4" />
                <p className="text-xs font-medium text-black">In progress</p>
              </button>
              <button
                onClick={() => setFilter("backlog")}
                className={`flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] border ${
                  filter === "backlog"
                    ? "bg-[#f5f5f5] border-[rgba(29,29,31,0.1)]"
                    : "border-transparent"
                }`}
              >
                <img src="/icons/backlog.svg" alt="Backlog" className="w-4 h-4" />
                <p className="text-xs font-medium text-black">Backlog</p>
              </button>
            </div>
          </div>

          {/* Right Side - View Toggle and New Issue */}
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-0.5">
              <button className="flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)]">
                <ListBullets size={16} weight="regular" className="text-black" />
                <p className="text-xs font-medium text-black">List</p>
              </button>
              <button className="flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] border border-transparent">
                <Kanban size={16} weight="regular" className="text-black" />
                <p className="text-xs font-medium text-black">Board</p>
              </button>
            </div>

            {/* New Issue Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-2 h-6 bg-black border border-[rgba(29,29,31,0.2)] rounded-[7px] hover:bg-neutral-800 transition-colors"
            >
              <Plus size={12} weight="regular" className="text-white" />
              <p className="text-xs font-medium text-white">New issue</p>
            </button>
          </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">

        {/* To do Section */}
        {(filter === "all" || filter === "todo") && todoTasks.length > 0 && (
          <div>
            <div className="bg-[#fafafa] border-b border-[rgba(29,29,31,0.1)] py-1">
              <div className="flex items-center gap-2 py-1 rounded-md px-10">
                <div className="flex items-center gap-1">
                  <img src="/icons/todo.svg" alt="To do" className="w-4 h-4" />
                  <h3 className="text-xs font-medium text-black">To do</h3>
                </div>
                <span className="text-xs font-medium text-[#7d7d7f]">{todoTasks.length}</span>
              </div>
            </div>
            <div className="space-y-0">
              {todoTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={(status) => updateTask(task.id, { status })}
                />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Section */}
        {(filter === "all" || filter === "in_progress") && inProgressTasks.length > 0 && (
          <div>
            <div className={`bg-[#fafafa] border-b border-[rgba(29,29,31,0.1)] py-1 ${
              todoTasks.length > 0 ? "border-t" : ""
            }`}>
              <div className="flex items-center gap-2 py-1 rounded-md px-10">
                <div className="flex items-center gap-1">
                  <img src="/icons/in_progress.svg" alt="In progress" className="w-4 h-4" />
                  <h3 className="text-xs font-medium text-black">In progress</h3>
                </div>
                <span className="text-xs font-medium text-[#7d7d7f]">{inProgressTasks.length}</span>
              </div>
            </div>
            <div className="space-y-0">
              {inProgressTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={(status) => updateTask(task.id, { status })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Backlog Section */}
        {(filter === "all" || filter === "backlog") && backlogTasks.length > 0 && (
          <div>
            <div className={`bg-[#fafafa] border-b border-[rgba(29,29,31,0.1)] py-1 ${
              (todoTasks.length > 0 || inProgressTasks.length > 0) ? "border-t" : ""
            }`}>
              <div className="flex items-center gap-2 py-1 rounded-md px-10">
                <div className="flex items-center gap-1">
                  <img src="/icons/backlog.svg" alt="Backlog" className="w-4 h-4" />
                  <h3 className="text-xs font-medium text-black">Backlog</h3>
                </div>
                <span className="text-xs font-medium text-[#7d7d7f]">{backlogTasks.length}</span>
              </div>
            </div>
            <div className="space-y-0">
              {backlogTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={(status) => updateTask(task.id, { status })}
                />
              ))}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-neutral-500">No tasks yet</p>
          </div>
        )}
      </div>

      {/* New Issue Modal */}
      <NewIssueModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreateTask}
      />
    </div>
  );
}

function TaskRow({
  task,
  onStatusChange,
}: {
  task: any;
  onStatusChange: (status: "todo" | "in_progress" | "backlog" | "done") => void;
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };

    if (showStatusMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStatusMenu]);

  const getStatusIcon = (status: string) => {
    if (status === "in_progress") {
      return <img src="/icons/in_progress.svg" alt="In progress" className="w-4 h-4" />;
    }
    if (status === "backlog") {
      return <img src="/icons/backlog.svg" alt="Backlog" className="w-4 h-4" />;
    }
    if (status === "done") {
      return <CheckCircle size={16} weight="regular" className="text-black" />;
    }
    return <img src="/icons/todo.svg" alt="To do" className="w-4 h-4" />;
  };

  const statusOptions: Array<{
    value: "todo" | "in_progress" | "backlog" | "done";
    label: string;
  }> = [
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "To do" },
    { value: "in_progress", label: "In progress" },
    { value: "done", label: "Done" },
  ];

  return (
    <div className="flex items-center justify-between h-10 px-4 hover:bg-neutral-50 group">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[13px] font-medium text-[#7d7d7f]">
          {String(task.number).padStart(2, "0")}
        </span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex-shrink-0"
          >
            {getStatusIcon(task.status)}
          </button>
          
          {/* Status Dropdown */}
          {showStatusMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[rgba(29,29,31,0.2)] rounded-xl shadow-lg py-1 px-1 z-50 flex flex-col w-max">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onStatusChange(option.value);
                    setShowStatusMenu(false);
                  }}
                  className="flex items-center gap-1 pl-1.5 pr-2 py-1 h-6 text-left rounded-lg hover:bg-[#f5f5f5]"
                >
                  {getStatusIcon(option.value)}
                  <span className="text-xs font-medium text-black whitespace-nowrap">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-[13px] font-medium text-[#1d1d1f] flex-1">{task.title}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-medium text-black px-1 py-[2px] bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] leading-none tracking-[0.025px]">
          {task.type === "feature" ? "Feature" : "Task"}
        </span>
        {task.assignee_avatar ? (
          <img
            src={task.assignee_avatar}
            alt={task.assignee_name || ""}
            className="w-[18px] h-[18px] rounded-full"
          />
        ) : (
          <div className="w-[18px] h-[18px] rounded-full bg-neutral-200" />
        )}
      </div>
    </div>
  );
}

