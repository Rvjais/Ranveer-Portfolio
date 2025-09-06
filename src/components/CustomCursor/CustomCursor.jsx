import React, { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

const CustomCursor = () => {
    const [showCursor, setShowCursor] = useState(window.innerWidth >= 768);
    const cursorDotRef = useRef(null);
    const cursorOutlineRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setShowCursor(window.innerWidth >= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!showCursor) return;
        const cursorDot = cursorDotRef.current;
        const cursorOutline = cursorOutlineRef.current;
        if (!cursorDot || !cursorOutline) return;

        const handleMouseMove = (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [showCursor]);

    if (!showCursor) return null;

    return (
        <>
            <div className="cursor-dot" data-cursor-dot ref={cursorDotRef}></div>
            <div className="cursor-outline" data-cursor-outline ref={cursorOutlineRef}></div>
        </>
    );
};

export default CustomCursor;