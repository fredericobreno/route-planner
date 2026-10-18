import { MapPinned } from "lucide-react";
import GroupingForm from "@/components/grouping-form";
import SheetImport from "@/components/sheet-import";
import {
  Sidebar,
  SidebarContent,
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
    </SidebarContent>
  </Sidebar>
);

export default AppSidebar;
