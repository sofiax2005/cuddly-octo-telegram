'use client';

import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import type { Table, NormalizationResult } from '@/lib/algorithms/engine';

interface ERCanvasProps {
  result: NormalizationResult | null;
  stage: 'unf' | '1nf' | '2nf' | '3nf';
}

interface Node {
  id: string;
  name: string;
  columns: string[];
  x: number;
  y: number;
}

interface Edge {
  source: string;
  target: string;
}

export default function ERCanvas({ result, stage }: ERCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!result || !svgRef.current) {
      console.log('No result or SVG ref:', result);
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tables = result[stage].tables;
    if (!tables || tables.length === 0) {
      console.log(`No tables for stage ${stage}:`, result);
      return;
    }

    console.log('Rendering tables:', tables);

    // Create nodes
    const nodes: Node[] = tables.map((t, i) => ({
      id: t.name,
      name: t.name,
      columns: t.columns,
      x: 200 + (i % 3) * 300,
      y: 100 + Math.floor(i / 3) * 200
    }));

    // Create edges based on candidate keys
    const edges: Edge[] = [];
    const candidateKeys = result.candidateKeys || [];
    tables.forEach(t => {
      const key = candidateKeys.find(k => k.every(c => t.columns.includes(c)));
      if (key) {
        tables.forEach(t2 => {
          if (t !== t2 && key.every(c => t2.columns.includes(c))) {
            edges.push({ source: t.name, target: t2.name });
          }
        });
      }
    });

    // D3 force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d: any) => d.id).distance(200))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .stop();

    for (let i = 0; i < 300; i++) simulation.tick();

    // Draw edges
    svg.selectAll('.edge')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'edge')
      .attr('x1', d => nodes.find(n => n.id === d.source)!.x)
      .attr('y1', d => nodes.find(n => n.id === d.source)!.y)
      .attr('x2', d => nodes.find(n => n.id === d.target)!.x)
      .attr('y2', d => nodes.find(n => n.id === d.target)!.y)
      .attr('stroke', '#999')
      .attr('stroke-width', 2);

    // Draw nodes
    const nodeGroups = svg.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodeGroups.append('rect')
      .attr('width', 200)
      .attr('height', d => 40 + d.columns.length * 30)
      .attr('x', -100)
      .attr('y', -20)
      .attr('fill', '#f0f0f0')
      .attr('stroke', '#333')
      .attr('rx', 10);

    nodeGroups.append('text')
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .text(d => d.name)
      .attr('font-weight', 'bold');

    nodeGroups.each(function(d) {
      const group = d3.select(this);
      d.columns.forEach((col, i) => {
        group.append('text')
          .attr('y', 20 + i * 30)
          .attr('x', -90)
          .attr('font-size', '12px')
          .text(col);
      });
    });

    // Update dimensions on resize
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth - 40,
        height: window.innerHeight - 100
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [result, stage, dimensions]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height: '100vh' }} // Ensure full height
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ border: '1px solid #ccc' }}
      />
    </motion.div>
  );
}
