import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../Navbar/Navbar.css";
import { FaCode } from "react-icons/fa";
import { FaBars } from "react-icons/fa"; // Hamburger icon

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedNavOption, setSelectedNavOption] = useState(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false); // Track mobile menu state

  useEffect(() => {
    setSelectedNavOption(location.pathname);
    setMenuOpen(false); // Close menu on navigation
  }, [location.pathname]);

  const handleNavigationChange = (event) => {
    const path = event.target.value;
    setSelectedNavOption(path);
    if (path) {
      navigate(path);
    }
  };

  const handleMenuToggle = () => {
    setMenuOpen((prev) => !prev);
  };

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <FaCode className="logoicon" />
          <h2>WEB-DEVELOPER</h2>
        </div>
        {/* Hamburger menu button (visible on mobile) */}
        <button className="menu-toggle" onClick={handleMenuToggle} aria-label="Toggle menu">
          <FaBars />
        </button>
        {/* Navigation links and dropdown */}
        <div className={`pages${menuOpen ? " active" : ""}`}>
          <Link to="/Ranveer-Portfolio"> Home </Link>
          <Link to="/Ranveer-Portfolio/about"> About </Link>
          <Link to="/Ranveer-Portfolio/project">Projects</Link>
          <select
            value={selectedNavOption}
            onChange={handleNavigationChange}
            id="page-nav-dropdown"
          >
            <option value="">Select a Page</option>
            <option value="/Ranveer-Portfolio">Home</option>
            <option value="/Ranveer-Portfolio/about">About</option>
            <option value="/Ranveer-Portfolio/project">Projects</option>
          </select>
        </div>
      </div>
    </>
  );
};

export default Navbar;
// ...existing code...