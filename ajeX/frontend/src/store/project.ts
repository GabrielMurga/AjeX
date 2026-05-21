import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProjectState {
  currentProjectId: string | null;
  setProject: (id: string | null) => void;
}

export const useProject = create<ProjectState>()(
  persist(
    (set) => ({
      currentProjectId: null,
      setProject: (id) => set({ currentProjectId: id }),
    }),
    { name: "ajex-project" }
  )
);
