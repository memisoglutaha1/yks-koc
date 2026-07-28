import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { DashboardPage } from './pages/DashboardPage'
import { KonularPage } from './pages/KonularPage'
import { TestPage } from './pages/TestPage'
import { ProgramPage } from './pages/ProgramPage'
import { DenemelerPage } from './pages/DenemelerPage'
import { RaporPage } from './pages/RaporPage'
import { OtomatikPlanPage } from './pages/OtomatikPlanPage'
import { AyarlarPage } from './pages/AyarlarPage'
import { ProfilPage } from './pages/ProfilPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/konular" element={<KonularPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/program" element={<ProgramPage />} />
          <Route path="/plan" element={<OtomatikPlanPage />} />
          <Route path="/denemeler" element={<DenemelerPage />} />
          <Route path="/rapor" element={<RaporPage />} />
          <Route path="/gunluk-rapor" element={<RaporPage />} />
          <Route path="/profil" element={<ProfilPage />} />
          <Route path="/ayarlar" element={<AyarlarPage />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
