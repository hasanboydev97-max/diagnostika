export default function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center bg-[#fdfdfd]">
      
      {/* 1. Vibrant Purple Blob */}
      <div 
        className="absolute w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full mix-blend-multiply filter blur-[120px] md:blur-[150px] opacity-70 animate-blob1"
        style={{ top: '-10%', left: '-10%', backgroundColor: '#c084fc' }}
      ></div>
      
      {/* 2. Bright Blue Blob */}
      <div 
        className="absolute w-[450px] md:w-[650px] h-[450px] md:h-[650px] rounded-full mix-blend-multiply filter blur-[120px] md:blur-[150px] opacity-70 animate-blob2" 
        style={{ top: '-5%', right: '-10%', backgroundColor: '#38bdf8' }}
      ></div>

      {/* 3. Soft Pink Blob */}
      <div 
        className="absolute w-[350px] md:w-[500px] h-[350px] md:h-[500px] rounded-full mix-blend-multiply filter blur-[100px] md:blur-[130px] opacity-70 animate-blob3" 
        style={{ bottom: '-20%', left: '20%', backgroundColor: '#f472b6' }}
      ></div>
      
      {/* 4. Indigo/Cyan Blob */}
      <div 
        className="absolute w-[300px] md:w-[450px] h-[300px] md:h-[450px] rounded-full mix-blend-multiply filter blur-[100px] md:blur-[130px] opacity-50 animate-blob1" 
        style={{ bottom: '-10%', right: '10%', animationDelay: '7s', backgroundColor: '#818cf8' }}
      ></div>
      
    </div>
  );
}
