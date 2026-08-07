// No React imports needed

export const palettes = [
  { name: 'Peach', colors: ['#ff9a9e', '#fecfef', '#f6d365', '#fda085'] },
  { name: 'Ocean', colors: ['#c084fc', '#38bdf8', '#818cf8', '#34d399'] },
  { name: 'Vibrant', colors: ['#f43f5e', '#facc15', '#fb923c', '#c084fc'] },
  { name: 'Berry', colors: ['#818cf8', '#c084fc', '#f472b6', '#38bdf8'] },
  { name: 'Mint', colors: ['#34d399', '#2dd4bf', '#a7f3d0', '#60a5fa'] },
  { name: 'Sunset', colors: ['#fbbf24', '#f43f5e', '#f472b6', '#fb923c'] },
  { name: 'Pastel', colors: ['#a78bfa', '#fbcfe8', '#bfdbfe', '#a7f3d0'] }
];

export default function MeshGradient({ 
  paletteIndex = 0, 
  isMinimal = false 
}: { 
  paletteIndex?: number, 
  isMinimal?: boolean 
}) {
  const colors = palettes[paletteIndex]?.colors || palettes[0].colors;

  if (isMinimal) {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#fafafa]">
        {/* Very subtle noise for minimal theme */}
        <div 
          className="absolute inset-0 z-10 opacity-[0.03] mix-blend-overlay pointer-events-none" 
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        ></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center bg-[#fdfdfd] transition-colors duration-1000">
      
      {/* NOISE OVERLAY */}
      <div 
        className="absolute inset-0 z-10 opacity-[0.15] mix-blend-overlay pointer-events-none" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      ></div>

      {/* 1. Blob 1 */}
      <div 
        className="absolute w-[400px] md:w-[700px] h-[400px] md:h-[700px] mix-blend-multiply opacity-70 animate-blob1 transition-colors duration-1000 ease-in-out"
        style={{ top: '-10%', left: '-10%', background: `radial-gradient(circle, ${colors[0]} 0%, transparent 60%)` }}
      ></div>
      
      {/* 2. Blob 2 */}
      <div 
        className="absolute w-[450px] md:w-[750px] h-[450px] md:h-[750px] mix-blend-multiply opacity-70 animate-blob2 transition-colors duration-1000 ease-in-out" 
        style={{ top: '-5%', right: '-10%', background: `radial-gradient(circle, ${colors[1]} 0%, transparent 60%)` }}
      ></div>

      {/* 3. Blob 3 */}
      <div 
        className="absolute w-[350px] md:w-[600px] h-[350px] md:h-[600px] mix-blend-multiply opacity-70 animate-blob3 transition-colors duration-1000 ease-in-out" 
        style={{ bottom: '-20%', left: '20%', background: `radial-gradient(circle, ${colors[2]} 0%, transparent 60%)` }}
      ></div>
      
      {/* 4. Blob 4 */}
      <div 
        className="absolute w-[300px] md:w-[500px] h-[300px] md:h-[500px] mix-blend-multiply opacity-60 animate-blob1 transition-colors duration-1000 ease-in-out" 
        style={{ bottom: '-10%', right: '10%', animationDelay: '5s', background: `radial-gradient(circle, ${colors[3]} 0%, transparent 60%)` }}
      ></div>
      
    </div>
  );
}
