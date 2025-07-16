// src/components/CustomCursor.jsx
import React, { useEffect, useRef } from 'react';
import './CustomCursor.css'; // We'll create this CSS file next

const CustomCursor = () => {
    const cursorDotRef = useRef(null);
    const cursorOutlineRef = useRef(null);

    useEffect(() => {
        const cursorDot = cursorDotRef.current;
        const cursorOutline = cursorOutlineRef.current;

        if (!cursorDot || !cursorOutline) {
            console.error("Cursor elements not found in DOM.");
            return;
        }

        const handleMouseMove = (e) => {
            const posX = e.clientX;
            const posY = e.clientY;

            // Update dot position immediately
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;

            // Update outline position with animation
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        };

        window.addEventListener("mousemove", handleMouseMove);

        // Cleanup function to remove event listener when component unmounts
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []); // Empty dependency array means this effect runs once after initial render

    return (
        <>
            <div className="cursor-dot" data-cursor-dot ref={cursorDotRef}></div>
            <div className="cursor-outline" data-cursor-outline ref={cursorOutlineRef}></div>
        </>
    );
};

export default CustomCursor;