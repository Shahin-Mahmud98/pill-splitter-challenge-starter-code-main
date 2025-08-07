import { useState, useEffect, useRef, useCallback } from 'react';

// Main App component for the Pill Splitter application
const App = () => {
  // State to manage all pills on the screen
  const [pills, setPills] = useState([]);
  // State for the split lines (vertical and horizontal) following the cursor
  const [splitLines, setSplitLines] = useState({ x: 0, y: 0, visible: false });
  // State to track if the user is currently drawing a pill
  const [drawing, setDrawing] = useState(false);
  // State to store the starting coordinates of a pill drawing action
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  // State for the temporary pill being drawn (for visual feedback)
  const [tempPill, setTempPill] = useState(null);
  // State to track if a pill is currently being dragged
  const [draggingPillId, setDraggingPillId] = useState(null);
  // State to store the offset from the mouse pointer to the pill's top-left corner during drag
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Constants for pill dimensions
  const MIN_DRAW_SIZE = 40; // Minimum width/height for a newly drawn pill
  const MIN_SPLIT_SIZE = 20; // Minimum width/height for a pill part after splitting
  const BORDER_RADIUS = 20; // Border radius for all pills/parts
  const BORDER_THICKNESS = 3; // Border thickness for pills

  // Ref for the main container to get its dimensions (not strictly used for drawing, but good practice)
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

  // --- Mouse Event Handlers ---

  // Handles mouse movement across the entire document
  const handleMouseMove = useCallback((e) => {
    // Update split lines position to follow the cursor
    setSplitLines({ x: e.clientX, y: e.clientY, visible: true });

    // If currently drawing a pill, update its temporary dimensions and position
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
    // Check if the click was on an existing pill. If so, don't start drawing.
    const clickedOnPill = pills.some(
      (p) =>
        e.clientX >= p.x &&
        e.clientX <= p.x + p.width &&
        e.clientY >= p.y &&
        e.clientY <= p.y + p.height
    );

    // If not clicking on a pill and it's a left click, start drawing
    if (!clickedOnPill && e.button === 0) {
      setDrawing(true);
      setDrawStart({ x: e.clientX, y: e.clientY });
      // Initialize temporary pill with a random color for visual feedback during drawing
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

  // Handles mouse up event on the main container to finalize drawing or stop dragging
  const handleMouseUp = useCallback((e) => {
    // If drawing was in progress, finalize the new pill
    if (drawing) {
      setDrawing(false);
      setTempPill(null); // Clear the temporary drawing pill

      // Calculate final dimensions and position for the new pill
      const finalWidth = Math.abs(e.clientX - drawStart.x);
      const finalHeight = Math.abs(e.clientY - drawStart.y);
      const finalX = Math.min(e.clientX, drawStart.x);
      const finalY = Math.min(e.clientY, drawStart.y);

      // Only add the pill to the state if it meets the minimum size requirements
      if (finalWidth >= MIN_DRAW_SIZE && finalHeight >= MIN_DRAW_SIZE) {
        setPills((prevPills) => [
          ...prevPills,
          {
            id: crypto.randomUUID(), // Assign a unique ID to the new pill
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            color: tempPill.color, // Use the color assigned during drawing
            borderRadius: BORDER_RADIUS,
          },
        ]);
      }
    }
    // Stop any ongoing dragging operation
    setDraggingPillId(null);
  }, [drawing, drawStart, tempPill, MIN_DRAW_SIZE]);

  // Handles single click on the page to trigger splitting of intersecting pills
  const handleClick = useCallback((e) => {
    // Prevent splitting if currently drawing or dragging a pill
    if (drawing || draggingPillId) return;

    // Get the current mouse coordinates, which define the split lines
    const splitX = e.clientX;
    const splitY = e.clientY;

    setPills((prevPills) => {
      const newPills = [];
      prevPills.forEach((p) => {
        let splitPerformed = false; // Flag to check if the pill was split or moved

        // Check for vertical split (along the horizontal split line)
        // A vertical split occurs if the horizontal split line passes through the pill's vertical extent
        if (splitY > p.y && splitY < p.y + p.height) {
          const topPartHeight = splitY - p.y;
          const bottomPartHeight = p.height - topPartHeight;

          // Check if splitting would create parts smaller than the minimum allowed size
          if (topPartHeight < MIN_SPLIT_SIZE || bottomPartHeight < MIN_SPLIT_SIZE) {
            // If too small, move the pill slightly up or down instead of splitting
            const moveAmount = 10; // Arbitrary small movement for visual feedback
            if (topPartHeight < MIN_SPLIT_SIZE) {
              newPills.push({ ...p, y: p.y - moveAmount }); // Move up
            } else {
              newPills.push({ ...p, y: p.y + moveAmount }); // Move down
            }
            splitPerformed = true; // Mark as handled (moved)
          } else {
            // Valid vertical split: create two new pill parts
            newPills.push({
              id: crypto.randomUUID(), // New unique ID for the top part
              x: p.x,
              y: p.y,
              width: p.width,
              height: topPartHeight,
              color: p.color,
              borderRadius: BORDER_RADIUS, // Retain original border radius
            });
            newPills.push({
              id: crypto.randomUUID(), // New unique ID for the bottom part
              x: p.x,
              y: splitY,
              width: p.width,
              height: bottomPartHeight,
              color: p.color,
              borderRadius: BORDER_RADIUS, // Retain original border radius
            });
            splitPerformed = true;
          }
        }

        // Check for horizontal split (along the vertical split line)
        // A horizontal split occurs if the vertical split line passes through the pill's horizontal extent
        // This check only happens if the pill wasn't already split vertically in this click
        if (splitX > p.x && splitX < p.x + p.width && !splitPerformed) {
          const leftPartWidth = splitX - p.x;
          const rightPartWidth = p.width - leftPartWidth;

          // Check if splitting would create parts smaller than the minimum allowed size
          if (leftPartWidth < MIN_SPLIT_SIZE || rightPartWidth < MIN_SPLIT_SIZE) {
            // If too small, move the pill slightly left or right instead of splitting
            const moveAmount = 10; // Arbitrary small movement
            if (leftPartWidth < MIN_SPLIT_SIZE) {
              newPills.push({ ...p, x: p.x - moveAmount }); // Move left
            } else {
              newPills.push({ ...p, x: p.x + moveAmount }); // Move right
            }
            splitPerformed = true; // Mark as handled (moved)
          } else {
            // Valid horizontal split: create two new pill parts
            newPills.push({
              id: crypto.randomUUID(), // New unique ID for the left part
              x: p.x,
              y: p.y,
              width: leftPartWidth,
              height: p.height,
              color: p.color,
              borderRadius: BORDER_RADIUS, // Retain original border radius
            });
            newPills.push({
              id: crypto.randomUUID(), // New unique ID for the right part
              x: splitX,
              y: p.y,
              width: rightPartWidth,
              height: p.height,
              color: p.color,
              borderRadius: BORDER_RADIUS, // Retain original border radius
            });
            splitPerformed = true;
          }
        }

        // If no split or move was performed for this pill, keep the original pill in the array
        if (!splitPerformed) {
          newPills.push(p);
        }
      });
      return newPills; // Return the updated list of pills
    });
  }, [drawing, draggingPillId, MIN_SPLIT_SIZE]);

  // --- Effect Hooks ---

  // Set up and clean up global mouse event listeners for smooth interactions
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    // Hide split lines when the mouse leaves the browser window
    const handleMouseLeave = () => setSplitLines((prev) => ({ ...prev, visible: false }));
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- Sub-components ---

  // Component for rendering a single pill or pill part
  const Pill = ({ id, x, y, width, height, color, borderRadius }) => {
    const pillRef = useRef(null);

    // Handles mouse down on a pill to initiate dragging
    const onMouseDownPill = useCallback((e) => {
      e.stopPropagation(); // Prevent the container's handleMouseDown/handleClick from firing
      setDraggingPillId(id);
      // Calculate the offset from the mouse pointer to the pill's top-left corner
      // This ensures the pill doesn't jump when dragging starts
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
          borderWidth: `${BORDER_THICKNESS}px`, // Apply the thick border
          boxSizing: 'border-box', // Ensure border doesn't increase element size
        }}
        onMouseDown={onMouseDownPill}
      ></div>
    );
  };

  // Component for rendering the vertical and horizontal split lines
  const SplitLines = ({ x, y, visible }) => {
    if (!visible) return null; // Don't render if not visible

    return (
      <>
        {/* Vertical split line */}
        <div
          className="fixed bg-red-500 z-50 pointer-events-none" // pointer-events-none ensures clicks pass through
          style={{
            left: `${x}px`,
            top: 0,
            width: '1px',
            height: '100vh',
          }}
        ></div>
        {/* Horizontal split line */}
        <div
          className="fixed bg-red-500 z-50 pointer-events-none" // pointer-events-none ensures clicks pass through
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
      onMouseDown={handleMouseDown} // Handles starting to draw a pill
      onClick={handleClick} // Handles splitting pills with a single click
    >
      {/* Render the split lines that follow the cursor */}
      <SplitLines x={splitLines.x} y={splitLines.y} visible={splitLines.visible} />

      {/* Render all the pills (or pill parts) currently in the state */}
      {pills.map((pill) => (
        <Pill key={pill.id} {...pill} />
      ))}

      {/* Render the temporary pill while the user is drawing a new one */}
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
