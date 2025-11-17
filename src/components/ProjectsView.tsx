"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Article, ListBullets, Kanban, CheckCircle, Prohibit } from "@phosphor-icons/react";
import { useTasks } from "@/hooks/useTasks";
import { useUsers } from "@/hooks/useUsers";
import NewIssueModal from "./NewIssueModal";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";

type ProjectsViewProps = {
  selectedProject: string;
  projectName: string;
};

export default function ProjectsView({ selectedProject, projectName }: ProjectsViewProps) {
  const { tasks, createTask, updateTask } = useTasks(selectedProject);
  const { users } = useUsers();
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "backlog" | "blocked">("all");
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"list" | "board">("list");

  // Filter tasks for list view
  const getFilteredTasks = () => {
    const nonDoneTasks = tasks.filter((task) => task.status !== "done");
    if (view === "board" || filter === "all") return nonDoneTasks;
    return nonDoneTasks.filter((task) => task.status === filter);
  };

  const filteredTasks = getFilteredTasks();

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const blockedTasks = filteredTasks.filter((t) => t.status === "blocked");
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

            {/* Filter Buttons - Only show in List view */}
            {view === "list" && (
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
                  onClick={() => setFilter("blocked")}
                  className={`flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] border ${
                    filter === "blocked"
                      ? "bg-[#f5f5f5] border-[rgba(29,29,31,0.1)]"
                      : "border-transparent"
                  }`}
                >
                  <Prohibit size={16} weight="regular" className="text-black" />
                  <p className="text-xs font-medium text-black">Blocked</p>
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
            )}
          </div>

              {/* Right Side - View Toggle and New Issue */}
              <div className="flex items-center gap-4">
                {/* View Toggle */}
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={() => setView("list")}
                    className={`flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] border ${
                      view === "list"
                        ? "bg-[#f5f5f5] border-[rgba(29,29,31,0.1)]"
                        : "border-transparent"
                    }`}
                  >
                    <ListBullets size={16} weight="regular" className="text-black" />
                    <p className="text-xs font-medium text-black">List</p>
                  </button>
                  <button 
                    onClick={() => setView("board")}
                    className={`flex items-center gap-1 pl-1.5 pr-2 py-1 rounded-[7px] border ${
                      view === "board"
                        ? "bg-[#f5f5f5] border-[rgba(29,29,31,0.1)]"
                        : "border-transparent"
                    }`}
                  >
                    <Kanban size={16} weight="regular" className="text-black" />
                    <p className="text-xs font-medium text-black">Board</p>
                  </button>
                </div>

            {/* New Issue Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 pl-1.5 pr-2 py-1 bg-black border border-[rgba(29,29,31,0.2)] rounded-[7px] hover:bg-neutral-800 transition-colors"
            >
              <Plus size={12} weight="regular" className="text-white" />
              <p className="text-xs font-medium text-white">New issue</p>
            </button>
          </div>
      </div>

      {/* Content - List or Board View */}
      <div className="flex-1 overflow-y-auto">
        {view === "list" ? (
          /* List View */
          <div>

        {/* To do Section */}
        {(filter === "all" || filter === "todo") && todoTasks.length > 0 && (
          <div>
            <div className="bg-[#fafafa] border-b border-[rgba(29,29,31,0.1)] h-8 flex items-center justify-start gap-2 px-10 py-0">
              <div className="flex items-center gap-1">
                <div className="flex items-center justify-center h-4 w-4">
                  <img src="/icons/todo.svg" alt="To do" className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-black leading-[12px]">To do</span>
              </div>
              <span className="text-xs font-medium text-[#7d7d7f] leading-[12px]">{todoTasks.length}</span>
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

        {/* Blocked Section */}
        {(filter === "all" || filter === "blocked") && blockedTasks.length > 0 && (
          <div>
            <div className={`bg-[#fafafa] border-b border-[rgba(29,29,31,0.1)] h-8 flex items-center justify-start gap-2 px-10 py-0 ${
              todoTasks.length > 0 ? "border-t" : ""
            }`}>
              <div className="flex items-center gap-1">
                <div className="flex items-center justify-center h-4 w-4">
                  <Prohibit size={16} weight="regular" className="text-black" />
                </div>
                <span className="text-xs font-medium text-black leading-[12px]">Blocked</span>
              </div>
              <span className="text-xs font-medium text-[#7d7d7f] leading-[12px]">{blockedTasks.length}</span>
            </div>
            <div className="space-y-0">
              {blockedTasks.map((task) => (
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
            <div className={`bg-[#fafafa] border-b border-[rgba(29,29,31,0.1)] h-8 flex items-center justify-start gap-2 px-10 py-0 ${
              (todoTasks.length > 0 || blockedTasks.length > 0) ? "border-t" : ""
            }`}>
              <div className="flex items-center gap-1">
                <div className="flex items-center justify-center h-4 w-4">
                  <img src="/icons/in_progress.svg" alt="In progress" className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-black leading-[12px]">In progress</span>
              </div>
              <span className="text-xs font-medium text-[#7d7d7f] leading-[12px]">{inProgressTasks.length}</span>
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
            <div className={`bg-[#fafafa] border-b border-[rgba(29,29,31,0.1)] h-8 flex items-center justify-start gap-2 px-10 py-0 ${
              (todoTasks.length > 0 || blockedTasks.length > 0 || inProgressTasks.length > 0) ? "border-t" : ""
            }`}>
              <div className="flex items-center gap-1">
                <div className="flex items-center justify-center h-4 w-4">
                  <img src="/icons/backlog.svg" alt="Backlog" className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-black leading-[12px]">Backlog</span>
              </div>
              <span className="text-xs font-medium text-[#7d7d7f] leading-[12px]">{backlogTasks.length}</span>
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
        ) : (
          /* Board View */
          <KanbanBoard 
            tasks={filteredTasks} 
            onStatusChange={(taskId, status) => updateTask(taskId, { status })}
          />
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

// Kanban Board Component
function KanbanBoard({
  tasks,
  onStatusChange,
}: {
  tasks: any[];
  onStatusChange: (taskId: string, status: "todo" | "in_progress" | "backlog" | "done" | "blocked") => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [optimisticTasks, setOptimisticTasks] = useState<any[]>(tasks);

  // Update optimistic tasks when real tasks change
  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setOverId(null);
      return;
    }
    
    setOverId(over.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);
    
    if (!over) {
      return;
    }
    
    const taskId = active.id as string;
    const newStatus = over.id as "todo" | "in_progress" | "backlog" | "done" | "blocked";
    
    // Optimistically update immediately for smooth transition
    setOptimisticTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
    
    // Update the task status in database
    onStatusChange(taskId, newStatus);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
    setOptimisticTasks(tasks);
  };

  // Filter tasks by their optimistic status
  const backlogTasks = optimisticTasks.filter((t) => t.status === "backlog");
  const todoTasks = optimisticTasks.filter((t) => t.status === "todo");
  const blockedTasks = optimisticTasks.filter((t) => t.status === "blocked");
  const inProgressTasks = optimisticTasks.filter((t) => t.status === "in_progress");
  const doneTasks = optimisticTasks.filter((t) => t.status === "done");

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext 
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full">
        <KanbanColumn 
          id="backlog"
          title="Backlog" 
          tasks={backlogTasks} 
          icon={<img src="/icons/backlog.svg" alt="Backlog" className="w-4 h-4" />}
          onStatusChange={onStatusChange}
          isOver={overId === "backlog"}
          activeId={activeId}
        />
        <KanbanColumn 
          id="todo"
          title="To do" 
          tasks={todoTasks} 
          icon={<img src="/icons/todo.svg" alt="To do" className="w-4 h-4" />}
          onStatusChange={onStatusChange}
          isOver={overId === "todo"}
          activeId={activeId}
        />
        <KanbanColumn 
          id="blocked"
          title="Blocked" 
          tasks={blockedTasks} 
          icon={<Prohibit size={16} weight="regular" className="text-black" />}
          onStatusChange={onStatusChange}
          isOver={overId === "blocked"}
          activeId={activeId}
        />
        <KanbanColumn 
          id="in_progress"
          title="In progress" 
          tasks={inProgressTasks} 
          icon={<img src="/icons/in_progress.svg" alt="In progress" className="w-4 h-4" />}
          onStatusChange={onStatusChange}
          isOver={overId === "in_progress"}
          activeId={activeId}
        />
        <KanbanColumn 
          id="done"
          title="Done" 
          tasks={doneTasks} 
          icon={<CheckCircle size={16} weight="regular" className="text-black" />}
          onStatusChange={onStatusChange}
          isOver={overId === "done"}
          activeId={activeId}
        />
      </div>
      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} onStatusChange={onStatusChange} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// Kanban Column Component
function KanbanColumn({
  id,
  title,
  tasks,
  icon,
  onStatusChange,
  isOver,
  activeId,
}: {
  id: string;
  title: string;
  tasks: any[];
  icon: React.ReactNode;
  onStatusChange: (taskId: string, status: "todo" | "in_progress" | "backlog" | "done" | "blocked") => void;
  isOver: boolean;
  activeId: string | null;
}) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex-1 flex flex-col gap-2 min-w-0 transition-colors ${
        isOver ? "bg-[#f0f0f0]" : "bg-[#fafafa]"
      }`}
    >
      <div className="flex h-8 items-center justify-start gap-2 px-4 py-0 border-b border-[rgba(29,29,31,0.1)]">
        <div className="flex items-center gap-1">
          <div className="flex items-center justify-center h-4 w-4">
            {icon}
          </div>
          <span className="text-xs font-medium text-black leading-[12px]">{title}</span>
        </div>
        <span className="text-xs font-medium text-[#7d7d7f] leading-[12px]">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2 px-2 py-2 min-h-[100px]">
        {tasks.map((task) => (
          task.id !== activeId && <KanbanCard key={task.id} task={task} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}

// Kanban Card Component
function KanbanCard({
  task,
  onStatusChange,
  isDragging = false,
}: {
  task: any;
  onStatusChange: (taskId: string, status: "todo" | "in_progress" | "backlog" | "done" | "blocked") => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-[rgba(29,29,31,0.2)] rounded-xl p-2 flex flex-col gap-4 cursor-grab active:cursor-grabbing ${
        isBeingDragged ? "opacity-50" : ""
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between">
          <span className="text-[13px] font-medium text-[#7d7d7f]">
            {String(task.number).padStart(2, "0")}
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
        <p className="text-[13px] font-medium text-[#1d1d1f]">{task.title}</p>
      </div>
      <div className="flex items-center">
        <span className="text-[10px] font-medium text-black px-1 py-[2px] bg-[#f5f5f5] border border-[rgba(29,29,31,0.1)] rounded-[5px] leading-none tracking-[0.025px]">
          {task.type === "feature" ? "Feature" : "Task"}
        </span>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onStatusChange,
}: {
  task: any;
  onStatusChange: (status: "todo" | "in_progress" | "backlog" | "done" | "blocked") => void;
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
    if (status === "blocked") {
      return <Prohibit size={16} weight="regular" className="text-black" />;
    }
    if (status === "done") {
      return <CheckCircle size={16} weight="regular" className="text-black" />;
    }
    return <img src="/icons/todo.svg" alt="To do" className="w-4 h-4" />;
  };

  const statusOptions: Array<{
    value: "todo" | "in_progress" | "backlog" | "done" | "blocked";
    label: string;
  }> = [
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "To do" },
    { value: "blocked", label: "Blocked" },
    { value: "in_progress", label: "In progress" },
    { value: "done", label: "Done" },
  ];

  return (
    <div className="flex items-center justify-between h-10 px-4 hover:bg-neutral-50 group">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-[13px] font-medium text-[#7d7d7f] leading-none">
          {String(task.number).padStart(2, "0")}
        </span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex-shrink-0 flex items-center justify-center"
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
        <p className="text-[13px] font-medium text-[#1d1d1f] flex-1 leading-none">{task.title}</p>
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

