import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { GardenProvider } from '@/contexts/garden-context';
import { ThemeProvider } from '@/components/theme-provider';
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
import { TasksPage } from '@/pages/tasks';
import { CalendarPage } from '@/pages/calendar';
import { SettingsPage } from '@/pages/settings';
import { AssistantPage } from '@/pages/assistant';
import { PestEventsPage } from '@/pages/pest-events';
import { SoilTestsPage } from '@/pages/soil-tests';
import { NotesPage } from '@/pages/notes';
import { SearchPage } from '@/pages/search';

export default function App() {
  return (
    <ThemeProvider>
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
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/assistant" element={<AssistantPage />} />
                <Route path="/pest-events" element={<PestEventsPage />} />
                <Route path="/soil-tests" element={<SoilTestsPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </BrowserRouter>
        </GardenProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
