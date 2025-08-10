import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard({ user, onLogout }) {
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdfId, setSelectedPdfId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPdfs();
  }, []);

  useEffect(() => {
    if (selectedPdfId) {
      fetchConversations(selectedPdfId);
    } else {
      setConversations([]);
    }
  }, [selectedPdfId]);

  async function fetchPdfs() {
    try {
      const r = await axios.get('/api/my-pdfs');
      if (r.data.ok) {
        setPdfs(r.data.pdfs);
        if (r.data.pdfs.length > 0) setSelectedPdfId(r.data.pdfs[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchConversations(pdfId) {
    try {
      const r = await axios.get('/api/conversations');
      if (r.data.ok) {
        const filtered = r.data.convs.filter(c => c.pdfId === pdfId);
        setConversations(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    const fileInput = e.target.elements.pdfFile;
    if (!fileInput.files[0]) return alert('Select a PDF first');

    const form = new FormData();
    form.append('pdf', fileInput.files[0]);
    setLoading(true);
    try {
      const r = await axios.post('/api/upload-pdf', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (r.data.ok) {
        await fetchPdfs();
        alert('Uploaded successfully');
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'server error');
    } finally {
      setLoading(false);
    }
  }

  async function askQuestion(e) {
    e.preventDefault();
    if (!selectedPdfId) return alert('Please select a PDF first');
    if (!question.trim()) return alert('Please enter a question');

    setLoading(true);
    try {
      const r = await axios.post('/api/ask', { pdfId: selectedPdfId, question });
      if (r.data.ok) {
        setConversations(prev => [
          { question, answer: r.data.answer, createdAt: new Date().toISOString(), pdfId: selectedPdfId },
          ...prev,
        ]);
        setQuestion('');
      } else {
        alert('Error: ' + (r.data.error || 'Unknown error'));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'server error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="dashboard"
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.39)',
fontFamily: "'Krone One', sans-serif"

      }}
    >
      <header
        className="header"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: '#D6536D',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          fontWeight: '600',
          fontSize: '1.5rem',
          zIndex: 1000,
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
        }}
      >
        <div>Internship task</div>
        <button
          onClick={onLogout}
          style={{
            backgroundColor: '#FFFFFF',
            color: '#000000',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 16px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Logout
        </button>
      </header>

      <aside
        className="left"
        style={{
          width: '260px',
          padding: '80px 1.5rem 1.5rem 1.5rem',
          background: 'linear-gradient(180deg, #D6536D 0%, #FFA2B6 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          borderTopRightRadius: '12px',
          borderBottomRightRadius: '12px',
        }}
      >
        <h3 style={{ margin: 0, fontWeight: '700', fontSize: '1.25rem' }}>Upload PDF</h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <input
            type="file"
            name="pdfFile"
            accept="application/pdf"
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#FFA2B6',
              color: '#D6536D',
              border: 'none',
              borderRadius: '20px',
              padding: '0.6rem',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '1rem',
              boxShadow: '0 2px 5px rgba(255, 162, 182, 0.6)',
              transition: 'background-color 0.3s ease',
            }}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        <h4 style={{ margin: '1rem 0 0 0', fontWeight: '600' }}>Your PDFs</h4>
        <ul
          className="pdf-list"
          style={{
            listStyle: 'none',
            padding: 0,
            overflowY: 'auto',
            flexGrow: 1,
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            boxShadow: 'inset 0 0 6px rgba(255,255,255,0.3)',
          }}
        >
          {pdfs.map(pdf => (
            <li
              key={pdf._id}
              onClick={() => setSelectedPdfId(pdf._id)}
              style={{
                cursor: 'pointer',
                backgroundColor: pdf._id === selectedPdfId ? 'rgba(255, 255, 255, 0.4)' : 'transparent',
                padding: '0.75rem',
                marginBottom: '0.25rem',
                borderRadius: '6px',
                fontWeight: pdf._id === selectedPdfId ? '700' : '400',
                color: pdf._id === selectedPdfId ? '#D6536D' : 'white',
                boxShadow: pdf._id === selectedPdfId ? '0 0 10px rgba(214, 83, 109, 0.6)' : 'none',
                transition: 'background-color 0.3s ease',
              }}
            >
              {pdf.originalName}
            </li>
          ))}
        </ul>
      </aside>

      <main
        className="center"
        style={{
          flex: 1,
          padding: '80px 2rem 2rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          borderTopLeftRadius: '12px',
          borderBottomLeftRadius: '12px',
          boxShadow: '0 0 20px rgba(214, 83, 109, 0.15)',
        }}
      >
        <h3
          style={{
            color: '#D6536D',
            fontWeight: '700',
            marginBottom: '1rem',
            fontSize: '1.5rem',
          }}
        >
          Chat (PDF Q&A)
        </h3>

        <div
          className="messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1.5px solid #FFA2B6',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '12px',
            backgroundColor: '#fff7f9',
            boxShadow: 'inset 0 0 10px rgba(255, 162, 182, 0.4)',
          }}
        >
          {conversations.length === 0 && (
            <p style={{ color: '#D6536D', fontWeight: '500' }}>No conversations for this PDF yet. Ask a question!</p>
          )}
          {conversations.map((c, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '1rem',
                borderBottom: '1px solid #FFC1C8',
                paddingBottom: '0.5rem',
                color: '#A83249',
              }}
            >
              <div>
                <strong>Q:</strong> {c.question}
              </div>
              <div style={{ marginTop: '0.2rem' }}>
                <strong>A:</strong> {c.answer}
              </div>
              <small style={{ color: '#D6536D', opacity: 0.7 }}>{new Date(c.createdAt).toLocaleString()}</small>
            </div>
          ))}
        </div>

        <form onSubmit={askQuestion} style={{ display: 'flex', gap: '0.8rem' }}>
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask a question about the PDF..."
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '25px',
              border: '2px solid #D6536D',
              fontSize: '1rem',
              outline: 'none',
              color: '#D6536D',
              fontWeight: '600',
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            style={{
              backgroundColor: '#D6536D',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              padding: '0 2rem',
              fontWeight: '700',
              fontSize: '1.1rem',
              cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
              boxShadow: loading || !question.trim() ? 'none' : '0 4px 8px rgba(214, 83, 109, 0.6)',
              transition: 'background-color 0.3s ease',
            }}
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>
      </main>
    </div>
  );
}
