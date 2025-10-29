'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { parse } from 'papaparse';

interface ControlsProps {
  onLoadSample: () => void;
  onUpload: (rows: Record<string, any>[], name: string) => void;
  onNext: () => void;
  onBack: () => void;
  onViewSQL: () => void;
  currentStage: 'unf' | '1nf' | '2nf' | '3nf';
}

export default function Controls({ onLoadSample, onUpload, onNext, onBack, onViewSQL, currentStage }: ControlsProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { data } = parse(text, { header: true, skipEmptyLines: true });
        onUpload(data as Record<string, any>[], file.name.replace('.csv', ''));
      };
      reader.readAsText(file);
    }
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex gap-4 p-4 bg-gray-100 rounded-lg"
    >
      <button onClick={onLoadSample} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Load TV Dataset
      </button>
      <input type="file" accept=".csv" onChange={handleFileChange} className="p-2" />
      <button onClick={handleUpload} disabled={!file} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
        Upload CSV
      </button>
      <button onClick={onBack} disabled={currentStage === 'unf'} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50">
        Back
      </button>
      <button onClick={onNext} disabled={currentStage === '3nf'} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50">
        Next
      </button>
      <button onClick={onViewSQL} className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
        View SQL
      </button>
    </motion.div>
  );
}
