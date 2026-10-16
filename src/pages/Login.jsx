import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Demo login logic
    if (username && password) {
      localStorage.setItem('authSession', JSON.stringify({
        user: { name: 'Admin User', role: 'Admin' },
        token: 'demo-token-123'
      }));
      window.location.href = '/dashboard'; // Force reload to update App state
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-workspace p-4">
      <div className="card w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-8">
          <img src="/Every Kadai Logo.png" alt="EVERYKADAI" className="h-28 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Sign in to your EVERYKADAI account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username or Mobile</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field pl-10"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 pr-10"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input type="checkbox" className="rounded text-primary focus:ring-primary mr-2" defaultChecked />
              <span className="text-slate-600">Remember me</span>
            </label>
            <a href="#" className="text-primary hover:text-primary-800 font-medium">Contact Admin</a>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5 text-lg">
            Sign In
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Demo Credentials: admin / demo123</p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-slate-500 text-sm">
        <p>Developed by <span className="font-bold text-primary-600">Code Blaza Technology</span></p>
      </div>
    </div>
  );
};

export default Login;
