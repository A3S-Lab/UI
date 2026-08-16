import { createContext, useContext, type ReactNode } from "react";
import type {
  PlaygroundLocale,
  PlaygroundSceneId,
  PlaygroundState,
} from "./playground-data";

export type WorkspaceContextValue = {
  locale: PlaygroundLocale;
  sceneId: PlaygroundSceneId;
  state: PlaygroundState;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WorkspaceContextValue;
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace panels require WorkspaceProvider.");
  return value;
}
