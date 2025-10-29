'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from '@framer-motion';
import ERCanvas from '@/components/ERCanvas';
import { usePapaParse } from 'react-papaparse';
import { normalizeData } from '@/lib/normalize';
import { Button } from '@/components/ui/button'; // Assume shadcn or simple Tailwind button

export default function Home() {
  const [stage, setStage] = useState(0); // 0: start, 1: UNF, 2:1NF, 3:2NF, 4:3NF, 5:summary
  const [data, setData] = useState<any[]>([]);
  const [normData, setNormData] = useState(null);
  const [sql, setSql] = useState('');
  const { readString } = usePapaParse();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSample = () => {
    fetch('/data/tv_dataset.csv')
      .then((res) => res.text())
      .then((csv) => {
        readString(csv, {
          header: true,
          complete: (results) => {
            setData(results.data);
            const norm = normalizeData(results.data);
            setNormData(norm);
            // Generate SQL with Drizzle (simplified string here)
            setSql(generateSQL(norm['3nf']));
          },
        });
      });
  };

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
          },
        });
      };
      reader.readAsText(file);
    }
  };

  const stages = ['UNF', '1NF', '2NF', '3NF'];
  const currentSchema = normData ? normData[stages[stage - 1] || 'unf'] : null;

  const generateSQL = (schema: any) => {
    // Simplified SQL gen; in prod, use Drizzle schema builder
    let sqlStr = '';
    schema.entities.forEach((entity: any) => {
      sqlStr += `CREATE TABLE ${entity.name} (\n`;
      entity.attributes.forEach((attr: string) => {
        sqlStr += `  ${attr},\n`;
      });
      sqlStr = sqlStr.slice(0, -2) + `\n);\n\n`;
    });
    return sqlStr;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">NormalDB: The Living Schema</h1>
        <p className="text-gray-600">Watch a database evolve from chaos to clarity</p>
      </header>

      <div className="flex justify-center mb-8">
        <input type="file" ref={fileInputRef} onChange={handleUpload} accept=".csv" className="hidden" />
        <Button onClick={() => fileInputRef.current?.click()} className="mr-4">Upload CSV</Button>
        <Button onClick={loadSample}>Load Sample TV Dataset</Button>
      </div>

      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-lg mb-4">A chaotic ER diagram awaits normalization.</p>
            <Button onClick={() => setStage(1)}>Start Normalization</Button>
          </motion.div>
        )}
        {stage > 0 && stage < 5 && (
          <motion.div key="canvas" className="flex flex-col items-center">
            <div className="mb-4">
              <span className="px-4 py-2 bg-blue-200 rounded-full text-sm font-mono">{stages[stage - 1]}</span>
            </div>
            <div className="w-full max-w-4xl h-[600px] border rounded-lg overflow-hidden bg-white">
              <ERCanvas schema={currentSchema} stage={stage} />
            </div>
            <div className="flex justify-center mt-4 space-x-4">
              <Button onClick={() => setStage(Math.max(1, stage - 1))} disabled={stage === 1}>Back</Button>
              <Button onClick={() => setStage(Math.min(4, stage + 1))}>Next</Button>
            </div>
          </motion.div>
        )}
        {stage === 5 && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid md:grid-cols-2 gap-8"
          >
            <div>
              <h2 className="text-2xl font-bold mb-4">UNF vs 3NF</h2>
              {/* Side-by-side canvases */}
              <div className="grid grid-cols-2 gap-4">
                <ERCanvas schema={normData?.unf} stage={1} small />
                <ERCanvas schema={normData?['3nf']} stage={4} small />
              </div>
            </div>
            <div>
              <Button onClick={() => setSql('')}>See SQL Schema</Button>
              {sql && (
                <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto font-mono text-sm">
                  {sql}
                </pre>
              )}
              {/* Export buttons: use html2canvas for PNG, d3 for SVG */}
              <div className="mt-4 space-x-2">
                <Button>Export ERD (SVG)</Button>
                <Button>Export Schema (SQL)</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {stage < 5 && stage > 0 && (
        <Button onClick={() => setStage(5)} className="mt-8 mx-auto block">View Summary</Button>
      )}

      {/* Narration bubble example */}
      <motion.div
        className="absolute top-20 right-10 bg-white p-4 rounded shadow-lg max-w-xs"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm text-gray-700">Multi-valued attributes like 'cast' are splitting into a new entity.</p>
      </motion.div>
    </main>
  );
}
