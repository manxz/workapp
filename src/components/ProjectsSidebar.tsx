"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import NewProjectModal from "./NewProjectModal";

type Project = {
  id: string;
  name: string;
};

type ProjectsSidebarProps = {
  projects: Project[];
  selectedId?: string;
  onSelectProject?: (project: Project) => void;
  onCreateProject?: (name: string, description: string) => void;
  taskCounts?: Record<string, number>;
};

export default function ProjectsSidebar({
  projects,
  selectedId,
  onSelectProject,
  onCreateProject,
  taskCounts = {},
}: ProjectsSidebarProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col gap-2 h-screen w-[200px] py-4 fixed left-16 top-0">
      {/* Header */}
      <div className="pl-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <h2 className="text-lg font-medium text-black">Projects</h2>
          <button 
            onClick={() => setShowModal(true)}
            className="text-black hover:bg-neutral-200 rounded-md w-6 h-6 flex items-center justify-center transition-colors"
          >
            <Plus size={16} weight="regular" />
          </button>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex flex-col w-full">
        {/* Projects List */}
        <div className="flex flex-col px-2">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <div className={`flex items-center justify-between w-full px-2 py-1.5 rounded-[7px] transition-colors ${
                selectedId === project.id
                  ? "bg-neutral-200"
                  : "hover:bg-neutral-200"
              }`}>
                <button
                  onClick={() => onSelectProject?.(project)}
                  className="flex-1 text-left"
                >
                  <p className="text-[13px] font-semibold text-black">
                    {project.name}
                  </p>
                </button>
                
                {/* Count */}
                <span className="text-[12px] font-medium text-[#7d7d7f]">
                  {taskCounts[project.id] || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={(name, description) => {
          onCreateProject?.(name, description);
        }}
      />
    </div>
  );
}

