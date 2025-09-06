import React from "react";
import { FaInstagram, FaGithub, FaLinkedin } from "react-icons/fa";
import { BsWhatsapp } from "react-icons/bs";
import "../Footer/Footer.css";

const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <div className="footer-logo">
        <span>Ranveer Jaiswal</span>
        <span className="footer-dot">•</span>
        <span>Web Developer</span>
      </div>
      <div className="footer-socials">
        <a href="https://www.instagram.com/ran_veerjaiswal/?hl=en" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <FaInstagram className="footer-icon instaicon" />
        </a>
        <a href="https://github.com/Rvjais" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <FaGithub className="footer-icon githubicon" />
        </a>
        <a href="https://wa.me/918004505051?text=Hello%20there%2C%20I%20have%20a%20question." target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
          <BsWhatsapp className="footer-icon whatsappicon" />
        </a>
        <a href="https://www.linkedin.com/in/ranveer-jaiswal-966289238/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <FaLinkedin className="footer-icon linkedinicon" />
        </a>
      </div>
      <div className="footer-copy">
        &copy; {new Date().getFullYear()} Ranveer Jaiswal. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;