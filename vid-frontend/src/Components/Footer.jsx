import React, { useState, useRef, useEffect } from "react";
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPinterest,
  FaGithub,
} from "react-icons/fa";

const Footer = () => {
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("INR");
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const languageRef = useRef(null);
  const [languageDropdownDirection, setLanguageDropdownDirection] = useState("down");

  useEffect(() => {
    const updateDropdownDirection = () => {
      if (languageRef.current) {
        const rect = languageRef.current.getBoundingClientRect();
        const dropdownHeight = 150; // Approximate height of the dropdown
        if (window.innerHeight - rect.bottom < dropdownHeight) {
          setLanguageDropdownDirection("up");
        } else {
          setLanguageDropdownDirection("down");
        }
      }
    };

    updateDropdownDirection();
    window.addEventListener("resize", updateDropdownDirection);
    return () => {
      window.removeEventListener("resize", updateDropdownDirection);
    };
  }, []);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setShowLanguagePopup(false);
  };

  const handleCurrencyChange = (event) => {
    setCurrency(event.target.value);
  };

  return (
    <footer className="bg-neutral-900 text-white py-12">
      <div className="container mx-auto px-6 md:px-12">
        {/* Top Section: Services */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="text-gray-400 space-y-2">
              <li><a href="#about" className="hover:text-white">About Us</a></li>
              <li><a href="#careers" className="hover:text-white">Careers</a></li>
              <li><a href="#blog" className="hover:text-white">Blog</a></li>
              <li><a href="#partners" className="hover:text-white">Our Partners</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="text-gray-400 space-y-2">
              <li><a href="#help" className="hover:text-white">Help Center</a></li>
              <li><a href="#faq" className="hover:text-white">FAQs</a></li>
              <li><a href="#terms" className="hover:text-white">Terms & Conditions</a></li>
              <li><a href="#privacy" className="hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Connect</h3>
            <ul className="text-gray-400 space-y-2">
              <li><a href="#contact" className="hover:text-white">Contact Us</a></li>
              <li><a href="#social" className="hover:text-white">Social Media</a></li>
              <li><a href="#feedback" className="hover:text-white">Feedback</a></li>
              <li><a href="#news" className="hover:text-white">Newsletter</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Social Media and Language */}
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-700 pt-6">
          {/* Social Media Icons */}
          <div className="flex gap-4">
            <FaFacebook className="text-xl hover:text-blue-500 transition" />
            <FaTwitter className="text-xl hover:text-sky-400 transition" />
            <FaInstagram className="text-xl hover:text-pink-500 transition" />
            <FaLinkedin className="text-xl hover:text-blue-700 transition" />
            <FaYoutube className="text-xl hover:text-red-500 transition" />
            <FaPinterest className="text-xl hover:text-rose-500 transition" />
            <FaGithub className="text-xl hover:text-gray-500 transition" />
          </div>

          {/* Language and Currency Selector */}
          <div className="flex flex-col items-end gap-4 mt-6 md:mt-0">
            {/* Language Selector */}
            <div ref={languageRef} className="relative">
              <button
                className="text-sm text-gray-400 hover:text-white focus:outline-none"
                onClick={() => setShowLanguagePopup(!showLanguagePopup)}
              >
                {language} ▾
              </button>
              {showLanguagePopup && (
                <div
                  className={`absolute right-0 bg-white text-black w-36 rounded shadow-lg z-50 ${
                    languageDropdownDirection === "up" ? "-top-40" : "mt-2"
                  }`}
                >
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                    onClick={() => handleLanguageChange("English")}
                  >
                    English
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                    onClick={() => handleLanguageChange("French")}
                  >
                    French
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                    onClick={() => handleLanguageChange("Spanish")}
                  >
                    Spanish
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-200"
                    onClick={() => handleLanguageChange("German")}
                  >
                    German
                  </button>
                </div>
              )}
            </div>

            {/* Currency Converter */}
            <select
              className="bg-neutral-700 text-white text-sm rounded px-3 py-1"
              value={currency}
              onChange={handleCurrencyChange}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
