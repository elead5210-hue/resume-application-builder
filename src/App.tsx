import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/shared/ui/AppLayout'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'
import { ResumePage } from '@/features/resume'
import { StylesPage } from '@/features/styles'
import { RenderPage } from '@/features/render'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="resume" element={<ResumePage />} />
        <Route path="styles" element={<StylesPage />} />
        <Route path="render" element={<RenderPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}