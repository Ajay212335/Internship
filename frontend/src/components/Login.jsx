import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLoggedIn, goToRegister }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1 start, 2 verify
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState('');

  async function startLogin(e) {
    e.preventDefault();
    setMsg('');
    try {
      const r = await axios.post('/api/login/start', { email });
      if (r.data.ok) {
        setStep(2);
        setMsg('OTP sent to email');
      } else setMsg('Error: ' + (r.data.error || 'unknown'));
    } catch (err) {
      setMsg(err.response?.data?.error || 'server error');
    }
  }

  async function verifyLogin(e) {
    e.preventDefault();
    try {
      const r = await axios.post('/api/login/verify', { email, otp });
      if (r.data.ok) onLoggedIn(r.data.user);
      else setMsg('Error: ' + (r.data.error || 'unknown'));
    } catch (err) {
      setMsg(err.response?.data?.error || 'server error');
    }
  }

  return (
    <div style={{
      backgroundColor: '#f3bbc4',
      width: 460,
      padding: 30,
      borderRadius: 30,
      boxShadow: '0 0 40px 0 rgba(0,0,0,0.2)',
      textAlign: 'center',
      fontFamily: "'Krone One', sans-serif",
      margin: 'auto',
      marginTop: '25vh',
    }}>
      <h1 style={{ color: '#b95c6e', fontWeight: 'bold', marginBottom: 25 }}>LOGIN</h1>

      {step === 1 && (
        <form onSubmit={startLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            placeholder="Email :"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              borderRadius: 30,
              border: 'none',
              padding: '14px 20px',
              fontSize: 20,
              fontWeight: 600,
              color: '#c29da4',
              outline: 'none',
              backgroundColor: 'white',
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#b95c6e',
              borderRadius: 30,
              border: 'none',
              padding: '14px 20px',
              fontSize: 22,
              fontWeight: 'bold',
              color: 'white',
              cursor: 'pointer',
              letterSpacing: 1,
              fontFamily: "'Krone One', sans-serif",
            }}
          >
            Send Otp
          </button>
          <p style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>
            New User ?{' '}
            <button
              type="button"
              onClick={goToRegister}
              style={{
                background: 'none',
                border: 'none',
                color: '#b95c6e',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 18,
                fontFamily: "'Krone One', sans-serif",
              }}
            >
              Register
            </button>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            placeholder="Enter OTP"
            value={otp}
            onChange={e => setOtp(e.target.value)}
            required
            style={{
              borderRadius: 30,
              border: 'none',
              padding: '14px 20px',
              fontSize: 20,
              fontWeight: 600,
              color: '#c29da4',
              outline: 'none',
              backgroundColor: 'white',
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#b95c6e',
              borderRadius: 30,
              border: 'none',
              padding: '14px 20px',
              fontSize: 22,
              fontWeight: 'bold',
              color: 'white',
              cursor: 'pointer',
              letterSpacing: 1,
              fontFamily: "'Krone One', sans-serif",
            }}
          >
            Verify & Login
          </button>
        </form>
      )}

      <p style={{ color: '#b95c6e', marginTop: 12, fontWeight: 'bold' }}>{msg}</p>
    </div>
  );
}
