# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/3615223c-acb9-4705-959c-b1ca4d3b38ba

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3615223c-acb9-4705-959c-b1ca4d3b38ba) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3615223c-acb9-4705-959c-b1ca4d3b38ba) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Troubleshooting Windows Desktop App

If the Serial Pilot desktop application fails to launch on Windows, follow these troubleshooting steps:

### Quick Checks

**1. Check WebView2 Runtime (Required)**
```powershell
# Check if WebView2 is installed
winget list --id Microsoft.EdgeWebView2Runtime -e
```

If not installed:
```powershell
# Install WebView2 Runtime
winget install Microsoft.EdgeWebView2Runtime
```

**2. Check Visual C++ Redistributable (Required)**
```powershell
# Check installed VC++ versions
Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*Visual C++*" } | Select-Object Name, Version
```

If missing, install from: https://aka.ms/vs/17/release/vc_redist.x64.exe

**3. Unblock Downloaded Executable**
```powershell
# Navigate to where you extracted the app
cd "path\to\Serial Pilot"

# Unblock the executable
Unblock-File .\serial-pilot.exe

# Check if resources folder exists (required)
Test-Path .\resources
```

**4. Check Application Exit Code**
```powershell
# Run app and check exit code
.\serial-pilot.exe
echo "Exit code: $LASTEXITCODE"
```

### Debug Builds

For detailed error information, download the **Console Debug Build** from GitHub Actions artifacts. This version shows detailed error messages in a console window and writes startup errors to `startup-error.txt` in the same directory as the executable.

### Installation Recommendations

- **Preferred**: Use the official installer (.msi or .exe) rather than extracting files manually
- **Manual extraction**: Ensure you extract the entire contents, including the `resources` folder
- **Portable use**: Copy the entire application directory, not just the .exe file

### Common Issues

- **Missing resources folder**: App won't start without the bundled resources
- **WebView2 missing**: Most common cause of silent startup failures  
- **VC++ Redistributable missing**: May cause DLL loading errors
- **Windows Defender/Antivirus**: May block unsigned executables

If none of these steps resolve the issue, please share the contents of `startup-error.txt` (if generated) or the console output from the debug build.

## Code Architecture Updates

### TestCaseManager Component Refactoring (2024-09-07)

The `TestCaseManager.tsx` component has been modularized to improve maintainability and reduce code duplication while preserving the exact UI appearance and functionality.

#### Changes Made:

1. **State Management Extraction** (`src/components/serial/hooks/useTestCaseState.ts`)
   - Centralized all React state management logic
   - Extracted 24+ useState hooks into a single cohesive hook
   - Added computed properties and utility functions

2. **Execution Logic Extraction** (`src/components/serial/hooks/useTestCaseExecution.ts`)
   - Separated test case execution logic from UI components
   - Implemented retry mechanisms and failure handling
   - Added execution status tracking and callbacks

3. **Drag & Drop Logic Extraction** (`src/components/serial/hooks/useTestCaseDragDrop.ts`)
   - Isolated drag and drop functionality
   - Implemented unified reordering for commands and sub-cases
   - Added drag state management

4. **Utility Functions Extraction** (`src/components/serial/utils/testCaseHelpers.ts`)
   - Consolidated repetitive utility functions
   - Added helper functions for test case operations
   - Implemented search, validation, and statistics functions

5. **UI Component Modularization**
   - Maintained 100% UI consistency with original design
   - Preserved all CSS classes, animations, and responsive behavior
   - Kept existing component structure (TestCaseHeader, TestCaseActions, etc.)

#### Benefits:

- **Reduced Code Duplication**: Eliminated repetitive state update patterns
- **Improved Maintainability**: Each module has a single responsibility
- **Better Testability**: Individual modules can be tested in isolation
- **Enhanced Readability**: Main component is now more focused on UI logic
- **Preserved Functionality**: All existing features work exactly as before

#### Files Created:

- `src/components/serial/hooks/useTestCaseState.ts` - State management hook
- `src/components/serial/hooks/useTestCaseExecution.ts` - Execution logic hook  
- `src/components/serial/hooks/useTestCaseDragDrop.ts` - Drag & drop hook
- `src/components/serial/utils/testCaseHelpers.ts` - Utility functions
- `src/components/serial/TestCaseManagerOptimized.tsx` - Refactored main component

#### Verification:

- ✅ UI layout and styling preserved 100%
- ✅ All existing functionality maintained
- ✅ Component behavior unchanged
- ✅ Responsive design intact
- ✅ TypeScript types compatible
