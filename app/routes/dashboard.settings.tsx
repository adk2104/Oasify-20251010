import { useState } from "react";
import { useFetcher, useOutletContext } from "react-router";
import type { Route } from "./+types/dashboard.settings";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { getSession } from "~/sessions.server";
import { db } from "~/db/config";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";

type OutletContextType = {
  userSettings: {
    hideOriginalToggle: boolean;
  };
};

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;
  
  const userSettings = await db
    .select({ hideOriginalToggle: users.hideOriginalToggle })
    .from(users)
    .where(eq(users.id, userId))
    .then(rows => rows[0] || { hideOriginalToggle: false });
  
  return { userSettings };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  const userId = session.get('userId') as number;
  const formData = await request.formData();
  const intent = formData.get('intent');
  
  if (intent === 'updateHideOriginalToggle') {
    const hideOriginalToggle = formData.get('hideOriginalToggle') === 'true';
    
    await db
      .update(users)
      .set({ hideOriginalToggle, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return { success: true, setting: 'hideOriginalToggle' };
  }
  
  return { success: false };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { userSettings } = loaderData;
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const deleteFetcher = useFetcher();
  const settingsFetcher = useFetcher();
  const isDeleting = deleteFetcher.state !== "idle";
  
  // Local state for toggle (optimistic UI)
  const [hideOriginalToggle, setHideOriginalToggle] = useState(userSettings.hideOriginalToggle);
  
  const handleToggleHideOriginal = (checked: boolean) => {
    setHideOriginalToggle(checked);
    settingsFetcher.submit(
      { intent: 'updateHideOriginalToggle', hideOriginalToggle: String(checked) },
      { method: 'POST' }
    );
  };

  const handleDeleteClick = (platform: string) => {
    if (deleteConfirm === platform) {
      // Second click - actually delete
      deleteFetcher.submit(
        { platform },
        { method: "POST", action: "/api/comments/delete" }
      );
      setDeleteConfirm(null);
    } else {
      // First click - show confirmation
      setDeleteConfirm(platform);
      // Auto-reset after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your data and preferences
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {/* Comment Display Preferences */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">Comment Display</h2>
              <p className="text-sm text-gray-500 mb-6">
                Customize how comments are displayed in your inbox.
              </p>

              {settingsFetcher.data?.success && settingsFetcher.data?.setting === 'hideOriginalToggle' && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    Setting saved successfully.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">Hide "Show Original" Toggle</h3>
                  <p className="text-sm text-gray-500">
                    When enabled, the toggle to view original comments will be hidden. 
                    You'll only see the empathic translations, protecting your peace of mind.
                  </p>
                </div>
                <Switch
                  checked={hideOriginalToggle}
                  onCheckedChange={handleToggleHideOriginal}
                  disabled={settingsFetcher.state !== 'idle'}
                />
              </div>
            </div>

            {/* Delete Comments Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">Delete Comments</h2>
              <p className="text-sm text-gray-500 mb-6">
                Remove synced comments from your database. This action cannot be undone.
              </p>

              {deleteFetcher.data?.success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    Comments deleted successfully.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {/* Delete YouTube Comments */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium">YouTube Comments</h3>
                    <p className="text-sm text-gray-500">Delete all synced YouTube comments</p>
                  </div>
                  <Button
                    variant={deleteConfirm === "youtube" ? "default" : "outline"}
                    onClick={() => handleDeleteClick("youtube")}
                    disabled={isDeleting}
                    className={deleteConfirm === "youtube" ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    {isDeleting && deleteConfirm === "youtube"
                      ? "Deleting..."
                      : deleteConfirm === "youtube"
                      ? "Click again to confirm"
                      : "Delete YouTube"}
                  </Button>
                </div>

                {/* Delete Instagram Comments */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium">Instagram Comments</h3>
                    <p className="text-sm text-gray-500">Delete all synced Instagram comments</p>
                  </div>
                  <Button
                    variant={deleteConfirm === "instagram" ? "default" : "outline"}
                    onClick={() => handleDeleteClick("instagram")}
                    disabled={isDeleting}
                    className={deleteConfirm === "instagram" ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    {isDeleting && deleteConfirm === "instagram"
                      ? "Deleting..."
                      : deleteConfirm === "instagram"
                      ? "Click again to confirm"
                      : "Delete Instagram"}
                  </Button>
                </div>

                {/* Delete All Comments */}
                <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-red-800">All Comments</h3>
                    <p className="text-sm text-red-600">Delete all comments from all platforms</p>
                  </div>
                  <Button
                    variant={deleteConfirm === "all" ? "default" : "outline"}
                    onClick={() => handleDeleteClick("all")}
                    disabled={isDeleting}
                    className={
                      deleteConfirm === "all"
                        ? "bg-red-600 hover:bg-red-700"
                        : "border-red-300 text-red-600 hover:bg-red-100"
                    }
                  >
                    {isDeleting && deleteConfirm === "all"
                      ? "Deleting..."
                      : deleteConfirm === "all"
                      ? "Click again to confirm"
                      : "Delete All"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
