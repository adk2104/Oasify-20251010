import { useState } from "react";
import { Form } from "react-router";
import { User, Settings, LogOut, Menu, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { Modal } from "~/components/ui/modal";
import { useSidebar } from "~/contexts/sidebar-context";

interface HeaderProps {
  userEmail?: string;
}

export function Header({ userEmail }: HeaderProps) {
  const displayName = userEmail?.split("@")[0] || "User";
  const { toggleSidebar } = useSidebar();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleSidebar}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="font-semibold text-lg">Oasify</div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <Sun className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-slate-900 text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-gray-500">
                  {userEmail || "user@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Form method="post" action="/dashboard">
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </button>
              </DropdownMenuItem>
            </Form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dark Mode Coming Soon Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Sun className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Dark Mode Coming Soon
          </h2>
          <p className="text-gray-600">
            Dark mode is coming in the future. For now, let's just embrace the brightness! ☀️
          </p>
          <Button
            onClick={() => setIsModalOpen(false)}
            className="w-full"
          >
            Got it!
          </Button>
        </div>
      </Modal>
    </header>
  );
}
