// src/components/Navbar/NavbarLogo.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Film } from "lucide-react";

const NavbarLogo = () => (
  <Link to="/" className="flex items-center space-x-2">
    <Film className="w-8 h-8 text-purple-600" />
    <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text">
      Vidlancing
    </span>
  </Link>
);

export default NavbarLogo;