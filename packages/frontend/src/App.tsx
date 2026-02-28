import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { GardenProvider } from '@/contexts/garden-context';
import { SetupGuard } from '@/components/layout/setup-guard';
import { AppShell } from '@/components/layout/app-shell';
import { SetupWizard } from '@/pages/setup-wizard';
import { Dashboard } from '@/pages/dashboard';
import { GardenLayout } from '@/pages/garden-layout';
import { PlotDetail } from '@/pages/plot-detail';
import { PlantCatalogPage } from '@/pages/plant-catalog';
import { PlantDetail } from '@/pages/plant-detail';
import { PlantInstanceDetail } from '@/pages/plant-instance-detail';
import { HarvestLog } from '@/pages/harvest-log';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GardenProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/setup" element={<SetupWizard />} />
            <Route element={<SetupGuard />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/garden" element={<GardenLayout />} />
                <Route path="/garden/plots/:plotId" element={<PlotDetail />} />
                <Route path="/catalog" element={<PlantCatalogPage />} />
                <Route path="/catalog/:plantId" element={<PlantDetail />} />
                <Route path="/plants/:instanceId" element={<PlantInstanceDetail />} />
                <Route path="/harvests" element={<HarvestLog />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </GardenProvider>
    </QueryClientProvider>
  );
}
