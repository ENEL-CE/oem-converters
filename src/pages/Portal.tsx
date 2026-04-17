import { Link } from 'react-router-dom';
import './Portal.css';

export default function Portal() {
    return (
        <div className="portal-wrapper">
            <main className="portal-container">
                <header className="intro">
                    <h1>O<span>&</span>M<br />CONVERTERS</h1>
                </header>

                <section className="tools-grid">
                    <Link to="/locusmap" className="tool-card">
                        <h2>LocusMap <span>➜</span> AutoCAD</h2>
                        <p>Converta exportações .CSV do Locus Map em scripts .SCR formatados do AutoCAD com pontos, linhas e textos.</p>
                        <div className="arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
                                <line x1="5" y1="12" x2="16" y2="12"></line>
                                <polyline points="12 6 18 12 12 18"></polyline>
                            </svg>
                        </div>
                    </Link>

                    {/*
                    <div className="tool-card disabled">
                        <span className="status">02 // ENCRYPTED</span>
                        <h2>Thermal Analysis</h2>
                        <p>Upcoming module for thermal dissipation mapping and structural heat-loss conversion.</p>
                        <div className="arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                                <rect x="3" y="11" width="18" height="11" rx="0" ry="0"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                    </div>
                    */}
                </section>
            </main>
        </div>
    );
}
