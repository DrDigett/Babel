import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NodeDetail from './pages/NodeDetail'
import GraphView from './pages/GraphView'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/node/:id" element={<NodeDetail />} />
          <Route path="/graph" element={<GraphView />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
