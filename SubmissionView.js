import React, { useState } from 'react';
import { UploadCloud, FileType } from 'lucide-react';

function SubmissionView({ onFileUpload }) {
  const [fileName, setFileName] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      
      // Read the file content immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        onFileUpload(fileContent); // Send the HTML string up to App.js
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#0a0a0a', // Deep, rich black background
      border: '1px solid #262626', 
      borderRadius: '2px', // Sharp, tailored corners
      padding: '48px',
      maxWidth: '640px',
      margin: '0 auto',
      color: '#ffffff'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '500', letterSpacing: '-0.5px', margin: '0 0 8px 0' }}>
          Upload Response Sheet
        </h2>
        <p style={{ color: '#a3a3a3', fontSize: '15px', margin: 0 }}>
          Securely analyze your MHT CET performance.
        </p>
      </div>
      
      {/* Instructions */}
      <div style={{ 
        borderLeft: '2px solid #ffffff', 
        paddingLeft: '16px', 
        marginBottom: '32px',
        color: '#d4d4d4',
        fontSize: '14px',
        lineHeight: '1.7'
      }}>
        <ol style={{ margin: 0, paddingLeft: '16px' }}>
          <li style={{ paddingBottom: '8px' }}>Open your MHT CET response sheet in your browser.</li>
          <li style={{ paddingBottom: '8px' }}>Press <b>Ctrl + S</b> (or Cmd + S) to save the page to your computer.</li>
          <li>Ensure the format is set to <b>Webpage, HTML Only</b>.</li>
        </ol>
      </div>

      {/* Premium Upload Dropzone */}
      <div style={{
        position: 'relative',
        border: '1px dashed #404040',
        borderRadius: '2px',
        padding: '40px 20px',
        textAlign: 'center',
        backgroundColor: '#171717',
        transition: 'border-color 0.2s ease',
        cursor: 'pointer'
      }}>
        <input 
          type="file" 
          accept=".html,.htm" 
          onChange={handleFileChange}
          style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            opacity: 0,
            cursor: 'pointer'
          }}
        />
        
        {fileName ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <FileType color="#ffffff" size={32} />
            <span style={{ fontSize: '15px', fontWeight: '500', color: '#ffffff' }}>{fileName}</span>
            <span style={{ fontSize: '13px', color: '#a3a3a3' }}>File selected. Ready for analysis.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <UploadCloud color="#ffffff" size={32} strokeWidth={1.5} />
            <span style={{ fontSize: '15px', fontWeight: '500' }}>Click to browse or drag your file here</span>
            <span style={{ fontSize: '13px', color: '#737373' }}>Supports .html files only</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubmissionView;