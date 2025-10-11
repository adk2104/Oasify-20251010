import { useState } from "react";
import type { Route } from "./+types/dashboard";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";

// Mock comment data
const mockComments = [
  {
    id: "1",
    author: "John Doe",
    text: "This is an amazing video! Thanks for sharing.",
    platform: "youtube",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    hasReplied: false,
  },
  {
    id: "2",
    author: "Jane Smith",
    text: "Great content as always! Keep it up!",
    platform: "instagram",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    hasReplied: true,
  },
  {
    id: "3",
    author: "Bob Johnson",
    text: "Could you make a tutorial on this topic?",
    platform: "youtube",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    hasReplied: false,
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  // No auth check needed here - handled by layout
  return { comments: mockComments };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { comments } = loaderData;
  const [globalEmpathMode, setGlobalEmpathMode] = useState(true);

  const unrepliedCount = comments.filter((c) => !c.hasReplied).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-sm text-gray-500">
            {comments.length} comments • {unrepliedCount} unreplied
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="global-empath"
            checked={globalEmpathMode}
            onCheckedChange={setGlobalEmpathMode}
          />
          <Label htmlFor="global-empath" className="text-sm font-medium">
            Global Empath Mode
          </Label>
        </div>
      </div>

      {/* Filters Placeholder */}
      <div className="px-4 pt-4 pb-2 bg-gray-50">
        <p className="text-sm text-gray-500">Filters coming soon...</p>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-4 space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-gray-500 capitalize">
                        {comment.platform}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                  </div>
                  {comment.hasReplied && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Replied
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
