import AppSidebar from "@/components/app-sidebar";
import RouteMap from "@/components/route-map";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const Home = () => (
  <SidebarProvider className="h-svh overflow-hidden">
    <AppSidebar />
    <SidebarInset>
      <RouteMap />
    </SidebarInset>
  </SidebarProvider>
);

export default Home;
