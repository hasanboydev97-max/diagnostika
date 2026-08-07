export default function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center bg-[#fdfdfd]">
      
      {/* 1. Purple Blob - Top Left */}
      <div 
        className="absolute w-[350px] md:w-[500px] h-[350px] md:h-[500px] rounded-full mix-blend-multiply filter blur-[100px] md:blur-[130px] opacity-50 animate-blob"
        style={{ top: '0%', left: '10%', backgroundColor: '#d8b4fe' }}
      ></div>
      
      {/* 2. Blue Blob - Top Right */}
      <div 
        className="absolute w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full mix-blend-multiply filter blur-[120px] md:blur-[150px] opacity-50 animate-blob" 
        style={{ top: '5%', right: '5%', animationDelay: '3s', backgroundColor: '#bae6fd' }}
      ></div>

      {/* 3. Soft Pink/Purple - Bottom Center */}
      <div 
        className="absolute w-[300px] md:w-[450px] h-[300px] md:h-[450px] rounded-full mix-blend-multiply filter blur-[90px] md:blur-[120px] opacity-50 animate-blob" 
        style={{ bottom: '-10%', left: '30%', animationDelay: '6s', backgroundColor: '#e9d5ff' }}
      ></div>
      
    </div>
  );
}
