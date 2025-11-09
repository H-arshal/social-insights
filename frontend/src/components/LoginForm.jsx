import { useState } from 'react';
import api from '../utils/api';

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { username, password });
      localStorage.setItem('authToken', response.data.token);
      onLogin(true);
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card">
        <h1 className="title">Social Insights</h1>
        <p className="subtitle">API Wrapper Platform</p>
        <div>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="field" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
          {error && <p className="error">{error}</p>}
          <button onClick={handleLogin} disabled={loading} className="btn">{loading ? 'Logging in...' : 'Login'}</button>
        </div>
        <p className="demo-note">Demo: admin / admin123</p>
      </div>
    </div>
  );
}
