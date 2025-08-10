import React, { useState } from 'react';
import axios from 'axios';

export default function Register({ onRegistered, goToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState('');

  async function startRegister(e) {
    e.preventDefault();
    setMsg('');
    try {
      const r = await axios.post('/api/register/start', { name, email, phone });
      if (r.data.ok) {
        setStep(2);
        setMsg('OTP sent to your email.');
      } else setMsg('Error: ' + (r.data.error || 'unknown'));
    } catch (err) {
      setMsg(err.response?.data?.error || 'server error');
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    try {
      const r = await axios.post('/api/register/verify', { name, email, phone, otp });
      if (r.data.ok) {
        onRegistered(r.data.user);
      } else setMsg('Error: ' + (r.data.error || 'unknown'));
    } catch (err) {
      setMsg(err.response?.data?.error || 'server error');
    }
  }

  const styles = {
    card: { backgroundColor: '#f3bbc4', width: 460, padding: 30, borderRadius: 30, textAlign: 'center', margin: 'auto', marginTop: '20vh' },
    heading: { color: '#b95c6e', fontWeight: 'bold', marginBottom: 25 },
    input: { borderRadius: 30, border: 'none', padding: '14px 20px', fontSize: 20, fontWeight: 600, color: '#c29da4', outline: 'none', backgroundColor: 'white' },
    button: { backgroundColor: '#b95c6e', borderRadius: 30, border: 'none', padding: '14px 20px', fontSize: 22, fontWeight: 'bold', color: 'white', cursor: 'pointer' },
    smallText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
    loginLink: { background: 'none', border: 'none', color: '#b95c6e', cursor: 'pointer', fontWeight: 'bold', fontSize: 18, padding: 0 },
    msg: { color: '#b95c6e', marginTop: 12, fontWeight: 'bold' }
  };

  return (
    <div style={styles.card}>
      <h1 style={styles.heading}>REGISTER</h1>

      {step === 1 && (
        <form onSubmit={startRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input style={styles.input} placeholder="Name :" value={name} onChange={e => setName(e.target.value)} required />
          <input style={styles.input} placeholder="Email :" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} placeholder="Phone :" value={phone} onChange={e => setPhone(e.target.value)} required />
          <button style={styles.button} type="submit">Send Otp</button>
          <p style={styles.smallText}>
            Already a User?{' '}
            <button type="button" onClick={goToLogin} style={styles.loginLink}>
              Login
            </button>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input style={styles.input} placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} required />
          <button style={styles.button} type="submit">Verify & Register</button>
        </form>
      )}

      <p style={styles.msg}>{msg}</p>
    </div>
  );
}
