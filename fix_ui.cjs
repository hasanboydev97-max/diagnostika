const fs = require('fs');

const filesToUpdate = [
  { path: 'src/pages/OnlineTests/CreateTest.tsx', from: /max-w-4xl/g, to: 'max-w-7xl' },
  { path: 'src/pages/OnlineTests/TestDetails.tsx', from: /max-w-6xl/g, to: 'max-w-7xl' },
  { path: 'src/pages/OnlineTests/LiveHost.tsx', from: /max-w-5xl/g, to: 'max-w-7xl' },
  { path: 'src/pages/OnlineTests/Dashboard.tsx', from: /max-w-5xl/g, to: 'max-w-7xl' }
];

filesToUpdate.forEach(({ path, from, to }) => {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(from, to);
    fs.writeFileSync(path, content, 'utf8');
    console.log(`Updated ${path}`);
  }
});

// Now replace the list in Dashboard.tsx with the card grid
const dashPath = 'src/pages/OnlineTests/Dashboard.tsx';
let dashContent = fs.readFileSync(dashPath, 'utf8');

const listSectionRegex = /\{\/\* List Section \*\/\}([\s\S]*?)<\/main>/;

const newGrid = `{/* List Section */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 h-[160px] flex flex-col justify-between animate-pulse">
                  <div className="space-y-3 w-full">
                    <div className="flex justify-between">
                       <div className="h-5 bg-zinc-100 rounded-lg w-16"></div>
                       <div className="h-5 bg-zinc-100 rounded-lg w-6"></div>
                    </div>
                    <div className="h-5 bg-zinc-200 rounded w-full"></div>
                    <div className="h-5 bg-zinc-200 rounded w-2/3"></div>
                  </div>
                  <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                     <div className="h-3 bg-zinc-100 rounded w-24"></div>
                     <div className="h-5 bg-zinc-100 rounded w-5"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
                <FileText className="text-gray-400" size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Ma'lumot topilmadi</h3>
              <p className="text-gray-500 mb-8 max-w-md">Hali hech qanday test yaratmagansiz. O'quvchilaringiz uchun birinchi onlayn testingizni yarating.</p>
              {!search && (
                <button 
                  onClick={() => navigate('/online-tests/create')}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-black hover:bg-gray-50 text-sm font-bold tracking-wide rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus size={16} strokeWidth={2} />
                  Test yaratish
                </button>
              )}
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTests.map((test) => (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
                  }}
                  key={test.id}
                  onClick={() => navigate(\`/online-tests/details/\${test.id}\`)}
                  className="bg-white/80 backdrop-blur-xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 hover:bg-white hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-black/10 transition-all cursor-pointer group relative flex flex-col h-full overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#111111]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-gray-100/80 rounded-lg text-[10px] uppercase tracking-wider font-bold text-gray-600 border border-black/5 group-hover:bg-gray-100 group-hover:text-black transition-colors">{test.subject}</span>
                      <button 
                        onClick={(e) => handleDeleteTest(e, test.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                        title="O'chirish"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                    
                    <h3 className="text-lg font-bold text-[#111111] group-hover:text-accent transition-colors mb-3 line-clamp-2 leading-snug">{test.title}</h3>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} strokeWidth={1.5} />
                        <span>{test?.questions?.length || 0} savol</span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#111111] group-hover:text-white transition-colors">
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-white transition-colors" strokeWidth={2} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>`;

if (dashContent.match(listSectionRegex)) {
  dashContent = dashContent.replace(listSectionRegex, newGrid);
  fs.writeFileSync(dashPath, dashContent, 'utf8');
  console.log("Successfully replaced list with grid in Dashboard.tsx");
} else {
  console.log("Regex not matched for Dashboard list section");
}
