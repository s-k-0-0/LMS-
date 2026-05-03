import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Code2, Terminal } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Compiler() {
  const [code, setCode] = useState('// Write your code here\nconsole.log("Hello, Vidya!");');
  const [languageId, setLanguageId] = useState('93'); // JS for example
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...');
    
    // In a real app, this sends to Judge0 API. Mocking for preview.
    try {
      setTimeout(() => {
        let result = '';
        if (code.includes('console.log')) {
           const matches = code.match(/console\.log\((.*?)\)/);
           result = matches ? matches[1].replace(/["']/g, '') : 'Execution success';
        } else {
           result = 'Program finished execution with no output.';
        }
        setOutput(result);
        setIsRunning(false);
      }, 1000);
    } catch (e) {
      setOutput('Error connecting to Judge0 API');
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center ml-2">
          <Code2 className="h-6 w-6 text-pink-500 mr-2" />
          <h1 className="text-2xl font-bold font-sans tracking-tight">Code Lab</h1>
        </div>
        <div className="flex items-center gap-4">
          <Select value={languageId} onValueChange={setLanguageId}>
            <SelectTrigger className="w-[180px] bg-rose-900 border-rose-800 text-rose-200">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="bg-rose-900 border-rose-800 text-rose-200">
              <SelectItem value="50">C (GCC 9.2.0)</SelectItem>
              <SelectItem value="54">C++ (GCC 9.2.0)</SelectItem>
              <SelectItem value="62">Java (OpenJDK 13.0.1)</SelectItem>
              <SelectItem value="71">Python (3.8.1)</SelectItem>
              <SelectItem value="93">JavaScript (Node.js 12.14.0)</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={runCode} 
            disabled={isRunning}
            className="bg-pink-500 hover:bg-pink-600 text-rose-950 font-semibold rounded-lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Code
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-rose-800 rounded-2xl overflow-hidden shadow-none bg-rose-900 flex flex-col p-2">
          <div className="flex-1 rounded-xl overflow-hidden border border-rose-800/50">
            <Editor
              height="100%"
              theme="vs-dark"
              language={languageId === '93' ? 'javascript' : languageId === '71' ? 'python' : 'cpp'}
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                padding: { top: 16 },
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </div>

        <div className="border border-rose-800 rounded-2xl shadow-none bg-rose-900 flex flex-col overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-rose-800 flex items-center bg-transparent">
            <Terminal className="h-4 w-4 text-pink-500 mr-2" />
            <h2 className="text-sm font-semibold tracking-wide text-rose-400 uppercase">Terminal Output</h2>
          </div>
          <div className="flex-1 p-4 bg-transparent font-mono text-sm text-rose-300 overflow-y-auto w-full">
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
