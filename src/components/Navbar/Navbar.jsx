import React, { useState, useEffect } from "react"; // Import useEffect
import { Link, useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import "../Navbar/Navbar.css";
import { FaCode } from "react-icons/fa";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location object

  // Initialize selectedNavOption with the current URL path
  const [selectedNavOption, setSelectedNavOption] = useState(location.pathname);

  // Use useEffect to update the select's value when the URL changes
  // This ensures the dropdown stays in sync if navigation happens via <Link> or direct URL input
  useEffect(() => {
    setSelectedNavOption(location.pathname);
  }, [location.pathname]); // Dependency array: re-run effect when pathname changes

  const handleNavigationChange = (event) => {
    const path = event.target.value;
    setSelectedNavOption(path); // Update the state immediately

    if (path) {
      // Only navigate if a valid path is selected (not the placeholder)
      navigate(path);
    }
  };

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <FaCode className="logoicon" />
          <h2>WEB-DEVELOPER</h2>
        </div>
        <div className="pages">
          {/* Keep your existing Link components for direct clicks */}
          <Link to="/Ranveer-Portfolio"> Home </Link>
          <Link to="/Ranveer-Portfolio/about"> About </Link>
          <Link to = "/Ranveer-Portfolio/project">Projects</Link>
          {/* Corrected Select for Navigation */}
          <select
            value={selectedNavOption} // Controlled component: binds select value to state
            onChange={handleNavigationChange} // Use onChange to detect selection changes
            id="page-nav-dropdown" // Good practice for accessibility
          >
            {/* Placeholder option */}
            <option value="">Select a Page</option>
            {/* Each option's value attribute is the path to navigate to */}
            <option value="/Ranveer-Portfolio">Home</option>
            <option value="/Ranveer-Portfolio/project">About</option>
            <option value="/Ranveer-Portfolio/contact">Contacts</option>
          </select>
        </div>
      </div>
    </>
  );
};

export default Navbar;