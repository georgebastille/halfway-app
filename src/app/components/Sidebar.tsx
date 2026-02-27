"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HomeIcon,
  InformationCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Sidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md hover:bg-gray-50 transition-colors border border-gray-300"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        ) : (
          <Bars3Icon className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Sidebar - NO BACKDROP OVERLAY to test if that's causing the black screen */}
      <div
        className={`
          flex flex-col w-64 bg-white shadow-lg
          fixed inset-y-0 left-0 z-40
          lg:relative lg:shadow-md lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-center h-20 shadow-md border-b border-gray-100">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
            Halfway
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <ul className="flex flex-col space-y-1">
            <li>
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="flex flex-row items-center h-12 transform hover:translate-x-2 transition-transform ease-in duration-200 text-gray-500 hover:text-gray-800"
              >
                <span className="inline-flex items-center justify-center h-12 w-12 text-lg text-gray-400">
                  <HomeIcon className="w-6 h-6" />
                </span>
                <span className="text-sm font-medium">Home</span>
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                onClick={closeMobileMenu}
                className="flex flex-row items-center h-12 transform hover:translate-x-2 transition-transform ease-in duration-200 text-gray-500 hover:text-gray-800"
              >
                <span className="inline-flex items-center justify-center h-12 w-12 text-lg text-gray-400">
                  <InformationCircleIcon className="w-6 h-6" />
                </span>
                <span className="text-sm font-medium">About</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Close button inside sidebar for mobile */}
        <div className="lg:hidden p-4 border-t border-gray-200">
          <button
            onClick={closeMobileMenu}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
          >
            Close Menu
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
