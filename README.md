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
