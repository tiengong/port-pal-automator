import { TestCase } from './types';
import { readTextFile, writeTextFile, mkdir, readDir, exists, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';

// Workspace interface
export interface Workspace {
  id: string;
  name: string;
  persistence: 'browser' | 'fs' | 'tauri';
  folderHandle?: FileSystemDirectoryHandle;
  folderPath?: string; // For Tauri file system
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
  childrenOrder?: Array<{ type: 'command' | 'subcase'; id: string; index: number }>;
  failureHandling?: 'stop' | 'continue' | 'prompt';
  isPreset?: boolean;
}

// Current workspace
let currentWorkspace: Workspace | null = null;

// Check if File System Access API is supported
const isFileSystemApiSupported = (): boolean => {
  return 'showDirectoryPicker' in window;
};

// Check if running in Tauri
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Initialize desktop folder structure (Tauri only)
export const initializeDesktopStructure = async (): Promise<string> => {
  if (!isTauri()) {
    throw new Error('Desktop structure initialization only available in Tauri');
  }

  try {
    const appDir = await appDataDir();
    const testCasesDir = await join(appDir, 'test_cases');
    const logDir = await join(appDir, 'log');
    const syslogDir = await join(appDir, 'syslog');

    // Create directories if they don't exist
    await mkdir(testCasesDir, { recursive: true });
    await mkdir(logDir, { recursive: true });
    await mkdir(syslogDir, { recursive: true });

    return testCasesDir;
  } catch (error) {
    console.error('Failed to initialize desktop structure:', error);
    throw error;
  }
};

// Create default test case for desktop
const createDefaultTestCase = (): PersistedTestCase => {
  return {
    id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    uniqueId: 'DT001',
    name: 'default_test_cases',
    description: '默认测试用例',
    commands: [
      {
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'execution',
        command: 'AT',
        description: '基本AT命令测试',
        expectedResponse: 'OK',
        timeout: 1000,
        status: 'pending',
        selected: false
      }
    ],
    subCases: [],
    failureHandling: 'stop',
    isPreset: false
  };
};

// Generate next alphanumeric unique ID
export const getNextAlphanumericId = async (): Promise<string> => {
  const cases = await loadCases();
  
  // Find highest DT number
  let maxNum = 0;
  cases.forEach(tc => {
    const match = tc.uniqueId.match(/^DT(\d+)$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1]));
    }
  });
  
  const nextNum = maxNum + 1;
  return `DT${nextNum.toString().padStart(3, '0')}`;
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
    childrenOrder: testCase.childrenOrder,
    failureHandling: testCase.failureHandling,
    isPreset: testCase.isPreset
  };
};

// Convert PersistedTestCase to TestCase (add runtime fields)
export const fromPersistedCase = (persistedCase: PersistedTestCase): TestCase => {
  return {
    ...persistedCase,
    childrenOrder: persistedCase.childrenOrder,
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
  if (isTauri()) {
    return await getNextAlphanumericId();
  }
  
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

  // Tauri desktop mode
  if (isTauri()) {
    try {
      let folderPath: string;
      
      if (useFileSystem) {
        // Let user select folder
        folderPath = await open({
          directory: true,
          title: '选择测试用例存储文件夹'
        }) as string;
        
        if (!folderPath) {
          throw new Error('No folder selected');
        }
      } else {
        // Use default test_cases directory
        const testCasesDir = await initializeDesktopStructure();
        folderPath = await join(testCasesDir, name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_'));
        await mkdir(folderPath, { recursive: true });
      }
      
      workspace.persistence = 'tauri';
      workspace.folderPath = folderPath;
      
      // Create workspace.json file
      const workspaceFile = await join(folderPath, 'workspace.json');
      await writeTextFile(workspaceFile, JSON.stringify({
        name: workspace.name,
        createdAt: workspace.createdAt,
        caseList: []
      }, null, 2));
      
    } catch (error) {
      console.warn('Tauri file system access failed, falling back to browser storage:', error);
      workspace.persistence = 'browser';
    }
  }
  // Web browser mode with File System API
  else if (useFileSystem && isFileSystemApiSupported()) {
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
export const openWorkspace = async (workspaceId?: string, folderHandle?: FileSystemDirectoryHandle, folderPath?: string): Promise<Workspace> => {
  // Tauri desktop mode
  if (folderPath && isTauri()) {
    try {
      const workspaceFile = await join(folderPath, 'workspace.json');
      const content = JSON.parse(await readTextFile(workspaceFile));
      
      const workspace: Workspace = {
        id: `tauri_${Date.now()}`,
        name: content.name,
        persistence: 'tauri',
        folderPath,
        createdAt: content.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      currentWorkspace = workspace;
      localStorage.setItem('lovable_current_workspace', JSON.stringify(workspace));
      return workspace;
    } catch (error) {
      throw new Error('Failed to read workspace from Tauri file system');
    }
  }
  // Web browser mode with File System API
  else if (folderHandle) {
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
  } 
  // Browser storage mode
  else if (workspaceId) {
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
  
  // Check if we need to create default workspace
  if (!workspace) {
    if (isTauri()) {
      // Desktop mode: create default workspace with DT001 test case
      try {
        const testCasesDir = await initializeDesktopStructure();
        const defaultWorkspacePath = await join(testCasesDir, 'default_workspace');
        
        // Check if default workspace exists
        const workspaceExists = await exists(defaultWorkspacePath);
        if (!workspaceExists) {
          await mkdir(defaultWorkspacePath, { recursive: true });
          
          // Create workspace.json
          const workspaceFile = await join(defaultWorkspacePath, 'workspace.json');
          await writeTextFile(workspaceFile, JSON.stringify({
            name: '默认工作区',
            createdAt: new Date().toISOString(),
            caseList: []
          }, null, 2));
          
          // Create default test case DT001
          const defaultCase = createDefaultTestCase();
          const testCaseFile = await join(defaultWorkspacePath, `${defaultCase.uniqueId}_${defaultCase.name}.json`);
          await writeTextFile(testCaseFile, JSON.stringify(defaultCase, null, 2));
        }
        
        workspace = {
          id: 'default_workspace',
          name: '默认工作区',
          persistence: 'tauri',
          folderPath: defaultWorkspacePath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
      } catch (error) {
        console.error('Failed to create desktop default workspace:', error);
        workspace = await createWorkspace('默认工作区');
      }
    } else {
      // Web mode: create browser storage workspace
      workspace = await createWorkspace('默认工作区');
    }
    
    currentWorkspace = workspace;
    localStorage.setItem('lovable_current_workspace', JSON.stringify(workspace));
  }
  
  return workspace;
};

// Remember last opened test case
export const getLastOpenedTestCase = (): string | null => {
  try {
    return localStorage.getItem('lovable_last_test_case');
  } catch (error) {
    console.error('Failed to get last opened test case:', error);
    return null;
  }
};

export const setLastOpenedTestCase = (uniqueId: string): void => {
  try {
    localStorage.setItem('lovable_last_test_case', uniqueId);
  } catch (error) {
    console.error('Failed to set last opened test case:', error);
  }
};

// Auto-save functionality
let autoSaveTimeout: NodeJS.Timeout | null = null;

export const scheduleAutoSave = (testCase: TestCase, delay = 1000): void => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(async () => {
    try {
      await saveCase(testCase);
      console.log(`Auto-saved test case: ${testCase.name}`);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, delay);
};

// Load test cases from current workspace
export const loadCases = async (): Promise<TestCase[]> => {
  const workspace = getCurrentWorkspace();
  if (!workspace) return [];
  
  // Tauri desktop mode
  if (workspace.persistence === 'tauri' && workspace.folderPath) {
    try {
      const entries = await readDir(workspace.folderPath);
      const cases: TestCase[] = [];
      
      for (const entry of entries) {
        if (entry.name?.endsWith('.json') && entry.name !== 'workspace.json') {
          const filePath = await join(workspace.folderPath, entry.name);
          const content = await readTextFile(filePath);
          const persistedCase: PersistedTestCase = JSON.parse(content);
          cases.push(fromPersistedCase(persistedCase));
        }
      }
      
      return cases.sort((a, b) => {
        // Sort alphanumeric IDs properly
        if (a.uniqueId.match(/^DT\d+$/) && b.uniqueId.match(/^DT\d+$/)) {
          const aNum = parseInt(a.uniqueId.substring(2));
          const bNum = parseInt(b.uniqueId.substring(2));
          return aNum - bNum;
        }
        return parseInt(a.uniqueId) - parseInt(b.uniqueId);
      });
    } catch (error) {
      console.error('Failed to load cases from Tauri file system:', error);
      return [];
    }
  }
  // Web browser File System API mode  
  else if (workspace.persistence === 'fs' && workspace.folderHandle) {
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
  } 
  // Browser storage mode
  else {
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
  
  // Tauri desktop mode
  if (workspace.persistence === 'tauri' && workspace.folderPath) {
    try {
      const sanitizedName = testCase.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
      const fileName = `${testCase.uniqueId}_${sanitizedName}.json`;
      const filePath = await join(workspace.folderPath, fileName);
      await writeTextFile(filePath, JSON.stringify(persistedCase, null, 2));
    } catch (error) {
      console.error('Failed to save case to Tauri file system:', error);
      throw error;
    }
  }
  // Web browser File System API mode
  else if (workspace.persistence === 'fs' && workspace.folderHandle) {
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
  } 
  // Browser storage mode
  else {
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
  
  // Tauri desktop mode
  if (workspace.persistence === 'tauri' && workspace.folderPath) {
    try {
      const entries = await readDir(workspace.folderPath);
      
      for (const entry of entries) {
        if (entry.name?.startsWith(`${uniqueId}_`) && entry.name.endsWith('.json')) {
          const filePath = await join(workspace.folderPath, entry.name);
          await remove(filePath);
          break;
        }
      }
    } catch (error) {
      console.error('Failed to delete case from Tauri file system:', error);
      throw error;
    }
  }
  // Web browser File System API mode
  else if (workspace.persistence === 'fs' && workspace.folderHandle) {
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
  } 
  // Browser storage mode
  else {
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