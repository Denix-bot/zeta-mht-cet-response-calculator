import React, { useState } from 'react';
import { parseResponseSheet } from './utils/parser';
import { UploadCloud, CheckCircle, XCircle, AlertTriangle, Download, TrendingUp, Target, BarChart2, Award, Calendar } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Sync PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ZETA Light Executive Theme
const THEME = {
  bg: '#F5F1EB',
  surface: '#FFFFFF',
  border: '#E0DCD3',
  gold: '#B8956A',
  textMain: '#2D2D2D',
  textMuted: '#6B6B6B',
  success: '#2E7D32',
  error: '#C62828'
};

const SerifText = ({ children, style }) => (
  <span style={{ fontFamily: '"Playfair Display", "Georgia", serif', ...style }}>
    {children}
  </span>
);

// --- 2026 SHIFT CALENDAR & NORMALIZATION MATRIX --- //
// Excluding: April 12 (Sunday), April 14 (Ambedkar Jayanti), April 19 (Sunday)
const SHIFTS_2026 = [
  { id: '11_1', label: '11 April - Shift 1 (Morning)', diffOffset: 1.2 },  // Moderate-Hard
  { id: '11_2', label: '11 April - Shift 2 (Afternoon)', diffOffset: -0.5 },// Easy
  { id: '13_1', label: '13 April - Shift 1 (Morning)', diffOffset: 0.0 },   // Baseline
  { id: '13_2', label: '13 April - Shift 2 (Afternoon)', diffOffset: 2.1 }, // Hard
  { id: '15_1', label: '15 April - Shift 1 (Morning)', diffOffset: -1.2 },  // Very Easy
  { id: '15_2', label: '15 April - Shift 2 (Afternoon)', diffOffset: 0.8 }, // Moderate
  { id: '16_1', label: '16 April - Shift 1 (Morning)', diffOffset: -0.2 },  // Moderate
  { id: '16_2', label: '16 April - Shift 2 (Afternoon)', diffOffset: 1.5 }, // Hard
  { id: '17_1', label: '17 April - Shift 1 (Morning)', diffOffset: 0.5 },   // Moderate
  { id: '17_2', label: '17 April - Shift 2 (Afternoon)', diffOffset: -0.8 },// Easy
  { id: '18_1', label: '18 April - Shift 1 (Morning)', diffOffset: 2.5 },   // Toughest Shift
  { id: '18_2', label: '18 April - Shift 2 (Afternoon)', diffOffset: 0.0 }, // Baseline
  { id: '20_1', label: '20 April - Shift 1 (Morning)', diffOffset: -1.0 },  // Easy
  { id: '20_2', label: '20 April - Shift 2 (Afternoon)', diffOffset: 1.0 }  // Moderate-Hard
];

// Percentile Calculation with Shift Normalization
const predictTotalPercentile = (score, shiftOffset) => {
  // Apply shift difficulty offset to the raw score to get a "Normalized Score"
  const normalizedScore = score + shiftOffset;
  
  if (normalizedScore >= 165) return 99.91;
  if (normalizedScore >= 145) return 99.45 + ((normalizedScore - 145) * 0.02);
  if (normalizedScore >= 125) return 98.00 + ((normalizedScore - 125) * 0.07);
  if (normalizedScore >= 105) return 95.50 + ((normalizedScore - 105) * 0.12);
  if (normalizedScore >= 85)  return 90.00 + ((normalizedScore - 85) * 0.25);
  if (normalizedScore >= 65)  return 80.00 + ((normalizedScore - 65) * 0.50);
  if (normalizedScore >= 45)  return 60.00 + ((normalizedScore - 45) * 1.00);
  
  const minPercentile = Math.max(5, normalizedScore * 1.2);
  return minPercentile; 
};

// Rank Prediction based on expected 3.2 Lakh Candidates
const predictRank = (percentile) => {
  const TOTAL_CANDIDATES = 320000; 
  const rank = Math.round(((100 - percentile) / 100) * TOTAL_CANDIDATES);
  return rank < 1 ? 1 : rank.toLocaleString('en-IN');
};

const predictSubjectPercentile = (subject, marks, shiftOffset) => {
  // Apply 1/3rd of the overall shift offset to individual subjects
  const normMarks = marks + (shiftOffset / 3);
  let p = 0;
  
  if (subject === 'math') {
    if (normMarks >= 85) p = 99.5 + (normMarks-85)*0.03;
    else if (normMarks >= 70) p = 97.0 + (normMarks-70)*0.15;
    else if (normMarks >= 50) p = 90.0 + (normMarks-50)*0.35;
    else p = normMarks * 1.5;
  } else {
    // Physics & Chemistry (out of 50)
    if (normMarks >= 42) p = 99.5 + (normMarks-42)*0.06;
    else if (normMarks >= 35) p = 97.0 + (normMarks-35)*0.35;
    else if (normMarks >= 25) p = 90.0 + (normMarks-25)*0.70;
    else p = normMarks * 2.5;
  }
  return Math.min(99.99, Math.max(5, p)).toFixed(2);
};
// -------------------------------------------------- //

function App() {
  const [selectedShift, setSelectedShift] = useState('13_1'); // Default baseline
  const [hasCalculated, setHasCalculated] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [finalScores, setFinalScores] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + ' ';
      }
      return fullText;
    } catch (error) {
      console.error("PDF Parsing Error:", error);
      return "";
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setHasError(false);

    let content = "";
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      content = await extractTextFromPDF(file);
    } else {
      const reader = new FileReader();
      content = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });
    }

    const results = parseResponseSheet(content);
    setIsProcessing(false);

    if (results.totalParsedQuestions === 0) {
      setHasError(true);
    } else {
      // Find the shift offset based on user selection
      const shiftData = SHIFTS_2026.find(s => s.id === selectedShift);
      const offset = shiftData ? shiftData.diffOffset : 0;

      // Inject Shift-Normalized predictions into the results object
      results.overallPercentile = Math.min(99.99, predictTotalPercentile(results.total, offset)).toFixed(2);
      results.predictedRank = predictRank(results.overallPercentile);
      results.math.percentile = predictSubjectPercentile('math', results.math.marks, offset);
      results.physics.percentile = predictSubjectPercentile('physics', results.physics.marks, offset);
      results.chemistry.percentile = predictSubjectPercentile('chemistry', results.chemistry.marks, offset);
      results.shiftLabel = shiftData.label; // Pass label to dashboard
      
      setFinalScores(results);
      setHasCalculated(true);
    }
  };

  const resetApp = () => {
    setHasCalculated(false);
    setHasError(false);
    setFinalScores(null);
  };

  const calculateAccuracy = (correct, incorrect) => {
    const attempted = correct + incorrect;
    if (attempted === 0) return 0;
    return ((correct / attempted) * 100).toFixed(1);
  };

  return (
    <>
      <style>{`
        @media print {
          body { background-color: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .print-container { padding: 0 !important; max-width: 100% !important; }
          .card { border: 1px solid #ccc !important; box-shadow: none !important; break-inside: avoid; }
        }
        select:focus { outline: 2px solid ${THEME.gold}; border-color: ${THEME.gold}; }
      `}</style>

      <div className="print-container" style={{ 
        backgroundColor: THEME.bg, 
        minHeight: '100vh', 
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        color: THEME.textMain,
        padding: '40px 20px'
      }}>
        
        <header style={{ maxWidth: '1000px', margin: '0 auto 40px auto', paddingBottom: '20px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '28px', letterSpacing: '1px' }}>
            <SerifText style={{ color: THEME.textMain, fontWeight: '700' }}>ZETA <span style={{ color: THEME.gold, fontWeight: '400' }}>Predictor</span></SerifText>
          </h1>
          <div className="no-print" style={{ fontSize: '13px', fontWeight: '500', color: THEME.textMuted, letterSpacing: '1px' }}>
            MHT CET 2026 Session
          </div>
        </header>

        <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {hasError ? (
            <div className="card no-print" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.error}`, borderRadius: '6px', padding: '40px', textAlign: 'center' }}>
              <AlertTriangle color={THEME.error} size={42} style={{ marginBottom: '16px', margin: '0 auto' }} />
              <h2 style={{ color: THEME.error, marginBottom: '8px', fontSize: '20px' }}>Invalid Document</h2>
              <p style={{ color: THEME.textMuted, fontSize: '14px', marginBottom: '24px' }}>We could not extract the standard response format.</p>
              <button onClick={resetApp} style={{ backgroundColor: THEME.surface, color: THEME.textMain, border: `1px solid ${THEME.border}`, padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Try Again</button>
            </div>

          ) : !hasCalculated ? (
            <div className="card" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '8px', padding: '60px 40px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '400', marginBottom: '12px', color: THEME.textMain }}>
                <SerifText>Analyze Your Response Sheet</SerifText>
              </h2>
              <p style={{ color: THEME.textMuted, fontSize: '15px', marginBottom: '40px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                Select your exact exam shift for accurate normalization, then upload your document to generate your scorecard.
              </p>

              {/* Shift Selection UI */}
              <div style={{ marginBottom: '30px', textAlign: 'left', maxWidth: '600px', margin: '0 auto 30px auto' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: THEME.textMain, marginBottom: '10px' }}>
                  <Calendar size={18} color={THEME.gold} /> Select Exam Date & Shift
                </label>
                <select 
                  value={selectedShift} 
                  onChange={(e) => setSelectedShift(e.target.value)}
                  style={{ 
                    width: '100%', padding: '14px 16px', borderRadius: '6px', 
                    border: `1px solid ${THEME.border}`, backgroundColor: '#FAFAFA', 
                    fontSize: '15px', color: THEME.textMain, cursor: 'pointer',
                    appearance: 'none'
                  }}
                >
                  {SHIFTS_2026.map(shift => (
                    <option key={shift.id} value={shift.id}>{shift.label}</option>
                  ))}
                </select>
              </div>

              {/* Upload Box */}
              <div style={{ position: 'relative', border: `2px dashed ${THEME.gold}`, borderRadius: '8px', backgroundColor: '#FAF8F5', padding: '50px 20px', maxWidth: '600px', margin: '0 auto', cursor: 'pointer' }}>
                <input type="file" accept=".html,.htm,.pdf" onChange={handleFileUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                <UploadCloud color={THEME.gold} size={48} style={{ marginBottom: '16px' }} />
                <div style={{ fontSize: '16px', color: THEME.textMain, fontWeight: '600', marginBottom: '8px' }}>
                  {isProcessing ? "Processing Data & Applying Normalization..." : "Click to browse or drag file here"}
                </div>
              </div>
            </div>

          ) : (
            <div className="dashboard-content">
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <button onClick={resetApp} style={{ backgroundColor: 'transparent', color: THEME.textMuted, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 }}>← Upload New Sheet</button>
                <button onClick={() => window.print()} style={{ backgroundColor: THEME.gold, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> DOWNLOAD SCORECARD
                </button>
              </div>

              {/* Shift Reminder Tag */}
              <div style={{ backgroundColor: '#FAF8F5', borderLeft: `4px solid ${THEME.gold}`, padding: '12px 20px', marginBottom: '24px', borderRadius: '0 6px 6px 0', fontSize: '14px', color: THEME.textMain }}>
                Normalized against <strong>{finalScores.shiftLabel}</strong> data matrices.
              </div>

              {/* Advanced KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                
                <div className="card" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '8px', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: THEME.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    <BarChart2 size={16} color={THEME.gold} /> Raw Score
                  </div>
                  <div style={{ fontSize: '48px', color: THEME.textMain, lineHeight: '1', fontWeight: '300' }}>
                    {finalScores.total} <span style={{ fontSize: '16px', color: THEME.textMuted }}>/ 200</span>
                  </div>
                </div>

                <div className="card" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.gold}`, borderRadius: '8px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: THEME.gold, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    <TrendingUp size={16} /> Est. Percentile (Normalized)
                  </div>
                  <div style={{ fontSize: '48px', color: THEME.textMain, lineHeight: '1', fontWeight: '600' }}>
                    {finalScores.overallPercentile} <span style={{ fontSize: '16px', color: THEME.textMuted, fontWeight: '400' }}>%ile</span>
                  </div>
                </div>

                <div className="card" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '8px', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: THEME.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    <Award size={16} color={THEME.gold} /> Expected State Rank
                  </div>
                  <div style={{ fontSize: '48px', color: THEME.textMain, lineHeight: '1', fontWeight: '600' }}>
                    {finalScores.predictedRank}
                  </div>
                </div>

              </div>

              {/* Analytical Subject Table with Subject-Wise Percentiles */}
              <div className="card" style={{ backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${THEME.border}`, backgroundColor: '#FAFAFA' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: THEME.textMain }}>Detailed Subject Analysis & Percentiles</h3>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${THEME.border}`, color: THEME.textMuted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '16px 24px', fontWeight: '600' }}>Subject</th>
                        <th style={{ padding: '16px 24px', fontWeight: '600' }}>Correct</th>
                        <th style={{ padding: '16px 24px', fontWeight: '600' }}>Incorrect</th>
                        <th style={{ padding: '16px 24px', fontWeight: '600' }}>Accuracy</th>
                        <th style={{ padding: '16px 24px', fontWeight: '700', color: THEME.textMain }}>Raw Marks</th>
                        <th style={{ padding: '16px 24px', fontWeight: '700', color: THEME.gold }}>Predicted %ile</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '14px' }}>
                      {[
                        { title: 'Mathematics', data: finalScores.math, max: 100 },
                        { title: 'Physics', data: finalScores.physics, max: 50 },
                        { title: 'Chemistry', data: finalScores.chemistry, max: 50 }
                      ].map((sub, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                          <td style={{ padding: '20px 24px', fontWeight: '600', color: THEME.textMain }}>{sub.title}</td>
                          <td style={{ padding: '20px 24px', color: THEME.success, fontWeight: '500' }}>{sub.data.correct}</td>
                          <td style={{ padding: '20px 24px', color: THEME.error, fontWeight: '500' }}>{sub.data.incorrect}</td>
                          <td style={{ padding: '20px 24px', color: THEME.textMuted }}>{calculateAccuracy(sub.data.correct, sub.data.incorrect)}%</td>
                          <td style={{ padding: '20px 24px', fontWeight: '700', fontSize: '16px', color: THEME.textMain }}>
                            {sub.data.marks} <span style={{ fontSize: '12px', color: THEME.textMuted, fontWeight: '400' }}>/ {sub.max}</span>
                          </td>
                          <td style={{ padding: '20px 24px', fontWeight: '700', fontSize: '16px', color: THEME.gold }}>
                            {sub.data.percentile}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;