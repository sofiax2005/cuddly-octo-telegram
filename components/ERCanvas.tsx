'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from '@framer-motion';
import type { Schema, Entity } from '@/lib/types';

interface Props {
  schema?: Schema;
  stage: number;
  small?: boolean;
}

export default function ERCanvas({ schema, stage, small = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = small ? 300 : 800;
  const height = small ? 200 : 600;

  useEffect(() => {
    if (!schema || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { entities } = schema;

    // Nodes: entities
    const nodes: (Entity & { id: number; x: number; y: number })[] = entities.map((e, i) => ({ 
      ...e, 
      id: i, 
      x: Math.random() * width, 
      y: Math.random() * height 
    }));

    // Simulation for layout
    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(100))
      .on('tick', () => {
        // Update positions with motion values for Framer
      });

    // Edges: simple, based on FK names (heuristic: if attr includes 'FK')
    const links: { source: number, target: number }[] = [];
    entities.forEach((e1, i) => {
      e1.attributes.forEach(attr => {
        if (attr.includes('FK') && attr.includes('show_id')) {
          // Link to SHOW
          links.push({ source: i, target: 0 }); // Assume index 0 is main
        }
      });
    });

    // Draw nodes
    const nodeGroups = svg.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .classed('node', true)
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    nodeGroups.append('rect')
      .attr('width', 120)
      .attr('height', 20 + d.attributes.length * 15)
      .attr('rx', 5)
      .attr('fill', stage > 1 ? '#dbeafe' : '#fef3c7') // Color by stage
      .attr('stroke', d => d.attributes.some(a => a.includes('redundant')) ? 'red' : 'blue');

    nodeGroups.append('text')
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .text(d => d.name);

    // Attributes as text
    nodeGroups.selectAll('text.attr')
      .data(d => d.attributes)
      .enter()
      .append('text')
      .classed('attr', true)
      .attr('y', (d, i) => 20 + i * 15)
      .attr('x', 5)
      .text(d => d)
      .style('font-size', '10px');

    // Edges
    const edgePaths = svg.selectAll('path.edge')
      .data(links)
      .enter()
      .append('path')
      .classed('edge', true)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('d', d => {
        const s = nodes[d.source], t = nodes[d.target];
        return `M${s.x + 60},${s.y} L${t.x + 60},${t.y}`;
      });

    // Morphing: Use Framer for transitions
    nodeGroups.transition()
      .duration(1000)
      .attrTween('transform', function(d) {
        const i = d3.interpolate(this.__currentX || d.x, d.x);
        const j = d3.interpolate(this.__currentY || d.y, d.y);
        this.__currentX = i(1);
        this.__currentY = j(1);
        return (t: number) => `translate(${i(t)}, ${j(t)})`;
      });

    // For Framer Motion integration: wrap in motion.g, animate layout
  }, [schema, stage]);

  return (
    <motion.svg
      ref={svgRef}
      width={width}
      height={height}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
  );
}
