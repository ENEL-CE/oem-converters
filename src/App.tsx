import { HashRouter, Routes, Route } from 'react-router-dom'
import Portal from './pages/Portal'
import LocusMapTool from './pages/LocusMapTool'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route path="/locusmap" element={<LocusMapTool />} />
      </Routes>
    </HashRouter>
  )
}

export default App
