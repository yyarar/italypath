"use client";

export default function Footer() {
    return (
        <footer className="bg-white border-t border-slate-100 py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Brand */}
                    <div>
                        <span
                            className="text-2xl font-black tracking-tight gradient-text"
                            style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)' }}
                        >
                            ItalyPath
                        </span>
                        <p className="text-xs text-slate-400 mt-1.5 font-medium">
                            İtalya&apos;da eğitimin akıllı rehberi ·{' '}
                            <span className="text-slate-300">© 2026</span>
                        </p>
                    </div>

                    {/* Social */}
                    <div className="flex items-center gap-4">
                        {['Twitter', 'Instagram', 'LinkedIn'].map((name) => (
                            <span
                                key={name}
                                className="text-sm text-slate-300 font-medium cursor-default select-none"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
