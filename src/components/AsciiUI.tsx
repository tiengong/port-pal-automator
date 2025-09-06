import React, { useState } from 'react';
import { Card } from '@/components/ui/card';

export const AsciiUI = () => {
  const [selectedOption, setSelectedOption] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const options = ['Serial Port', 'Test Cases', 'Terminal', 'Settings'];

  const asciiArt = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                           SERIAL PILOT v1.0                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌─────────────────┐  ┌─────────────────────────────────────────────────────┐ ║
║  │   MAIN MENU     │  │              DATA TERMINAL                         │ ║
║  ├─────────────────┤  ├─────────────────────────────────────────────────────┤ ║
║  │ ${options.map((opt, i) => `${i === selectedOption ? '►' : ' '} ${opt.padEnd(13)}`).join(' │ │                                                     │ ║\n║  │ ')} │ │                                                     │ ║
║  │                 │  │  > Connected to COM3                                │ ║
║  └─────────────────┘  │  > Baud rate: 9600                                  │ ║
║                       │  > Data bits: 8                                     │ ║
║  ┌─────────────────┐  │  > Parity: None                                     │ ║
║  │   QUICK CONNECT │  │  > Stop bits: 1                                     │ ║
║  ├─────────────────┤  │                                                     │ ║
║  │                 │  │  [TX] AT+GMR                                        │ ║
║  │  Port: [COM3▼]  │  │  [RX] ESP32-S3 v1.2.0                              │ ║
║  │  Baud: [9600▼]  │  │  [TX] AT+CWMODE=1                                   │ ║
║  │                 │  │  [RX] OK                                            │ ║
║  │   [CONNECT]     │  │                                                     │ ║
║  │   [DISCONNECT]  │  │  $ ${inputValue.padEnd(44)}                      │ ║
║  └─────────────────┘  └─────────────────────────────────────────────────────┘ ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────────┐ ║
║  │                            STATUS BAR                                    │ ║
║  ├──────────────────────────────────────────────────────────────────────────┤ ║
║  │ Status: CONNECTED | Port: COM3 | Baud: 9600 | Bytes RX: 1247 TX: 892    │ ║
║  └──────────────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `;

  const asciiBox = (content: string, width: number = 50) => {
    const lines = content.split('\n').filter(line => line.trim());
    const paddedLines = lines.map(line => `│ ${line.padEnd(width - 4)} │`);
    const top = `┌${'─'.repeat(width - 2)}┐`;
    const bottom = `└${'─'.repeat(width - 2)}┘`;
    return [top, ...paddedLines, bottom].join('\n');
  };

  const simpleControls = `
┌─── SIMPLE CONTROLS ────┐
│                        │
│  [F1] Help             │
│  [F2] Save             │
│  [F3] Load             │
│  [F4] Exit             │
│                        │
│  [↑↓] Navigate Menu    │
│  [Enter] Select        │
│  [Esc] Back            │
│                        │
└────────────────────────┘
  `;

  return (
    <div className="w-full h-full bg-background p-4 overflow-auto">
      <Card className="p-6 bg-muted/50">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">ASCII Terminal Interface</h2>
            <p className="text-muted-foreground">Retro-style command line interface demo</p>
          </div>
          
          {/* Main ASCII Interface */}
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs leading-tight overflow-x-auto">
            <pre className="whitespace-pre">{asciiArt}</pre>
          </div>

          {/* Interactive Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Menu Navigation</h3>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedOption === index 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => setSelectedOption(index)}
                  >
                    <span className="font-mono">{selectedOption === index ? '►' : ' '} {option}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Terminal Input</h3>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter command..."
                className="w-full p-2 bg-black text-green-400 font-mono rounded border"
                maxLength={40}
              />
              <div className="mt-3 text-sm text-muted-foreground">
                <p>Type commands to see them in the terminal above</p>
              </div>
            </Card>

            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs">
              <pre className="whitespace-pre">{simpleControls}</pre>
            </div>
          </div>

          {/* ASCII Art Examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black text-cyan-400 p-4 rounded-lg font-mono text-xs">
              <pre className="whitespace-pre">{asciiBox('SERIAL CONNECTION\n\nPort: COM3\nBaud: 9600\nStatus: Connected\n\nBytes TX: 892\nBytes RX: 1247\n\nLast Activity:\n2024-01-15 14:30:22', 40)}</pre>
            </div>
            
            <div className="bg-black text-yellow-400 p-4 rounded-lg font-mono text-xs">
              <pre className="whitespace-pre">{asciiBox('TEST EXECUTION\n\n● Test Case 1: PASS\n● Test Case 2: PASS\n● Test Case 3: FAIL\n● Test Case 4: SKIP\n\nTotal: 4 tests\nPassed: 2\nFailed: 1\nSkipped: 1', 40)}</pre>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>This ASCII interface demonstrates retro terminal-style UI elements</p>
            <p>Perfect for embedded systems, debugging tools, or nostalgic applications</p>
          </div>
        </div>
      </Card>
    </div>
  );
};