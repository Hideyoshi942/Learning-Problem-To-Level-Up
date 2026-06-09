import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import LevelPage from './pages/LevelPage'
import TopicPage from './pages/TopicPage'
import RoadmapPage from './pages/RoadmapPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="level/:levelId" element={<LevelPage />} />
        <Route path="level/:levelId/topic/:topicSlug" element={<TopicPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
