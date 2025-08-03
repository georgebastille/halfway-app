
import Link from 'next/link';
import { HomeIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const Sidebar = () => {
  return (
    <div className="flex flex-col w-64 bg-white shadow-md">
      <div className="flex items-center justify-center h-20 shadow-md">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">Halfway</h1>
      </div>
      <ul className="flex flex-col py-4 space-y-1">
        <li>
          <Link href="/" className="flex flex-row items-center h-12 transform hover:translate-x-2 transition-transform ease-in duration-200 text-gray-500 hover:text-gray-800">
            <span className="inline-flex items-center justify-center h-12 w-12 text-lg text-gray-400"><HomeIcon className="w-6 h-6" /></span>
            <span className="text-sm font-medium">Home</span>
          </Link>
        </li>
        <li>
          <Link href="/about" className="flex flex-row items-center h-12 transform hover:translate-x-2 transition-transform ease-in duration-200 text-gray-500 hover:text-gray-800">
            <span className="inline-flex items-center justify-center h-12 w-12 text-lg text-gray-400"><InformationCircleIcon className="w-6 h-6" /></span>
            <span className="text-sm font-medium">About</span>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
