import { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">

      <div className="absolute inset-0 bg-center bg-cover opacity-30 mix-blend-overlay z-0 pointer-events-none"
        style={{ backgroundImage: "url('/banner.webp')" }}
      />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative z-10">

        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto lg:mx-0 p-6 sm:p-8 lg:p-10">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-sm sm:text-base text-slate-600">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <div className={`relative transition-all ${focusedInput === 'username' ? 'scale-[1.01]' : ''}`}>
                <User className={`absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-5 sm:w-6 h-5 sm:h-6 transition-colors ${focusedInput === 'username' ? 'text-slate-900' : 'text-slate-400'
                  }`} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedInput('username')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full pl-10 sm:pl-12 pr-4 h-12 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-base sm:text-lg text-slate-900"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className={`relative transition-all ${focusedInput === 'password' ? 'scale-[1.01]' : ''}`}>
                <Lock className={`absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-5 sm:w-6 h-5 sm:h-6 transition-colors ${focusedInput === 'password' ? 'text-slate-900' : 'text-slate-400'
                  }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  className="w-full pl-10 sm:pl-12 pr-12 h-12 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-base sm:text-lg text-slate-900"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                {error}
              </div>
            )}

            <button type="submit"
              className="w-full bg-slate-900 text-white h-12 rounded-xl hover:bg-slate-800 transition-all font-semibold flex items-center justify-center gap-2 group shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 text-base"
            >
              Sign In
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
