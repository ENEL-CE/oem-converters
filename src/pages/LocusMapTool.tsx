import React, { useState } from 'react';
import './LocusMapTool.css';
import { Link } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RowData {
    id: string;
    name: string;
    lat: string;
    lon: string;
    time: string;
    desc: string;
    utm_e: string;
    utm_n: string;
}

// Sortable Row Component
function SortableTableRow({ row, isSelected, onClick, onNameChange, onDescChange }: { row: RowData, isSelected: boolean, onClick: (e: React.MouseEvent, id: string) => void, onNameChange: (id: string, newName: string) => void, onDescChange: (id: string, newDesc: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: row.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        position: 'relative' as const,
        opacity: isDragging ? 0.8 : 1,
        backgroundColor: isSelected ? 'rgba(255, 69, 0, 0.2)' : (isDragging ? 'rgba(255, 69, 0, 0.1)' : undefined),
    };

    const handleInputResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = "auto";
        target.style.height = target.scrollHeight + "px";
    };

    return (
        <tr ref={setNodeRef} style={style} className="table-row" onClick={(e) => onClick(e, row.id)}>
            <td className="drag-handle" {...attributes} {...listeners}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
            </td>
            <td>
                <textarea
                    className="name-input"
                    value={row.name}
                    onChange={(e) => onNameChange(row.id, e.target.value)}
                    onInput={handleInputResize}
                    rows={1}
                />
            </td>
            <td>{row.lat}</td>
            <td>{row.lon}</td>
            <td>{row.time}</td>
            <td>
                <textarea
                    className="name-input"
                    value={row.desc}
                    onChange={(e) => onDescChange(row.id, e.target.value)}
                    onInput={handleInputResize}
                    rows={1}
                />
            </td>
            <td>{row.utm_e}</td>
            <td>{row.utm_n}</td>
        </tr>
    );
}

export default function LocusMapTool() {
    const [dragOver, setDragOver] = useState(false);
    const [status, setStatus] = useState<'idle' | 'editing' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [filename, setFilename] = useState('');

    // Data state
    const [tableData, setTableData] = useState<RowData[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Options
    const [optPoints, setOptPoints] = useState(true);
    const [optLines, setOptLines] = useState(true);
    const [optTexts, setOptTexts] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];

        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Por favor, faça upload de um arquivo .csv');
            return;
        }

        setFilename(file.name.replace(/\.[^/.]+$/, ""));
        await parseCSV(file);
    };

    const parseCSV = async (file: File) => {
        try {
            const text = await file.text();
            const lines = text.split('\n');
            const dataArr: RowData[] = [];

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                if (line.startsWith('"name"') || line.startsWith('name,')) {
                    if (!line.includes('custom_coords')) {
                        setMessage('ERROR: CSV não contém coordenadas UTM');
                        setStatus('error');
                        return;
                    }
                    continue;
                }

                let parts = line.split('","');
                if (parts.length < 9) continue;

                parts[0] = parts[0].replace(/^"/, '');
                parts[parts.length - 1] = parts[parts.length - 1].replace(/"$/, '');

                const name = parts[0];
                const lat = parts[1];
                const lon = parts[2];
                const time = parts[5];
                const desc = parts[6];
                const custom_coords = parts[8];

                const ccParts = custom_coords.split(" ");
                if (ccParts.length < 3) continue;
                const utm_e = ccParts[1];
                const utm_n = ccParts[2];

                dataArr.push({
                    id: crypto.randomUUID(),
                    name, lat, lon, time, desc, utm_e, utm_n
                });
            }

            if (dataArr.length === 0) {
                setMessage('ERROR: CSV vazio ou formato inválido');
                setStatus('error');
                return;
            }

            setTableData(dataArr);
            setStatus('editing');
            setMessage('');
        } catch (error) {
            setMessage('ERROR: Falha ao ler o arquivo');
            setStatus('error');
        }
    };

    const handleRowClick = (e: React.MouseEvent, id: string) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') {
            return;
        }
        if (e.ctrlKey || e.metaKey) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
            setSelectedIds([id]);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setTableData((items) => {
                const activeId = active.id as string;
                const overId = over.id as string;

                const isMultiDrag = selectedIds.includes(activeId) && selectedIds.length > 1;

                if (!isMultiDrag) {
                    const oldIndex = items.findIndex((item) => item.id === activeId);
                    const newIndex = items.findIndex((item) => item.id === overId);
                    return arrayMove(items, oldIndex, newIndex);
                } else {
                    if (selectedIds.includes(overId)) return items;

                    const selectedItems = items.filter(item => selectedIds.includes(item.id));
                    const remainingItems = items.filter(item => !selectedIds.includes(item.id));

                    const targetIndex = remainingItems.findIndex(item => item.id === overId);
                    const originalActiveIndex = items.findIndex(item => item.id === activeId);
                    const originalOverIndex = items.findIndex(item => item.id === overId);

                    const insertIndex = originalOverIndex > originalActiveIndex ? targetIndex + 1 : targetIndex;
                    remainingItems.splice(insertIndex, 0, ...selectedItems);
                    return remainingItems;
                }
            });
        }
    };

    const handleNameChange = (id: string, newName: string) => {
        setTableData(prev => prev.map(row =>
            row.id === id ? { ...row, name: newName } : row
        ));
    };

    const handleDescChange = (id: string, newDesc: string) => {
        setTableData(prev => prev.map(row =>
            row.id === id ? { ...row, desc: newDesc } : row
        ));
    };

    const resetUi = () => {
        setStatus('idle');
        setTableData([]);
        setSelectedIds([]);
        setMessage('');
        setFilename('');
    };

    const downloadFile = () => {
        const scrParts: string[] = [];
        scrParts.push("_Osmode 0\n_PDMODE\n65\n_PDSIZE\n3\n");

        if (optPoints) {
            for (const point of tableData) {
                scrParts.push(`_Point ${point.utm_e},${point.utm_n},0\n`);
            }
        }

        if (optLines) {
            for (let i = 0; i < tableData.length - 1; i++) {
                const current = tableData[i];
                const next = tableData[i + 1];
                scrParts.push(`_Line\n${current.utm_e},${current.utm_n}\n${next.utm_e},${next.utm_n}\n\n`);
            }
        }

        if (optTexts) {
            for (const point of tableData) {
                const nameStr = point.name.replace(/\n/g, '\\P');
                const descStr = point.desc.replace(/\n/g, '\\P');
                scrParts.push(`_mtext ${point.utm_e},${point.utm_n} 0 ${nameStr}\n(0${point.utm_e},${point.utm_n})\n\\C2;${descStr}\n\n`);
            }
        }

        scrParts.push("_Osmode 16383\n");

        const blob = new Blob(scrParts, { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename || 'output'}.scr`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    };

    return (
        <div className="locus-wrapper">
            <main className="container" style={{ maxWidth: '1200px' }}>
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

                <div className="table-container">
                    <div className="table-header-info">
                        <h3>{tableData.length > 0 ? 'Ajuste os pontos antes de gerar' : 'Aguardando dados...'}</h3>
                        <p>{tableData.length} pontos encontrados</p>
                    </div>

                    <div className="table-scroll-area">
                        <table className="locus-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th>
                                    <th>Name</th>
                                    <th>Lat</th>
                                    <th>Lon</th>
                                    <th>Time</th>
                                    <th>Desc</th>
                                    <th>UTM E</th>
                                    <th>UTM N</th>
                                </tr>
                            </thead>
                            <tbody>
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={tableData.map(d => d.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {tableData.map(row => (
                                            <SortableTableRow
                                                key={row.id}
                                                row={row}
                                                isSelected={selectedIds.includes(row.id)}
                                                onClick={handleRowClick}
                                                onNameChange={handleNameChange}
                                                onDescChange={handleDescChange}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            </tbody>
                        </table>
                    </div>

                    {(status === 'idle' || status === 'error') && (
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
                            <div className="drop-content">
                                <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="4" x2="12" y2="15"></line>
                                </svg>
                                <p id="drop-text">SOLTE AQUI OU CLIQUE</p>
                                <input type="file" accept=".csv" onChange={(e) => handleFiles(e.target.files)} id="csv_file" />
                            </div>
                            {status === 'error' && (
                                <p style={{ color: '#ff4500', marginTop: '1rem', fontWeight: 'bold' }}>{message}</p>
                            )}
                        </section>
                    )}

                    <div id="action-area" className="action-area" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'row', gap: '1rem' }}>
                        <button onClick={downloadFile} className="btn primary-btn" style={{ flex: '1 1 0%', opacity: tableData.length === 0 ? 0.5 : 1, pointerEvents: tableData.length === 0 ? 'none' : 'auto' }} disabled={tableData.length === 0}>
                            GERAR .SCR
                        </button>
                        <button onClick={resetUi} className="btn secondary-btn" style={{ flex: '1 1 0%' }}>
                            LIMPAR / CANCELAR
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
