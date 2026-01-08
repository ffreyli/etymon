import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { EtymologyGraph, GraphNode } from '../types';
import { GRAPH_NODE_COLORS } from '../constants';
import { ZoomIn, ZoomOut, Target } from 'lucide-react';

interface GraphViewProps {
  data: EtymologyGraph;
  onNodeClick: (node: GraphNode) => void;
  selectedNodeId?: string;
}

// Extend d3 types for simulation
interface SimulationNode extends d3.SimulationNodeDatum, GraphNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  type: string;
}

export const GraphView: React.FC<GraphViewProps> = ({ data, onNodeClick, selectedNodeId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Initialize graph
  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: 100%; font-family: 'EB Garamond', serif;");

    // Add shadow filter (softer than glow)
    const defs = svg.append("defs");
    
    const filter = defs.append("filter")
      .attr("id", "shadow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    filter.append("feDropShadow")
      .attr("dx", "1")
      .attr("dy", "1")
      .attr("stdDeviation", "2")
      .attr("flood-color", "#a8a29e")
      .attr("flood-opacity", "0.3");

    // Arrow markers
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22) // Position based on node radius
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#a8a29e"); // Stone 400

    const g = svg.append("g");

    // Deep Copy data to avoid mutation issues in React strict mode
    const nodes: SimulationNode[] = data.nodes.map(d => ({ ...d }));
    const links: SimulationLink[] = data.links.map(d => ({ ...d }));

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Force Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink<SimulationNode, SimulationLink>(links).id(d => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(45));

    simulationRef.current = simulation;

    // Render Links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#d6d3d1") // Stone 300
      .attr("stroke-opacity", 1)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)")
      .attr("stroke-dasharray", d => d.type === 'borrowed' ? "4,4" : "none");

    // Render Nodes Groups
    const nodeGroup = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, SimulationNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node Circles
    nodeGroup.append("circle")
      .attr("r", d => d.type === 'root' ? 14 : d.type === 'current' ? 12 : 8)
      .attr("fill", d => GRAPH_NODE_COLORS[d.type] || '#cbd5e1')
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", "url(#shadow)")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    // Node Labels
    nodeGroup.append("text")
      .text(d => d.label)
      .attr("x", 16)
      .attr("y", 5)
      .attr("fill", "#44403c") // Stone 700
      .attr("font-size", d => d.type === 'current' ? "18px" : "12px")
      .attr("font-weight", d => d.type === 'current' ? "bold" : "500")
      .attr("pointer-events", "none")
      .style("paint-order", "stroke")
      .style("stroke", "#f5f5f4")
      .style("stroke-width", "3px");
      
    // Node Language Labels
    nodeGroup.append("text")
      .text(d => d.language)
      .attr("x", 16)
      .attr("y", 18)
      .attr("fill", "#78716c") // Stone 500
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .style("font-style", "italic");

    // Node Era Labels (New)
    nodeGroup.append("text")
      .text(d => d.era ? d.era : '')
      .attr("x", 16)
      .attr("y", 28)
      .attr("fill", "#a8a29e") // Stone 400
      .attr("font-size", "9px")
      .attr("pointer-events", "none")
      .style("font-family", "sans-serif")
      .style("font-weight", "500")
      .style("letter-spacing", "0.05em");

    // Simulation Tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as SimulationNode).x!)
        .attr("y1", d => (d.source as SimulationNode).y!)
        .attr("x2", d => (d.target as SimulationNode).x!)
        .attr("y2", d => (d.target as SimulationNode).y!);

      nodeGroup
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: SimulationNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: SimulationNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: SimulationNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]); // Re-run if data changes

  // Handle Selection Highlight effect
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    // Reset function to restore default state
    const reset = () => {
        svg.selectAll("circle").attr("opacity", 1).attr("stroke", "#fff").attr("stroke-width", 2);
        svg.selectAll("line").attr("opacity", 1);
        svg.selectAll("text").attr("opacity", 1).attr("font-weight", (d: any) => d.type === 'current' ? "bold" : "500");
    };

    if (!selectedNodeId) {
        reset();
        return;
    }
    
    // Dim all
    svg.selectAll("circle").attr("opacity", 0.3);
    svg.selectAll("line").attr("opacity", 0.1);
    svg.selectAll("text").attr("opacity", 0.3);

    // Highlight selected
    const selectedGroup = svg.selectAll("g").filter((d: any) => d && d.id === selectedNodeId);
    
    selectedGroup.select("circle")
      .attr("opacity", 1)
      .attr("stroke", "#44403c")
      .attr("stroke-width", 3);
      
    selectedGroup.selectAll("text")
      .attr("opacity", 1)
      .attr("font-weight", "bold");

  }, [selectedNodeId, data]);

  const handleZoomIn = () => {
      if(svgRef.current) {
         d3.select(svgRef.current).transition().call(d3.zoom().scaleBy as any, 1.2);
      }
  }

  const handleZoomOut = () => {
      if(svgRef.current) {
         d3.select(svgRef.current).transition().call(d3.zoom().scaleBy as any, 0.8);
      }
  }

  const handleCenter = () => {
      if(svgRef.current && containerRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          d3.select(svgRef.current).transition().duration(750).call(
             d3.zoom().transform as any, 
             d3.zoomIdentity.translate(width/2, height/2).scale(1)
          );
      }
  }

  return (
    <div className="relative w-full h-full bg-[#f5f5f4] overflow-hidden" ref={containerRef}>
      {/* Background Grid - changed to dots for paper look */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
            backgroundImage: 'radial-gradient(#78716c 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
        }} 
      />
      
      <svg ref={svgRef} className="w-full h-full cursor-move touch-none"></svg>

      {/* Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
         <button onClick={handleZoomIn} className="p-2 bg-white hover:bg-stone-100 text-stone-700 rounded-lg shadow-md border border-stone-200">
             <ZoomIn size={20} />
         </button>
         <button onClick={handleZoomOut} className="p-2 bg-white hover:bg-stone-100 text-stone-700 rounded-lg shadow-md border border-stone-200">
             <ZoomOut size={20} />
         </button>
         <button onClick={handleCenter} className="p-2 bg-white hover:bg-stone-100 text-stone-900 rounded-lg shadow-md border border-stone-200" title="Reset View">
             <Target size={20} />
         </button>
      </div>

      <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm p-4 rounded-lg border border-stone-200 shadow-sm pointer-events-none">
         <h4 className="text-xs font-bold text-stone-500 mb-3 uppercase tracking-wider font-sans">Legend</h4>
         <div className="space-y-2">
             {Object.entries(GRAPH_NODE_COLORS).map(([key, color]) => (
                 <div key={key} className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full border border-stone-300" style={{backgroundColor: color}}></span>
                     <span className="text-sm text-stone-600 capitalize font-serif italic">{key}</span>
                 </div>
             ))}
         </div>
      </div>
    </div>
  );
};