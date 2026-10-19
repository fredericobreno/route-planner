import AppSidebar from "@/components/app-sidebar";
import EditingBanner from "@/components/editing-banner";
import PlannerProvider from "@/components/planner-provider";
import RouteMap from "@/components/route-map";
import SummaryCard from "@/components/summary-card";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const Home = () => (
  <PlannerProvider>
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset>
        <RouteMap />
        {/* Below Leaflet's zoom control, matching its left offset. */}
        <SidebarTrigger
          variant="outline"
          className="absolute top-21 left-2.5 z-10 bg-background shadow-sm"
        />
        {/* `bottom-8` keeps Leaflet's attribution visible. */}
        <div className="pointer-events-none absolute right-3 bottom-8 z-10 flex w-72 flex-col gap-3 *:pointer-events-auto">
          <EditingBanner />
          <SummaryCard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  </PlannerProvider>
);

export default Home;
