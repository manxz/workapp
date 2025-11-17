"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown, Plus, DotsThreeVertical } from "@phosphor-icons/react";
import NewProjectModal from "./NewProjectModal";
import DeleteProjectModal from "./DeleteProjectModal";

type Project = {
  id: string;
  name: string;
};

type ProjectsSidebarProps = {
  projects: Project[];
  selectedId?: string;
  onSelectProject?: (project: Project) => void;
  onCreateProject?: (name: string, description: string) => void;
  onDeleteProject?: (projectId: string) => void;
};

export default function ProjectsSidebar({
  projects,
  selectedId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}: ProjectsSidebarProps) {
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(null);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="bg-neutral-100 border-r border-neutral-200 flex flex-col gap-2 h-screen w-[200px] py-4 fixed left-16 top-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 h-6">
        <h2 className="text-lg font-medium text-black">Tracker</h2>
      </div>

      {/* Projects Section */}
      <div className="flex flex-col w-full">
        {/* Projects Header */}
        <div className="flex items-center justify-between px-4 pr-5 py-1.5">
          <div className="flex items-center gap-0.5">
            <p className="text-[13px] font-semibold text-neutral-500">
              Projects
            </p>
            <CaretDown size={16} className="text-neutral-500" weight="bold" />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="text-neutral-500 hover:text-black transition-colors"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>

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
                
                {/* Kebab Menu Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(showMenu === project.id ? null : project.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-black rounded-md w-5 h-5 flex items-center justify-center transition-opacity flex-shrink-0"
                >
                  <DotsThreeVertical size={16} weight="bold" />
                </button>
              </div>
              
              {/* Dropdown Menu */}
              {showMenu === project.id && (
                <div 
                  ref={menuRef}
                  className="absolute top-full left-2 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[160px] z-50"
                >
                  <button
                    onClick={() => {
                      setShowMenu(null);
                      setProjectToDelete(project);
                      setShowDeleteModal(true);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete project
                  </button>
                </div>
              )}
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

      {/* Delete Project Modal */}
      <DeleteProjectModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setProjectToDelete(null);
        }}
        onConfirm={() => {
          if (projectToDelete) {
            onDeleteProject?.(projectToDelete.id);
          }
          setProjectToDelete(null);
        }}
        projectName={projectToDelete?.name || ""}
      />
    </div>
  );
}

