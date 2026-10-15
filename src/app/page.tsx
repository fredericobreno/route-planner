import AppSidebar from "@/components/app-sidebar";
import PlannerProvider from "@/components/planner-provider";
import RouteMap from "@/components/route-map";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const Home = () => (
  <PlannerProvider>
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset>
        <RouteMap />
      </SidebarInset>
    </SidebarProvider>
  </PlannerProvider>
);

export default Home;
