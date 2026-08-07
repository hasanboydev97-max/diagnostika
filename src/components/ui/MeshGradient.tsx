export default function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#fdfdfd]">
      <div 
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"
        style={{ backgroundColor: '#D8B4FE' }} // Purple 300
      ></div>
      <div 
        className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob" 
        style={{ animationDelay: '2s', backgroundColor: '#93C5FD' }} // Blue 300
      ></div>
      <div 
        className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob" 
        style={{ animationDelay: '4s', backgroundColor: '#E9D5FF' }} // Purple 200 (softer pinkish)
      ></div>
    </div>
  );
}
