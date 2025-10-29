"use client";

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as flubber from 'flubber';
import { gsap } from 'gsap';
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
    4: '3NF: Transitive dependencies eliminated for minimal redundancy.'
  };
  return narrations[stage as keyof typeof narrations] || '';
};

export default function ERCanvas({ 
  schema, 
  stage, 
  small = false, 
  narration 
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = small ? 300 : 800;
  const height = small ? 200 : 600;
  const displayNarration = narration || getNarration(stage);

  useEffect(() => {
    if (!schema || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Entities as nodes with initial positions
    const entities: Entity[] = schema.Nodes.map((e, i) => ({
      ...e,
      id: i,
      x: (i * 150) % (width - 50), // Better initial layout
      y: Math.floor(i / 6) * 100 + 50
    }));

    // Force simulation for organic layout
    const nodes: { id: number; x: number; y: number }[] = entities.map(e => ({
      id: e.id,
      x: e.x,
      y: e.y
    }));

    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(120))
      .on('tick', () => {
        nodeGroups.attr('transform', d => `translate(${d.x - 60}, ${d.y})`);
        edgePaths.attr('d', d => {
          const s = nodes[d.source];
          const t = nodes[d.target];
          return `M${s.x - 60},${s.y} L${t.x - 60},${t.y}`;
        });
      });

    // Edges (heuristic for FK links)
    const links: { source: number; target: number; path: string }[] = [];
    entities.forEach((e1, i) => {
      e1.attributes.forEach(attr => {
        if (attr.includes('FK')) {
          const targetIndex = entities.findIndex(e => e.name === 'TVSHOW'); // Main entity
          if (targetIndex !== -1 && i !== targetIndex) {
            const s = nodes[i];
            const t = nodes[targetIndex];
            links.push({
              source: i,
              target: targetIndex,
              path: `M${s.x - 60},${s.y} L${t.x - 60},${t.y}`
            });
          }
        }
      });
    });

    // Previous paths for morphing (simulate with initial straight lines)
    const prevPaths = links.map(() => `M${width / 2},${height / 2} L${width / 2 + 50},${height / 2 + 50}`); // Dummy for first render

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
      .attrTween('d', function (d, i) {
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
      .attr('fill', stage >= 4 ? '#dbeafe' : stage === 2 ? '#fef3c7' : '#fee2e2')
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
        const isRedundant = (stage === 2) ? d.attributes.some((a: string) => a.includes(',') || a.includes('rating')) : false;
        return d.attributes.map((attr: string, idx: number) => ({ attr, idx, isRedundant }));
      })
      .enter()
      .append('text')
      .classed('attr', true)
      .classed('redundant', (d: any) => d.isRedundant) // Triggers CSS pulse
      .attr('y', (d: any, i: number) => 20 + d.idx * 15)
      .attr('x', 5)
      .text((d: any) => d.attr)
      .style('font-size', '10px')
      .style('fill', (d: any) => d.isRedundant ? '#ef4444' : 'black')
      .transition()
      .duration(1200)
      .delay((d: any, i: number) => i * 100) // Staggered fall
      .attr('y', (d: any) => 20 + d.idx * 15)
      .attr('transform', stage === 2 ? 'translate(0, 50)' : 'translate(0, 0)') // y-translation for fall-out
      .style('fill', 'black')
      .on('end', function () {
        d3.select(this).classed('redundant', false); // Stop pulse after
      });

    // Exit old attrs for morph continuity
    svg.selectAll('text.attr').exit()
      .transition()
      .duration(500)
      .attr('y', height)
      .style('opacity', 0)
      .remove();

    // Update prevPaths for next morph
    links.forEach((link, i) => { prevPaths[i] = link.path; });

    // GSAP for overall SVG entrance and node hover effects
    if (svgRef.current) {
      gsap.fromTo(svgRef.current, 
        { opacity: 0, scale: 0.9 }, 
        { 
          opacity: 1, 
          scale: 1, 
          duration: 0.8, 
          ease: 'back.out(1.7)' 
        }
      );

      // Animate nodes and edges on stage change
      gsap.fromTo([nodeGroups.nodes(), edgePaths.nodes()], 
        { opacity: 0, scale: 0 }, 
        { 
          opacity: 1, 
          scale: 1, 
          duration: 0.6, 
          stagger: 0.05, 
          ease: 'power2.out' 
        }
      );

      // Hover scaling for entities (stage-specific flash)
      nodeGroups.on('mouseenter', function () {
        gsap.to(this, { scale: 1.1, duration: 0.2, ease: 'power2.out' });
      }).on('mouseleave', function () {
        gsap.to(this, { scale: 1, duration: 0.2, ease: 'power2.out' });
      });

      // Redundancy pulse timeline (for stage 2+)
      if (stage >= 2) {
        const tl = gsap.timeline({ repeat: 1, yoyo: true });
        tl.to(attrTexts.filter('.redundant').nodes(), { 
          scale: 1.2, 
          fill: '#ef4444', 
          duration: 0.5, 
          stagger: 0.1 
        });
      }
    }

    return () => {
      simulation.stop();
      gsap.killTweensOf([svgRef.current, nodeGroups.nodes(), attrTexts.nodes()]);
    };
  }, [schema, stage]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded shadow-lg"
      >
        {/* SVG content rendered by D3 */}
      </svg>

      {/* Dynamic Narration Bubble */}
      {displayNarration ? (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <div className="bg-white p-3 rounded-lg shadow-md border border-blue-200 max-w-xs text-center">
            <p className="text-xs text-gray-700 font-mono">
              {displayNarration}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
