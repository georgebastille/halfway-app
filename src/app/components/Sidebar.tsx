
'use client';

import Link from 'next/link';
import { HomeIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      ></div>

      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-md z-40 transform transition-transform ease-in-out duration-300 md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-20 shadow-md">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">Halfway</h1>
        </div>
        <ul className="flex flex-col py-4 space-y-1">
          <li>
            <Link href="/" onClick={onClose} className="flex flex-row items-center h-12 transform hover:translate-x-2 transition-transform ease-in duration-200 text-gray-500 hover:text-gray-800">
              <span className="inline-flex items-center justify-center h-12 w-12 text-lg text-gray-400"><HomeIcon className="w-6 h-6" /></span>
              <span className="text-sm font-medium">Home</span>
            </Link>
          </li>
          <li>
            <Link href="/about" onClick={onClose} className="flex flex-row items-center h-12 transform hover:translate-x-2 transition-transform ease-in duration-200 text-gray-500 hover:text-gray-800">
              <span className="inline-flex items-center justify-center h-12 w-12 text-lg text-gray-400"><InformationCircleIcon className="w-6 h-6" /></span>
              <span className="text-sm font-medium">About</span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Sidebar;
