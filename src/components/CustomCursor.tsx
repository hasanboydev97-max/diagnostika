import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const location = useLocation();

  const isLanding = location.pathname === '/';

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'button' ||
        target.tagName.toLowerCase() === 'a' ||
        target.tagName.toLowerCase() === 'input' ||
        target.closest('button') ||
        target.closest('a')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  if (isLanding) {
    // Large creative cursor for the main landing page
    const cursorSize = 64;
    const cursorOffset = cursorSize / 2;
    return (
      <motion.div
        className="fixed top-0 left-0 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block"
        style={{
          width: cursorSize,
          height: cursorSize,
          backgroundColor: 'white',
        }}
        animate={{
          x: mousePosition.x - cursorOffset,
          y: mousePosition.y - cursorOffset,
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 28,
          mass: 0.5
        }}
      />
    );
  }

  // Sleek minimalist trailing-dot cursor for dashboard and internal pages
  return (
    <>
      {/* Inner Dot */}
      <motion.div
        className="fixed top-0 left-0 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block"
        style={{
          width: 6,
          height: 6,
          backgroundColor: 'white',
        }}
        animate={{
          x: mousePosition.x - 3,
          y: mousePosition.y - 3,
        }}
        transition={{
          type: "spring",
          stiffness: 1000,
          damping: 50,
          mass: 0.1
        }}
      />
      {/* Outer Lag Ring */}
      <motion.div
        className="fixed top-0 left-0 rounded-full border border-white pointer-events-none z-[9999] mix-blend-difference hidden md:block"
        style={{
          width: 18,
          height: 18,
        }}
        animate={{
          x: mousePosition.x - 9,
          y: mousePosition.y - 9,
          scale: isHovering ? 1.8 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 28,
          mass: 0.5
        }}
      />
    </>
  );
}
