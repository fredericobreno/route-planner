import { MapPinned } from "lucide-react";
import ExportButton from "@/components/export-button";
import GroupingForm from "@/components/grouping-form";
import SheetImport from "@/components/sheet-import";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

const AppSidebar = () => (
  <Sidebar>
    <SidebarHeader className="flex-row items-center gap-2 p-4">
      <MapPinned className="size-5" />
      <h1 className="font-semibold">Route Planner</h1>
    </SidebarHeader>
    <SidebarContent>
      <SheetImport />
      <GroupingForm />
    </SidebarContent>
    <SidebarFooter className="border-t p-4">
      <ExportButton />
    </SidebarFooter>
  </Sidebar>
);

export default AppSidebar;
