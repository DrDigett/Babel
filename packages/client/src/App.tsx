import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import Dashboard from './pages/Dashboard'
import NodeDetail from './pages/NodeDetail'
import GraphView from './pages/GraphView'
import ImportExport from './pages/ImportExport'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/graph" element={<Layout><GraphView /></Layout>} />
        <Route path="/node/:id" element={<Layout><NodeDetail /></Layout>} />
        <Route path="/data" element={<Layout><ImportExport /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}