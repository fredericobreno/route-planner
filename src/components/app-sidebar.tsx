import { MapPinned } from "lucide-react";
import EditingBanner from "@/components/editing-banner";
import ExportButton from "@/components/export-button";
import GroupingForm from "@/components/grouping-form";
import SheetImport from "@/components/sheet-import";
import SummaryCard from "@/components/summary-card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

const AppSidebar = () => (
  <Sidebar collapsible="none" className="border-r">
    <SidebarHeader className="flex-row items-center gap-2 p-4">
      <MapPinned className="size-5" />
      <h1 className="font-semibold">Route Planner</h1>
    </SidebarHeader>
    <SidebarContent>
      <SheetImport />
      <GroupingForm />
      <EditingBanner />
      <SummaryCard />
    </SidebarContent>
    <SidebarFooter className="border-t p-4">
      <ExportButton />
    </SidebarFooter>
  </Sidebar>
);

export default AppSidebar;
