import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { GardenProvider } from '@/contexts/garden-context';
import { AssistantProvider } from '@/contexts/assistant-context';
import { ThemeProvider } from '@/components/theme-provider';
import { UndoRedoProvider } from '@/contexts/undo-redo-context';
import { SetupGuard } from '@/components/layout/setup-guard';
import { AppShell } from '@/components/layout/app-shell';
import { LoadingSpinner } from '@/components/loading-spinner';
import { ErrorBoundary } from '@/components/error-boundary';

// Lazy-loaded pages for code splitting
const SetupWizard = lazy(() => import('@/pages/setup-wizard').then(m => ({ default: m.SetupWizard })));
const Dashboard = lazy(() => import('@/pages/dashboard').then(m => ({ default: m.Dashboard })));
const GardenLayout = lazy(() => import('@/pages/garden-layout').then(m => ({ default: m.GardenLayout })));
const PlotDetail = lazy(() => import('@/pages/plot-detail').then(m => ({ default: m.PlotDetail })));
const PlantCatalogPage = lazy(() => import('@/pages/plant-catalog').then(m => ({ default: m.PlantCatalogPage })));
const PlantDetail = lazy(() => import('@/pages/plant-detail').then(m => ({ default: m.PlantDetail })));
const PlantInstanceDetail = lazy(() => import('@/pages/plant-instance-detail').then(m => ({ default: m.PlantInstanceDetail })));
const HarvestLog = lazy(() => import('@/pages/harvest-log').then(m => ({ default: m.HarvestLog })));
const TasksPage = lazy(() => import('@/pages/tasks').then(m => ({ default: m.TasksPage })));
const CalendarPage = lazy(() => import('@/pages/calendar').then(m => ({ default: m.CalendarPage })));
const SettingsPage = lazy(() => import('@/pages/settings').then(m => ({ default: m.SettingsPage })));
const AssistantPage = lazy(() => import('@/pages/assistant').then(m => ({ default: m.AssistantPage })));
const PestEventsPage = lazy(() => import('@/pages/pest-events').then(m => ({ default: m.PestEventsPage })));
const SoilTestsPage = lazy(() => import('@/pages/soil-tests').then(m => ({ default: m.SoilTestsPage })));
const NotesPage = lazy(() => import('@/pages/notes').then(m => ({ default: m.NotesPage })));
const SearchPage = lazy(() => import('@/pages/search').then(m => ({ default: m.SearchPage })));
const AnalyticsPage = lazy(() => import('@/pages/analytics').then(m => ({ default: m.AnalyticsPage })));
const SeedInventoryPage = lazy(() => import('@/pages/seed-inventory').then(m => ({ default: m.SeedInventoryPage })));
const HistoryPage = lazy(() => import('@/pages/history').then(m => ({ default: m.HistoryPage })));
const WeatherPage = lazy(() => import('@/pages/weather').then(m => ({ default: m.WeatherPage })));
const PestCatalogPage = lazy(() => import('@/pages/pest-catalog').then(m => ({ default: m.PestCatalogPage })));
const PestCatalogDetail = lazy(() => import('@/pages/pest-catalog-detail').then(m => ({ default: m.PestCatalogDetail })));

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <GardenProvider>
          <UndoRedoProvider>
          <AssistantProvider>
          <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
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
                <Route path="/pests" element={<PestCatalogPage />} />
                <Route path="/pests/:pestId" element={<PestCatalogDetail />} />
                <Route path="/pest-events" element={<PestEventsPage />} />
                <Route path="/soil-tests" element={<SoilTestsPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/seeds" element={<SeedInventoryPage />} />
                <Route path="/weather" element={<WeatherPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
          </BrowserRouter>
          </AssistantProvider>
          </UndoRedoProvider>
        </GardenProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
