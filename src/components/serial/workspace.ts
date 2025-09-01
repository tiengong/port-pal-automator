import { TestCase } from './types';

// Workspace interface
export interface Workspace {
  id: string;
  name: string;
  persistence: 'browser' | 'fs';
  folderHandle?: FileSystemDirectoryHandle;
  createdAt: string;
  updatedAt: string;
}

// Persisted test case (stripped of runtime fields)
export interface PersistedTestCase {
  id: string;
  uniqueId: string;
  name: string;
  description: string;
  commands: any[];
  subCases: PersistedTestCase[];
  failureHandling?: 'stop' | 'continue' | 'prompt';
  isPreset?: boolean;
}

// Current workspace
let currentWorkspace: Workspace | null = null;

// Check if File System Access API is supported
const isFileSystemApiSupported = (): boolean => {
  return 'showDirectoryPicker' in window;
};

// Convert TestCase to PersistedTestCase (remove runtime fields)
export const toPersistedCase = (testCase: TestCase): PersistedTestCase => {
  return {
    id: testCase.id,
    uniqueId: testCase.uniqueId,
    name: testCase.name,
    description: testCase.description,
    commands: testCase.commands.map(cmd => ({
      ...cmd,
      status: 'pending', // reset status
      selected: false    // reset selection
    })),
    subCases: testCase.subCases.map(toPersistedCase),
    failureHandling: testCase.failureHandling,
    isPreset: testCase.isPreset
  };
};

// Convert PersistedTestCase to TestCase (add runtime fields)
export const fromPersistedCase = (persistedCase: PersistedTestCase): TestCase => {
  return {
    ...persistedCase,
    isExpanded: false,
    isRunning: false,
    currentCommand: -1,
    selected: false,
    status: 'pending',
    subCases: persistedCase.subCases.map(fromPersistedCase)
  };
};

// Get next unique ID for workspace
export const getNextUniqueId = async (): Promise<string> => {
  const cases = await loadCases();
  const maxId = cases.reduce((max, tc) => {
    const id = parseInt(tc.uniqueId) || 1000;
    return Math.max(max, id);
  }, 1000);
  return (maxId + 1).toString();
};

// List available workspaces
export const listWorkspaces = (): Workspace[] => {
  try {
    const stored = localStorage.getItem('lovable_workspaces');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    return [];
  }
};

// Create new workspace
export const createWorkspace = async (name: string, useFileSystem = false): Promise<Workspace> => {
  const workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let workspace: Workspace = {
    id: workspaceId,
    name,
    persistence: 'browser',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Try to use File System API if requested and supported
  if (useFileSystem && isFileSystemApiSupported()) {
    try {
      const folderHandle = await (window as any).showDirectoryPicker();
      workspace.persistence = 'fs';
      workspace.folderHandle = folderHandle;
      
      // Create workspace.json file
      const workspaceFile = await folderHandle.getFileHandle('workspace.json', { create: true });
      const writable = await workspaceFile.createWritable();
      await writable.write(JSON.stringify({
        name: workspace.name,
        createdAt: workspace.createdAt,
        caseList: []
      }, null, 2));
      await writable.close();
      
      // Create cases folder
      await folderHandle.getDirectoryHandle('cases', { create: true });
    } catch (error) {
      console.warn('File system access failed, falling back to browser storage:', error);
      workspace.persistence = 'browser';
    }
  }

  // Save workspace to list
  const workspaces = listWorkspaces();
  workspaces.push(workspace);
  localStorage.setItem('lovable_workspaces', JSON.stringify(workspaces));
  
  // Set as current workspace
  currentWorkspace = workspace;
  localStorage.setItem('lovable_current_workspace', JSON.stringify(workspace));
  
  return workspace;
};

// Open existing workspace
export const openWorkspace = async (workspaceId?: string, folderHandle?: FileSystemDirectoryHandle): Promise<Workspace> => {
  if (folderHandle) {
    // Opening from file system
    try {
      const workspaceFile = await folderHandle.getFileHandle('workspace.json');
      const file = await workspaceFile.getFile();
      const content = JSON.parse(await file.text());
      
      const workspace: Workspace = {
        id: `fs_${Date.now()}`,
        name: content.name,
        persistence: 'fs',
        folderHandle,
        createdAt: content.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      currentWorkspace = workspace;
      localStorage.setItem('lovable_current_workspace', JSON.stringify(workspace));
      return workspace;
    } catch (error) {
      throw new Error('Failed to read workspace from file system');
    }
  } else if (workspaceId) {
    // Opening from browser storage
    const workspaces = listWorkspaces();
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    
    currentWorkspace = workspace;
    localStorage.setItem('lovable_current_workspace', JSON.stringify(workspace));
    return workspace;
  }
  
  throw new Error('No workspace specified');
};

// Get current workspace
export const getCurrentWorkspace = (): Workspace | null => {
  if (currentWorkspace) return currentWorkspace;
  
  try {
    const stored = localStorage.getItem('lovable_current_workspace');
    if (stored) {
      currentWorkspace = JSON.parse(stored);
      return currentWorkspace;
    }
  } catch (error) {
    console.error('Failed to get current workspace:', error);
  }
  
  return null;
};

// Initialize default workspace
export const initializeDefaultWorkspace = async (): Promise<Workspace> => {
  let workspace = getCurrentWorkspace();
  if (!workspace) {
    workspace = await createWorkspace('默认工作区');
  }
  return workspace;
};

// Load test cases from current workspace
export const loadCases = async (): Promise<TestCase[]> => {
  const workspace = getCurrentWorkspace();
  if (!workspace) return [];
  
  if (workspace.persistence === 'fs' && workspace.folderHandle) {
    // Load from file system
    try {
      const casesFolder = await workspace.folderHandle.getDirectoryHandle('cases');
      const cases: TestCase[] = [];
      
      try {
        // Try to use async iterator if available
        for await (const [name, handle] of (casesFolder as any).entries()) {
          if (handle.kind === 'file' && name.endsWith('.json')) {
            const file = await handle.getFile();
            const content = JSON.parse(await file.text());
            cases.push(fromPersistedCase(content));
          }
        }
      } catch {
        // Fallback: Try to access known files or use a different approach
        console.warn('FileSystem API iteration not supported, using browser storage as fallback');
        return [];
      }
      
      return cases.sort((a, b) => parseInt(a.uniqueId) - parseInt(b.uniqueId));
    } catch (error) {
      console.error('Failed to load cases from file system:', error);
      return [];
    }
  } else {
    // Load from browser storage
    try {
      const stored = localStorage.getItem(`lovable_cases_${workspace.id}`);
      if (stored) {
        const persistedCases: PersistedTestCase[] = JSON.parse(stored);
        return persistedCases.map(fromPersistedCase);
      }
    } catch (error) {
      console.error('Failed to load cases from browser storage:', error);
    }
    
    return [];
  }
};

// Save test case to current workspace
export const saveCase = async (testCase: TestCase): Promise<void> => {
  const workspace = getCurrentWorkspace();
  if (!workspace) return;
  
  const persistedCase = toPersistedCase(testCase);
  
  if (workspace.persistence === 'fs' && workspace.folderHandle) {
    // Save to file system
    try {
      const casesFolder = await workspace.folderHandle.getDirectoryHandle('cases');
      const sanitizedName = testCase.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      const fileName = `${testCase.uniqueId}_${sanitizedName}.json`;
      const fileHandle = await casesFolder.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(persistedCase, null, 2));
      await writable.close();
    } catch (error) {
      console.error('Failed to save case to file system:', error);
      throw error;
    }
  } else {
    // Save to browser storage
    const cases = await loadCases();
    const existingIndex = cases.findIndex(c => c.id === testCase.id);
    const persistedCases = cases.map(toPersistedCase);
    
    if (existingIndex >= 0) {
      persistedCases[existingIndex] = persistedCase;
    } else {
      persistedCases.push(persistedCase);
    }
    
    localStorage.setItem(`lovable_cases_${workspace.id}`, JSON.stringify(persistedCases));
  }
};

// Delete test case from current workspace
export const deleteCase = async (uniqueId: string): Promise<void> => {
  const workspace = getCurrentWorkspace();
  if (!workspace) return;
  
  if (workspace.persistence === 'fs' && workspace.folderHandle) {
    // Delete from file system
    try {
      const casesFolder = await workspace.folderHandle.getDirectoryHandle('cases');
      
      try {
        // Try to use async iterator if available
        for await (const [name, handle] of (casesFolder as any).entries()) {
          if (handle.kind === 'file' && name.startsWith(`${uniqueId}_`)) {
            await casesFolder.removeEntry(name);
            break;
          }
        }
      } catch {
        // Fallback: construct filename and try to delete it
        const cases = await loadCases();
        const caseToDelete = cases.find(c => c.uniqueId === uniqueId);
        if (caseToDelete) {
          const sanitizedName = caseToDelete.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
          const fileName = `${uniqueId}_${sanitizedName}.json`;
          try {
            await casesFolder.removeEntry(fileName);
          } catch (error) {
            console.warn('Failed to delete specific file, attempting alternative cleanup');
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete case from file system:', error);
      throw error;
    }
  } else {
    // Delete from browser storage
    const cases = await loadCases();
    const filteredCases = cases.filter(c => c.uniqueId !== uniqueId);
    const persistedCases = filteredCases.map(toPersistedCase);
    localStorage.setItem(`lovable_cases_${workspace.id}`, JSON.stringify(persistedCases));
  }
};

// Clone test case
export const cloneCase = async (sourceId: string, newName: string): Promise<TestCase> => {
  const cases = await loadCases();
  const sourceCase = cases.find(c => c.id === sourceId || c.uniqueId === sourceId);
  
  if (!sourceCase) {
    throw new Error('Source case not found');
  }
  
  const newUniqueId = await getNextUniqueId();
  
  // Deep clone with new IDs
  const cloneWithNewIds = (testCase: TestCase): TestCase => {
    return {
      ...testCase,
      id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uniqueId: newUniqueId,
      name: newName,
      commands: testCase.commands.map(cmd => ({
        ...cmd,
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        selected: false
      })),
      subCases: testCase.subCases.map(sc => cloneWithNewIds({
        ...sc,
        uniqueId: '' // Sub-cases don't have uniqueId
      })),
      isExpanded: false,
      isRunning: false,
      currentCommand: -1,
      selected: false,
      status: 'pending'
    };
  };
  
  const clonedCase = cloneWithNewIds(sourceCase);
  await saveCase(clonedCase);
  
  return clonedCase;
};