'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from '@framer-motion';
import * as flubber from 'flubber';
import type { Schema, Entity } from '@/lib/types';

interface Props {
  schema?: Schema;
  stage: number;
  small?: boolean;
  narration?: string; // Dynamic narration text
}

const getNarration = (stage: number): string => {
  const narrations = {
    1: 'UNF: A single chaotic entity with redundancies.',
    2: '1NF: Multi-valued attributes are splitting into atomic forms—watch them fall out!',
    3: '2NF: Partial dependencies highlighted and decomposed.',
    4: '3NF: Transitive dependencies eliminated for minimal redundancy.',
  };
  return narrations[stage] || '';
};

export default function ERCanvas({ schema, stage, small = false, narration }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = small ? 300 : 800;
  const height = small ? 200 : 600;
  const displayNarration = narration || getNarration(stage);

  useEffect(() => {
    if (!schema || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { entities } = schema;

    // Nodes: entities with initial positions
    const nodes: (Entity & { id: number; x: number; y: number })[] = entities.map((e, i) => ({ 
      ...e, 
      id: i, 
      x: (i * 150) % width + 50, // Better initial layout
      y: Math.floor(i / 6) * 100 + 50,
    }));

    // Force simulation for organic layout
    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(120))
      .on('tick', () => {
        nodeGroups.attr('transform', d => `translate(${d.x - 60}, ${d.y})`);
        edgePaths.attr('d', d => {
          const s = nodes[d.source], t = nodes[d.target];
          return `M${s.x},${s.y} L${t.x},${t.y}`;
        });
      });

    // Edges: heuristic for FK links
    const links: { source: number, target: number; path: string }[] = [];
    entities.forEach((e1, i) => {
      e1.attributes.forEach(attr => {
        if (attr.includes('FK')) {
          const targetIndex = entities.findIndex(e => e.name === 'TV_SHOW'); // Main entity
          if (targetIndex !== -1 && i !== targetIndex) {
            const s = nodes[i], t = nodes[targetIndex];
            links.push({ 
              source: i, 
              target: targetIndex, 
              path: `M${s.x + 60},${s.y} L${t.x + 60},${t.y}` 
            });
          }
        }
      });
    });

    // Previous paths for morphing (simulate with initial straight lines)
    const prevPaths = links.map(() => `M${width/2},${height/2} L${width/2 + 50},${height/2 + 50}`); // Dummy for first render

    // Draw edges with Flubber morphing
    const edgePaths = svg.selectAll('path.edge')
      .data(links)
      .enter()
      .append('path')
      .classed('edge', true)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .transition()
      .duration(1500)
      .attrTween('d', function(d, i) {
        const interpolator = flubber.interpolate(prevPaths[i] || prevPaths[0], d.path, { maxSegmentLength: 10 });
        return (t: number) => interpolator(t);
      });

    // Draw nodes
    const nodeGroups = svg.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .classed('node', true)
      .attr('transform', d => `translate(${d.x - 60}, ${d.y})`);

    nodeGroups.append('rect')
      .attr('width', 120)
      .attr('height', d => 20 + d.attributes.length * 15)
      .attr('rx', 5)
      .attr('fill', stage >= 4 ? '#dbeafe' : stage >= 2 ? '#fef3c7' : '#fee2e2')
      .attr('stroke', 'blue')
      .transition()
      .duration(800)
      .attr('fill', '#dbeafe');

    nodeGroups.append('text')
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
      .text(d => d.name);

    // Attributes with fall-out animation and redundancy flash
    const attrTexts = nodeGroups.selectAll('text.attr')
      .data((d: any) => {
        // Mark redundants based on stage (e.g., multis in UNF/1NF)
        const isRedundant = stage <= 2 && d.attributes.some(a => a.includes(',') || a === 'rating');
        return d.attributes.map((attr: string, idx: number) => ({ attr, idx, isRedundant }));
      })
      .enter()
      .append('text')
      .classed('attr', true)
      .classed('redundant', d => d.isRedundant) // Triggers CSS pulse
      .attr('y', (d, i) => {
        // Fall-out: Start at y=0, translate down for new/exiting
        if (stage === 2) return 0; // Initial for animation
        return 20 + d.idx * 15;
      })
      .attr('x', 5)
      .text(d => d.attr)
      .style('font-size', '10px')
      .style('fill', d => d.isRedundant ? '#ef4444' : 'black')
      .transition()
      .duration(1200)
      .delay((d, i) => i * 100) // Staggered fall
      .attr('y', (d) => 20 + d.idx * 15)
      .attr('transform', stage === 2 ? 'translate(0, 50)' : 'translate(0, 0)') // y-translation for fall-out
      .style('fill', 'black')
      .on('end', function() {
        d3.select(this).classed('redundant', false); // Stop pulse after
      });

    // Exit old attrs (for morph continuity)
    svg.selectAll('text.attr.exit')
      .transition()
      .duration(500)
      .attr('y', height)
      .style('opacity', 0)
      .remove();

    // Update prevPaths for next morph
    links.forEach((link, i) => prevPaths[i] = link.path);

  }, [schema, stage]);

  return (
    <div className="relative">
      <motion.svg
        ref={svgRef}
        width={width}
        height={height}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="border rounded shadow-lg"
      />
      {/* Dynamic Narration Bubble */}
      {displayNarration && (
        <motion.div
          className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-lg shadow-md border border-blue-200 max-w-xs text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <p className="text-xs text-gray-700 font-mono">{displayNarration}</p>
        </motion.div>
      )}
    </div>
  );
}
