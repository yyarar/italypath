"use client";

export default function Footer() {
    return (
        <footer className="bg-white border-t border-slate-200 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                    <span className="text-xl font-bold text-slate-900">ItalyPath</span>
                    <p className="text-sm text-slate-500 mt-1">© 2026 All rights reserved.</p>
                </div>
                <div className="flex space-x-6">
                    <a href="/" className="text-slate-400 hover:text-blue-600 transition">Twitter</a>
                    <a href="/" className="text-slate-400 hover:text-blue-600 transition">Instagram</a>
                    <a href="/" className="text-slate-400 hover:text-blue-600 transition">LinkedIn</a>
                </div>
            </div>
        </footer>
    );
}
