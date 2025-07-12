import React from "react";
import { Link } from "react-router-dom";
import '../Navbar/Navbar.css'
import { FaCode } from "react-icons/fa";
const Navbar = () => {
  return (
    <>
      <div className="navbar">
        <div className="logo">
          <FaCode className="logoicon"/>
          <h2>WEB-DEVELOPER</h2>
        </div>
        <div className="pages">
          <Link to="/"> Home </Link>
          <Link to="/about"> About </Link>
          <select name="Pages"  id="">
            <option >Home</option>
            <option >About</option>
            <option selected >Pages</option>
            <option >Contacts</option>
          </select>
        </div>
      </div>
    </>
  );
};

export default Navbar;
