import { useState } from "react";
import { useFetcher } from "react-router";
import type { Route } from "./+types/dashboard.settings";
import { Button } from "~/components/ui/button";

export async function loader({ request }: Route.LoaderArgs) {
  // No auth check needed here - handled by layout
  return {};
}

export default function Settings() {
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const deleteFetcher = useFetcher();
  const isDeleting = deleteFetcher.state !== "idle";

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
