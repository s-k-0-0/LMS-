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
    if (!code.trim()) {
      setOutput('Please write some code before running.');
      return;
    }

    const apiKey = import.meta.env.VITE_JUDGE0_API_KEY;
    const apiHost = import.meta.env.VITE_JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';

    if (!apiKey) {
      setOutput('VITE_JUDGE0_API_KEY is not configured in environment variables.');
      return;
    }

    setIsRunning(true);
    setOutput('Submitting to Judge0...');
    
    try {
      // 1. Submit code
      const submitResponse = await fetch(`https://${apiHost}/submissions?base64_encoded=true&fields=*`, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': apiHost,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language_id: parseInt(languageId),
          source_code: btoa(unescape(encodeURIComponent(code)))
        })
      });

      if (!submitResponse.ok) {
        throw new Error(`Submit failed: ${submitResponse.statusText}`);
      }

      const submitData = await submitResponse.json();
      const token = submitData.token;

      if (!token) {
        throw new Error('No token received from compiler.');
      }

      setOutput('Compiling and running...');

      // 2. Poll for results
      let isDone = false;
      let attempt = 0;
      let finalOutput = '';

      while (!isDone && attempt < 20) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempt++;

        const resultResponse = await fetch(`https://${apiHost}/submissions/${token}?base64_encoded=true&fields=*`, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': apiHost,
          }
        });

        if (!resultResponse.ok) {
          throw new Error('Failed to fetch execution results.');
        }

        const resultData = await resultResponse.json();
        const statusId = resultData.status?.id;

        // 1 = In Queue, 2 = Processing
        if (statusId > 2) {
          isDone = true;
          
          const decode = (str: string) => str ? decodeURIComponent(escape(atob(str))) : '';
          
          if (statusId === 3) {
            finalOutput = decode(resultData.stdout);
          } else if (resultData.compile_output) {
            finalOutput = `Compilation Error:\n${decode(resultData.compile_output)}`;
          } else if (resultData.stderr) {
            finalOutput = `Error:\n${decode(resultData.stderr)}`;
          } else {
            finalOutput = `Execution finished with status: ${resultData.status?.description}\n${decode(resultData.message || '')}`;
          }
        }
      }

      if (!isDone) {
        setOutput('Execution timed out.');
      } else {
        setOutput(finalOutput || '\n(No output)');
      }
    } catch (e: any) {
       console.error("Compiler error", e);
       setOutput(`Error connecting to Judge0 API: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center ml-2">
          <Code2 className="h-6 w-6 text-[#5E171B] mr-2" />
          <h1 className="text-2xl font-bold font-sans tracking-tight">Code Lab</h1>
        </div>
        <div className="flex items-center gap-4">
          <Select value={languageId} onValueChange={setLanguageId}>
            <SelectTrigger className="w-[180px] bg-white border-gray-200 text-gray-800">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-800">
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
            className="bg-[#5E171B] hover:bg-[#450F13] text-white font-semibold rounded-lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Code
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-gray-200 rounded-2xl overflow-hidden shadow-none bg-white flex flex-col p-2">
          <div className="flex-1 rounded-xl overflow-hidden border border-gray-200/50">
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

        <div className="border border-gray-200 rounded-2xl shadow-none bg-white flex flex-col overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center bg-transparent">
            <Terminal className="h-4 w-4 text-[#5E171B] mr-2" />
            <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Terminal Output</h2>
          </div>
          <div className="flex-1 p-4 bg-transparent font-mono text-sm text-gray-700 overflow-y-auto w-full">
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
