'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ERCanvas from '@/components/ERCanvas';
import Controls from '@/components/Controls';
import type { NormalizationResult } from '@/lib/algorithms/engine';

export default function Home() {
  const [result, setResult] = useState<NormalizationResult | null>(null);
  const [stage, setStage] = useState<'unf' | '1nf' | '2nf' | '3nf'>('unf');
  const [sqlModal, setSqlModal] = useState(false);
  const [sqlContent, setSqlContent] = useState('');

  const loadSample = async () => {
    const res = await fetch('/api/normalize?sample=tv');
    const data = await res.json();
    setResult(data);
    setStage('unf');
  };

  const handleUpload = async (rows: Record<string, any>[], name: string) => {
    const res = await fetch('/api/normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, name })
    });
    const data = await res.json();
    setResult(data);
    setStage('unf');
  };

  const handleNext = () => {
    const stages: ('unf' | '1nf' | '2nf' | '3nf')[] = ['unf', '1nf', '2nf', '3nf'];
    const currentIndex = stages.indexOf(stage);
    if (currentIndex < stages.length - 1) {
      setStage(stages[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stages: ('unf' | '1nf' | '2nf' | '3nf')[] = ['unf', '1nf', '2nf', '3nf'];
    const currentIndex = stages.indexOf(stage);
    if (currentIndex > 0) {
      setStage(stages[currentIndex - 1]);
    }
  };

  const handleViewSQL = async () => {
    if (!result) return;
    const res = await fetch(`/api/normalize?sample=tv&format=sql&stage=${stage}`);
    const sql = await res.text();
    setSqlContent(sql);
    setSqlModal(true);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">NormalDB: ER to Normal Forms Visualization</h1>
      <Controls
        onLoadSample={loadSample}
        onUpload={handleUpload}
        onNext={handleNext}
        onBack={handleBack}
        onViewSQL={handleViewSQL}
        currentStage={stage}
      />
      <ERCanvas result={result} stage={stage} />
      {sqlModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
          <div className="bg-white p-6 rounded-lg max-w-2xl max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">SQL for {stage.toUpperCase()}</h2>
            <pre className="bg-gray-100 p-4 rounded">{sqlContent}</pre>
            <button
              onClick={() => setSqlModal(false)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
