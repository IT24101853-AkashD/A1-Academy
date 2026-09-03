import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 pt-16 pb-8 text-slate-400 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
                <div className="text-3xl font-extrabold tracking-tighter text-white">
                    A1<span className="text-amber-500">Academy</span>
                </div>
                <div className="flex flex-wrap justify-center gap-6 md:gap-8 font-medium">
                    <Link to="/about.html" className="hover:text-amber-400 transition-colors">About Us</Link>
                    <Link to="/careers.html" className="hover:text-amber-400 transition-colors">Careers</Link>
                    <Link to="/contact.html" className="hover:text-amber-400 transition-colors">Contact</Link>
                    <Link to="/help.html" className="hover:text-amber-400 transition-colors">Help</Link>
                    <Link to="/privacy.html" className="hover:text-amber-400 transition-colors">Privacy Policy</Link>
                    <Link to="/terms.html" className="hover:text-amber-400 transition-colors">Terms of Service</Link>
                </div>
            </div>
            <div className="border-t border-slate-800 pt-8 text-left text-sm">
                <p>© 2026 A1 Academy. All rights reserved.</p>
            </div>
        </div>
    </footer>
  );
}
