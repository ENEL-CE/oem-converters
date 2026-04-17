import { useState, useRef, useEffect } from 'react';
import './LocusMapTool.css';
import { Link } from 'react-router-dom';

// Create a worker instance
import LocusMapWorker from '../workers/locusMapWorker?worker';

export default function LocusMapTool() {
    const [dragOver, setDragOver] = useState(false);
    const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState('');

    // Options
    const [optPoints, setOptPoints] = useState(true);
    const [optLines, setOptLines] = useState(true);
    const [optTexts, setOptTexts] = useState(true);

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        return () => {
            if (workerRef.current) workerRef.current.terminate();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];

        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Por favor, faça upload de um arquivo .csv');
            return;
        }

        setFilename(file.name.replace(/\.[^/.]+$/, ""));
        startProcessing(file);
    };

    const startProcessing = (file: File) => {
        setStatus('processing');
        setProgress(0);
        setMessage('PREPARING WORKER...');

        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            setObjectUrl(null);
        }

        if (workerRef.current) workerRef.current.terminate();
        workerRef.current = new LocusMapWorker();

        workerRef.current.onmessage = (e: MessageEvent) => {
            const data = e.data;
            if (data.type === 'progress') {
                setProgress(data.progress);
                setMessage(`PROCESSING ${data.progress}%`);
            } else if (data.type === 'done') {
                setProgress(100);
                setMessage('READY!');
                const url = URL.createObjectURL(data.blob);
                setObjectUrl(url);
                setStatus('done');
            } else if (data.type === 'error') {
                alert(data.message);
                setMessage('ERROR: ' + data.message);
                setStatus('error');
                setProgress(100);
                setTimeout(() => resetUi(), 2000);
            }
        };

        workerRef.current.postMessage({
            file,
            options: { points: optPoints, lines: optLines, texts: optTexts }
        });
    };

    const resetUi = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
        setStatus('idle');
        setProgress(0);
        setMessage('');
    };

    const downloadFile = () => {
        if (!objectUrl) return;
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${filename || 'output'}.scr`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="locus-wrapper">
            <main className="container">
                <header className="header">
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h1 className="logo">
                            LocusMap
                            <svg className="title-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                                <line x1="5" y1="12" x2="16" y2="12"></line>
                                <polyline points="12 6 18 12 12 18"></polyline>
                            </svg>
                            AutoCAD
                        </h1>
                    </Link>
                    <p className="subtitle">Arraste e solte o <span className="glitch">.csv</span> para processar em <span className="glitch">.scr</span></p>
                </header>

                {(status === 'idle' || status === 'error') && (
                    <div className="options-panel">
                        <label className="checkbox-label">
                            <input type="checkbox" checked={optPoints} onChange={(e) => setOptPoints(e.target.checked)} />
                            <div className="chk-box"></div>
                            <span>Gerar Pontos</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={optLines} onChange={(e) => setOptLines(e.target.checked)} />
                            <div className="chk-box"></div>
                            <span>Gerar Linhas</span>
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" checked={optTexts} onChange={(e) => setOptTexts(e.target.checked)} />
                            <div className="chk-box"></div>
                            <span>Gerar Textos</span>
                        </label>
                    </div>
                )}

                {status !== 'done' && (
                    <section
                        id="drop-zone"
                        className={`drop-zone ${dragOver ? 'dragover' : ''}`}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver(false);
                            handleFiles(e.dataTransfer.files);
                        }}
                    >
                        {(status === 'idle' || status === 'error') && (
                            <div className="drop-content">
                                <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="4" x2="12" y2="15"></line>
                                </svg>
                                <p id="drop-text">SOLTE AQUI OU CLIQUE</p>
                                <input type="file" accept=".csv" onChange={(e) => handleFiles(e.target.files)} id="csv_file" />
                            </div>
                        )}

                        {(status === 'processing' || status === 'error') && (
                            <div id="progress-container" className="progress-container">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: status === 'error' ? 'red' : 'var(--accent)' }}></div>
                                </div>
                                <p id="progress-text" style={{ color: status === 'error' ? 'red' : 'var(--accent)' }}>{message}</p>
                            </div>
                        )}
                    </section>
                )}

                {status === 'done' && (
                    <div id="action-area" className="action-area">
                        <button onClick={downloadFile} className="btn primary-btn">
                            DOWNLOAD .SCR
                        </button>
                        <button onClick={resetUi} className="btn secondary-btn">
                            CONVERTER OUTRO
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
