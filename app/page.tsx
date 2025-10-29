"use client";

import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react'; // Optional for optimized effects
import ERCanvas from './components/ERCanvas';
import Papa from 'react-papaparse';
import { normalizeData, generateSQL } from '@/lib/normalize';
import type { NormalizationData } from '@/lib/types';
import { Button } from './components/ui/button'; // Assuming shadcn or Tailwind button

export default function Home() {
  const [stage, setStage] = useState(0); // 0=start, 1=UNF, 2=1NF, 3=2NF, 4=3NF, 5=summary
  const [data, setData] = useState<any>([]);
  const [normData, setNormData] = useState<NormalizationData | null>(null);
  const [sql, setSql] = useState('');
  const { readString } = Papa;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stages = ['UNF', '1NF', '2NF', '3NF'];
  const currentSchema = normData ? normData[stages[stage - 1]] : null;
  const currentNarration = getNarration(stage);

  // Load sample dataset
  const loadSample = async () => {
    const res = await fetch('data/tvdataset.csv');
    const csv = await res.text();
    readString(csv, {
      header: true,
      complete: (results) => {
        setData(results.data);
        const norm = normalizeData(results.data);
        setNormData(norm);
        // Generate SQL with Drizzle (simplified string here)
        setSql(generateSQL(norm['3nf']));
      }
    });
  };

  // Handle file upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        readString(evt.target?.result as string, {
          header: true,
          complete: (results) => {
            setData(results.data);
            const norm = normalizeData(results.data);
            setNormData(norm);
            setSql(generateSQL(norm['3nf']));
          }
        });
      };
      reader.readAsText(file);
    }
  };

  // Toggle SQL display
  const toggleSQL = () => {
    if (sql) {
      setSql('');
    } else if (normData) {
      setSql(generateSQL(normData['3nf']));
    }
  };

  // GSAP animations for main sections
  const stageRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sqlRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    // Initial page entrance
    gsap.fromTo(stageRef.current, 
      { opacity: 0, y: 50 }, 
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
    );
  }, { scope: stageRef });

  useGSAP(() => {
    if (normData) {
      // Animate canvas on stage change with stagger for buttons
      gsap.fromTo(canvasRef.current?.children || [], 
        { opacity: 0, scale: 0.9 }, 
        { 
          opacity: 1, 
          scale: 1, 
          duration: 0.5, 
          stagger: 0.1, // Mimics AnimatePresence mode="wait"
          ease: 'back.out(1.7)' 
        }
      );
    }
  }, { dependencies: [stage, normData] });

  useGSAP(() => {
    if (stage === 5) {
      // Summary view entrance
      gsap.fromTo(summaryRef.current, 
        { opacity: 0, x: 50 }, 
        { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' }
      );
    }
  }, { dependencies: [stage] });

  useGSAP(() => {
    if (sql) {
      // SQL reveal
      gsap.fromTo(sqlRef.current, 
        { opacity: 0, height: 0 }, 
        { opacity: 1, height: 'auto', duration: 0.5, ease: 'power2.out' }
      );
    }
  }, { dependencies: [sql] });

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">NormalDB: The Living Schema</h1>
        <p className="text-gray-600">Watch a database evolve from chaos to clarity</p>
      </header>

      <div className="flex justify-center mb-8">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept=".csv"
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()} className="mr-4">
          Upload CSV
        </Button>
        <Button onClick={loadSample}>Load Sample TV Dataset</Button>
      </div>

      {/* Main stage content */}
      <div ref={stageRef}>
        {stage === 0 ? (
          <div className="text-center p-8">
            <p className="text-lg mb-4">A chaotic ER diagram awaits normalization.</p>
            <Button onClick={() => setStage(1)}>Start Normalization</Button>
          </div>
        ) : stage === 5 && normData ? (
          <div ref={summaryRef} className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">UNF vs 3NF</h2>
              {/* Side-by-side canvases */}
              <div className="grid grid-cols-2 gap-4">
                <ERCanvas schema={normData.unf} stage={1} small />
                <ERCanvas schema={normData['3nf']} stage={4} small />
              </div>
            </div>
            <div>
              <Button onClick={toggleSQL}>
                {sql ? 'Hide SQL Schema' : 'See SQL Schema'}
              </Button>
              {sql ? (
                <pre ref={sqlRef} className="mt-4 p-4 bg-gray-100 rounded overflow-auto font-mono text-sm whitespace-pre-wrap">
                  {sql}
                </pre>
              ) : null}
              {/* Export buttons - use html2canvas for PNG, d3 for SVG */}
              <div className="mt-4 space-x-2">
                <Button>Export ERD SVG</Button>
                <Button onClick={() => {
                  // Placeholder download SQL
                  const blob = new Blob([sql], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'schema.sql';
                  a.click();
                }}>Export Schema SQL</Button>
              </div>
            </div>
          </div>
        ) : normData ? (
          <div ref={canvasRef} className="flex flex-col items-center">
            <div className="mb-4">
              <span className="px-4 py-2 bg-blue-200 rounded-full text-sm font-mono">
                {stages[stage - 1]}
              </span>
            </div>
            <div className="w-full max-w-4xl h-[600px] border rounded-lg overflow-hidden bg-white">
              <ERCanvas schema={currentSchema} stage={stage} narration={currentNarration} />
            </div>
            <div className="flex justify-center mt-4 space-x-4">
              <Button onClick={() => setStage(Math.max(1, stage - 1))} disabled={stage === 1}>
                Back
              </Button>
              <Button onClick={() => setStage(Math.min(4, stage + 1))}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
        {stage < 5 && stage > 0 ? (
          <Button onClick={() => setStage(5)} className="mt-8 mx-auto block">
            View Summary
          </Button>
        ) : null}
      </div>
    </main>
  );
}

function getNarration(stage: number): string {
  const narrations = {
    1: 'UNF: A single chaotic entity with redundancies.',
    2: '1NF: Multi-valued attributes are splitting into atomic forms—watch them fall out!',
    3: '2NF: Partial dependencies highlighted and decomposed.',
    4: '3NF: Transitive dependencies eliminated for minimal redundancy.'
  };
  return narrations[stage as keyof typeof narrations] || '';
}
