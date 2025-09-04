# Third-Party Notices

This software contains third-party libraries and components. The following is a list of these components along with their respective licenses.

## Frontend Dependencies (Node.js/NPM)

### React Framework
- **react** and **react-dom** - MIT License
- **@types/react** and **@types/react-dom** - MIT License

### Tauri Integration
- **@tauri-apps/api** - Apache-2.0 OR MIT License
- **@tauri-apps/plugin-fs** - Apache-2.0 OR MIT License  
- **@tauri-apps/plugin-dialog** - Apache-2.0 OR MIT License

### UI Components & Styling
- **@radix-ui/** components - MIT License
- **tailwindcss** - MIT License
- **lucide-react** - ISC License
- **class-variance-authority** - Apache-2.0 License

### Utilities
- **clsx** - MIT License
- **tailwind-merge** - MIT License
- **zod** - MIT License

### Internationalization
- **i18next** and **react-i18next** - MIT License

### Development Tools
- **typescript** - Apache-2.0 License
- **vite** - MIT License
- **eslint** - MIT License

## Backend Dependencies (Rust/Cargo)

### Tauri Framework
- **tauri** - Apache-2.0 OR MIT License
- **tauri-build** - Apache-2.0 OR MIT License
- **tauri-plugin-*** - Apache-2.0 OR MIT License

### Serial Communication
- **tauri-plugin-serialplugin** - Apache-2.0 OR MIT License

### Data Serialization
- **serde** and **serde_json** - Apache-2.0 OR MIT License

### Utilities
- **log** - Apache-2.0 OR MIT License
- **chrono** - Apache-2.0 OR MIT License

---

**Note for Commercial Use:**

To generate a complete and accurate third-party notice file for commercial distribution:

1. **For Node.js dependencies**, run:
   ```bash
   npx license-checker --summary
   npx license-checker --csv > frontend-licenses.csv
   ```

2. **For Rust dependencies**, run:
   ```bash
   cd src-tauri
   cargo tree --format "{p} {l}" | sort | uniq > rust-licenses.txt
   ```

3. Review each license for commercial compatibility and include full license texts where required.

4. Some licenses (like GPL, LGPL) may require additional obligations for commercial use.

5. Consider using automated tools like `cargo-about` for Rust dependencies or `license-checker` for Node.js dependencies to generate comprehensive reports.

**Disclaimer:** This is a template. Please verify all licenses and their requirements before commercial use.