import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Agar muammo dynamic import (ChunkLoadError) bo'lsa, bu yangi versiya Vercelga 
    // yuklanganini va eski .js fayli o'chib ketganini bildiradi. 
    // Bunday holatda eng zo'r yechim sahifani shunchaki refresh qilishdir.
    const isChunkLoadError = error?.name === 'ChunkLoadError' || 
                             error?.message?.includes('Failed to fetch dynamically imported module') ||
                             error?.message?.includes('Importing a module script failed');
                             
    if (isChunkLoadError) {
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fdfdfd] flex flex-col items-center justify-center p-6 text-center text-[#111111]">
          <h1 className="text-3xl font-medium tracking-tight mb-4">Uzur, kutilmagan xatolik yuz berdi</h1>
          <p className="text-gray-500 mb-8 max-w-md">
            Iltimos, sahifani yangilang yoki asosiy sahifaga qayting.
          </p>
          <button 
            onClick={() => window.location.replace('/')}
            className="bg-[#111111] text-white px-8 py-4 text-sm tracking-[0.2em] uppercase hover:bg-black transition-colors"
          >
            Asosiy Sahifa
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
