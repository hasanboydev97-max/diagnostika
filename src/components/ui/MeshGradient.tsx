import { useEffect, useState } from 'react';

const palettes = [
  // 0 - Sunday (Peach/Pink/Orange)
  ['#ff9a9e', '#fecfef', '#f6d365', '#fda085'],
  // 1 - Monday (Deep Blue/Purple/Cyan)
  ['#c084fc', '#38bdf8', '#818cf8', '#34d399'],
  // 2 - Tuesday (Vibrant Peach/Red/Yellow like image 1)
  ['#f43f5e', '#facc15', '#fb923c', '#c084fc'],
  // 3 - Wednesday (Violet/Fuchsia/Pink like image 2)
  ['#818cf8', '#c084fc', '#f472b6', '#38bdf8'],
  // 4 - Thursday (Emerald/Teal/Mint)
  ['#34d399', '#2dd4bf', '#a7f3d0', '#60a5fa'],
  // 5 - Friday (Gold/Crimson/Pink)
  ['#fbbf24', '#f43f5e', '#f472b6', '#fb923c'],
  // 6 - Saturday (Soft Pastels)
  ['#a78bfa', '#fbcfe8', '#bfdbfe', '#a7f3d0']
];

export default function MeshGradient() {
  const [colors, setColors] = useState(palettes[0]);

  useEffect(() => {
    const day = new Date().getDay();
    setColors(palettes[day]);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center bg-[#fdfdfd]">
      
      {/* NOISE OVERLAY */}
      <div 
        className="absolute inset-0 z-10 opacity-[0.15] mix-blend-overlay pointer-events-none" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      ></div>

      {/* 1. Blob 1 */}
      <div 
        className="absolute w-[400px] md:w-[700px] h-[400px] md:h-[700px] mix-blend-multiply filter blur-[90px] md:blur-[120px] opacity-70 animate-blob1"
        style={{ top: '-10%', left: '-10%', backgroundColor: colors[0] }}
      ></div>
      
      {/* 2. Blob 2 */}
      <div 
        className="absolute w-[450px] md:w-[750px] h-[450px] md:h-[750px] mix-blend-multiply filter blur-[90px] md:blur-[120px] opacity-70 animate-blob2" 
        style={{ top: '-5%', right: '-10%', backgroundColor: colors[1] }}
      ></div>

      {/* 3. Blob 3 */}
      <div 
        className="absolute w-[350px] md:w-[600px] h-[350px] md:h-[600px] mix-blend-multiply filter blur-[90px] md:blur-[120px] opacity-70 animate-blob3" 
        style={{ bottom: '-20%', left: '20%', backgroundColor: colors[2] }}
      ></div>
      
      {/* 4. Blob 4 */}
      <div 
        className="absolute w-[300px] md:w-[500px] h-[300px] md:h-[500px] mix-blend-multiply filter blur-[90px] md:blur-[120px] opacity-60 animate-blob1" 
        style={{ bottom: '-10%', right: '10%', animationDelay: '5s', backgroundColor: colors[3] }}
      ></div>
      
    </div>
  );
}
