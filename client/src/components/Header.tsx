import { Home, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Property<span className="text-primary-600">Insight</span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
              Property Search
            </a>
            <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
              How It Works
            </a>
            <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
              Data Sources
            </a>
            <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
              API
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <button className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
              Sign In
            </button>
            <button className="btn-primary text-sm py-2 px-4">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
                Property Search
              </a>
              <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
                How It Works
              </a>
              <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
                Data Sources
              </a>
              <a href="#" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
                API
              </a>
              <hr className="border-gray-100" />
              <button className="text-gray-600 hover:text-primary-600 transition-colors font-medium text-left">
                Sign In
              </button>
              <button className="btn-primary text-sm py-2 px-4 w-fit">
                Get Started
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
