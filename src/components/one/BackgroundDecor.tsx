import React from 'react';
import { 
  Network,
  Cpu,
  Sparkles,
  Bot,
  Brain,
  CircuitBoard,
  Binary,
  Wifi,
  Globe,
  Share2,
  Workflow,
  Radio,
  Boxes,
  Zap,
  Activity,
  GitCommit,
  Layers
} from 'lucide-react';

export const BackgroundDecor: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Subtle Blurry Background Watermark Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://i.ibb.co/kV5cgsbp/c-y-k-c.jpg" 
          alt="Website Blurry Background" 
          className="w-full h-full object-cover opacity-[0.14] blur-[10px] scale-105"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Soft Ambient Color Gradients */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-brand-royal/12 to-blue-400/5 blur-[130px] animate-pulse duration-[10000ms]" />
      <div className="absolute top-[35%] right-[-10%] w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-brand-red/8 to-indigo-500/5 blur-[150px]" />
      <div className="absolute bottom-[5%] left-[15%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-brand-royal/10 to-cyan-500/5 blur-[140px]" />

      {/* Modern Digital Dot Grid & Neural Network Matrix Watermark */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#005A9C 1.5px, transparent 1.5px), radial-gradient(#3b82f6 1px, transparent 1px)`,
          backgroundSize: '40px 40px, 80px 80px',
          backgroundPosition: '0 0, 20px 20px'
        }}
      />

      {/* Scattered AI & Network Connection Icons (Subtle & Elegant) */}
      <div className="absolute inset-0 w-full h-full text-brand-royal opacity-[0.045] sm:opacity-[0.06]">
        
        {/* Top Region - AI & Brain */}
        <Brain className="absolute top-[8%] left-[8%] w-24 h-24 -rotate-12 blur-[1px] text-brand-royal" />
        <Network className="absolute top-[12%] right-[10%] w-28 h-28 rotate-12 text-brand-red blur-[1px]" />
        <Sparkles className="absolute top-[20%] left-[25%] w-16 h-16 rotate-45 text-amber-500 blur-[0.5px] animate-pulse" />
        <CircuitBoard className="absolute top-[15%] right-[28%] w-20 h-20 -rotate-6 blur-[1px]" />
        
        {/* Middle Region - Connectivity & Nodes */}
        <Globe className="absolute top-[32%] left-[5%] w-36 h-36 -rotate-12 blur-[1.5px]" />
        <Bot className="absolute top-[35%] right-[6%] w-24 h-24 rotate-12 text-brand-royal blur-[1px]" />
        <Workflow className="absolute top-[45%] left-[28%] w-22 h-22 rotate-6 text-brand-red blur-[1px]" />
        <Share2 className="absolute top-[40%] right-[30%] w-20 h-20 -rotate-12 blur-[1px]" />
        <Binary className="absolute top-[50%] right-[15%] w-24 h-24 rotate-12 text-brand-royal blur-[1px]" />

        {/* Lower Middle Region - Neural Paths & AI Core */}
        <Boxes className="absolute top-[58%] left-[8%] w-24 h-24 rotate-12 blur-[1px]" />
        <Cpu className="absolute top-[62%] right-[8%] w-32 h-32 -rotate-12 text-brand-royal blur-[1.5px]" />
        <Radio className="absolute top-[68%] left-[25%] w-18 h-18 -rotate-45 text-brand-red blur-[1px]" />
        <Zap className="absolute top-[65%] right-[28%] w-20 h-20 rotate-12 text-amber-500 blur-[1px]" />
        <Activity className="absolute top-[75%] left-[15%] w-26 h-26 rotate-6 blur-[1px]" />

        {/* Bottom Region - Digital Ecosystem */}
        <GitCommit className="absolute top-[84%] right-[12%] w-28 h-28 -rotate-12 blur-[1px]" />
        <Wifi className="absolute top-[82%] left-[32%] w-20 h-20 rotate-12 blur-[0.5px]" />
        <Layers className="absolute top-[90%] right-[30%] w-22 h-22 -rotate-6 text-brand-red blur-[1px]" />
        <Network className="absolute top-[92%] left-[8%] w-24 h-24 rotate-45 blur-[1px]" />

      </div>

      {/* SVG Connecting Nodes & Neural Links Simulation */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ai-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#005A9C" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#E31B23" />
          </linearGradient>
        </defs>
        
        {/* Animated-look Network Paths */}
        <g stroke="url(#ai-line)" strokeWidth="1.5" fill="none">
          <path d="M 100 150 Q 300 100 500 250 T 900 200" strokeDasharray="8 8" />
          <path d="M 200 600 Q 600 700 800 450 T 1200 650" strokeDasharray="6 6" />
          <path d="M 50 850 Q 450 800 750 950" />
        </g>

        {/* Connection Glowing Nodes */}
        <g fill="#005A9C">
          <circle cx="100" cy="150" r="4" />
          <circle cx="500" cy="250" r="5" fill="#E31B23" />
          <circle cx="900" cy="200" r="4" />
          <circle cx="200" cy="600" r="4" />
          <circle cx="800" cy="450" r="5" fill="#3b82f6" />
          <circle cx="1200" cy="650" r="4" fill="#E31B23" />
        </g>
      </svg>
    </div>
  );
};
