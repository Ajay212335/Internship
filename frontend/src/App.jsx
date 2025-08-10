import React, { useEffect, useState } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5050';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // start at login

  useEffect(() => {
    axios.get('/api/me').then(r => {
      if (r.data.ok) {
        setUser(r.data.user);
        setView('dashboard');
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="app" style={{ fontFamily: "'Krone One', sans-serif" }}>
      <main className="main">
        {!user && view === 'register' && (
          <Register
            onRegistered={(u) => { setUser(u); setView('dashboard'); }}
            goToLogin={() => setView('login')}
          />
        )}

        {!user && view === 'login' && (
          <Login
            onLoggedIn={(u) => { setUser(u); setView('dashboard'); }}
            goToRegister={() => setView('register')}
          />
        )}

        {user && (
          <Dashboard
            user={user}
            onLogout={() => {
              axios.post('/api/logout').then(() => {
                setUser(null);
                setView('login'); // Go back to login on logout
              });
            }}
          />
        )}
      </main>
    </div>
  );
}
