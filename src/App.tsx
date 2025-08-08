import { useState, useEffect, useRef, useCallback } from 'react';

// Main App component for the Pill Splitter application
const App = () => {
  const [pills, setPills] = useState([]);
  const [splitLines, setSplitLines] = useState({ x: 0, y: 0, visible: false });
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [tempPill, setTempPill] = useState(null);
  const [draggingPillId, setDraggingPillId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Constants for pill dimensions
  const MIN_DRAW_SIZE = 40; 
  const MIN_SPLIT_SIZE = 20;
  const BORDER_RADIUS = 20; 
  const BORDER_THICKNESS = 3; 

  // Ref for the main container to get its dimensions 
  const containerRef = useRef(null);

  // Utility function to generate a random hex color
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };


  // Handles mouse movement across the entire document
  const handleMouseMove = useCallback((e) => {
    setSplitLines({ x: e.clientX, y: e.clientY, visible: true });
    if (drawing && tempPill) {
      const currentX = e.clientX;
      const currentY = e.clientY;

      const newWidth = Math.abs(currentX - drawStart.x);
      const newHeight = Math.abs(currentY - drawStart.y);
      const newX = Math.min(currentX, drawStart.x);
      const newY = Math.min(currentY, drawStart.y);

      setTempPill({
        ...tempPill,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    }

    // If currently dragging a pill, update its position
    if (draggingPillId) {
      setPills((prevPills) =>
        prevPills.map((p) =>
          p.id === draggingPillId
            ? {
                ...p,
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y,
              }
            : p
        )
      );
    }
  }, [drawing, drawStart, draggingPillId, dragOffset, tempPill]);

  // Handles mouse down event on the main container to start drawing
  const handleMouseDown = useCallback((e) => {
    const clickedOnPill = pills.some(
      (p) =>
        e.clientX >= p.x &&
        e.clientX <= p.x + p.width &&
        e.clientY >= p.y &&
        e.clientY <= p.y + p.height
    );

  
    if (!clickedOnPill && e.button === 0) {
      setDrawing(true);
      setDrawStart({ x: e.clientX, y: e.clientY });
      
      setTempPill({
        id: 'temp-pill',
        x: e.clientX,
        y: e.clientY,
        width: 0,
        height: 0,
        color: getRandomColor(),
        borderRadius: BORDER_RADIUS,
      });
    }
  }, [pills]);

  // Handles mouse up event on the main container
  const handleMouseUp = useCallback((e) => {
    
    if (drawing) {
      setDrawing(false);
      setTempPill(null); 

      const finalWidth = Math.abs(e.clientX - drawStart.x);
      const finalHeight = Math.abs(e.clientY - drawStart.y);
      const finalX = Math.min(e.clientX, drawStart.x);
      const finalY = Math.min(e.clientY, drawStart.y);


      if (finalWidth >= MIN_DRAW_SIZE && finalHeight >= MIN_DRAW_SIZE) {
        setPills((prevPills) => [
          ...prevPills,
          {
            id: crypto.randomUUID(), 
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            color: tempPill.color,
            borderRadius: BORDER_RADIUS,
          },
        ]);
      }
    }
    
    setDraggingPillId(null);
  }, [drawing, drawStart, tempPill, MIN_DRAW_SIZE]);

  // Handles single click on the page to trigger splitting of intersecting pills
  const handleClick = useCallback((e) => {
    if (drawing || draggingPillId) return;
    const splitX = e.clientX;
    const splitY = e.clientY;

    setPills((prevPills) => {
      const newPills = [];
      prevPills.forEach((p) => {
        let splitPerformed = false; 
        if (splitY > p.y && splitY < p.y + p.height) {
          const topPartHeight = splitY - p.y;
          const bottomPartHeight = p.height - topPartHeight;
          if (topPartHeight < MIN_SPLIT_SIZE || bottomPartHeight < MIN_SPLIT_SIZE) {
            const moveAmount = 10; 
            if (topPartHeight < MIN_SPLIT_SIZE) {
              newPills.push({ ...p, y: p.y - moveAmount }); 
            } else {
              newPills.push({ ...p, y: p.y + moveAmount }); 
            }
            splitPerformed = true;
          } else {
            
            newPills.push({
              id: crypto.randomUUID(), 
              x: p.x,
              y: p.y,
              width: p.width,
              height: topPartHeight,
              color: p.color,
              borderRadius: BORDER_RADIUS, 
            });
            newPills.push({
              id: crypto.randomUUID(), 
              x: p.x,
              y: splitY,
              width: p.width,
              height: bottomPartHeight,
              color: p.color,
              borderRadius: BORDER_RADIUS, 
            });
            splitPerformed = true;
          }
        }

        // Check for horizontal split (along the vertical split line)
        if (splitX > p.x && splitX < p.x + p.width && !splitPerformed) {
          const leftPartWidth = splitX - p.x;
          const rightPartWidth = p.width - leftPartWidth;
          if (leftPartWidth < MIN_SPLIT_SIZE || rightPartWidth < MIN_SPLIT_SIZE) {
            const moveAmount = 10; 
            if (leftPartWidth < MIN_SPLIT_SIZE) {
              newPills.push({ ...p, x: p.x - moveAmount }); 
            } else {
              newPills.push({ ...p, x: p.x + moveAmount }); 
            }
            splitPerformed = true; 
          } else {
            newPills.push({
              id: crypto.randomUUID(),
              x: p.x,
              y: p.y,
              width: leftPartWidth,
              height: p.height,
              color: p.color,
              borderRadius: BORDER_RADIUS, 
            });
            newPills.push({
              id: crypto.randomUUID(), 
              x: splitX,
              y: p.y,
              width: rightPartWidth,
              height: p.height,
              color: p.color,
              borderRadius: BORDER_RADIUS, 
            });
            splitPerformed = true;
          }
        }

        if (!splitPerformed) {
          newPills.push(p);
        }
      });
      return newPills; 
    });
  }, [drawing, draggingPillId, MIN_SPLIT_SIZE]);

  // --- Effect Hooks ---
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    const handleMouseLeave = () => setSplitLines((prev) => ({ ...prev, visible: false }));
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- Sub-components ---

  const Pill = ({ id, x, y, width, height, color, borderRadius }) => {
    const pillRef = useRef(null);

    const onMouseDownPill = useCallback((e) => {
      e.stopPropagation(); 
      setDraggingPillId(id);
      setDragOffset({ x: e.clientX - x, y: e.clientY - y });
    }, [id, x, y]);

    return (
      <div
        ref={pillRef}
        className="absolute border-black cursor-grab transition-all duration-75 ease-out"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: color,
          borderRadius: `${borderRadius}px`,
          borderWidth: `${BORDER_THICKNESS}px`, 
          boxSizing: 'border-box', 
        }}
        onMouseDown={onMouseDownPill}
      ></div>
    );
  };

  // Component for rendering the vertical and horizontal split lines
  const SplitLines = ({ x, y, visible }) => {
    if (!visible) return null; 

    return (
      <>
        {/* Vertical split line */}
        <div
          className="fixed bg-red-500 z-50 pointer-events-none" 
          style={{
            left: `${x}px`,
            top: 0,
            width: '1px',
            height: '100vh',
          }}
        ></div>
        {/* Horizontal split line */}
        <div
          className="fixed bg-red-500 z-50 pointer-events-none" 
          style={{
            left: 0,
            top: `${y}px`,
            width: '100vw',
            height: '1px',
          }}
        ></div>
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-gray-100"
      onMouseDown={handleMouseDown} 
      onClick={handleClick} 
    >
      <SplitLines x={splitLines.x} y={splitLines.y} visible={splitLines.visible} />
      {pills.map((pill) => (
        <Pill key={pill.id} {...pill} />
      ))}
      {drawing && tempPill && (
        <div
          className="absolute border-black border-dashed opacity-50"
          style={{
            left: `${tempPill.x}px`,
            top: `${tempPill.y}px`,
            width: `${tempPill.width}px`,
            height: `${tempPill.height}px`,
            backgroundColor: tempPill.color,
            borderRadius: `${tempPill.borderRadius}px`,
            borderWidth: `${BORDER_THICKNESS}px`,
          }}
        ></div>
      )}
    </div>
  );
};

export default App;
