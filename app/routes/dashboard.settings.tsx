import { useState } from "react";
import type { Route } from "./+types/dashboard.settings";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export async function loader({ request }: Route.LoaderArgs) {
  // No auth check needed here - handled by layout
  return {};
}

type Tab = "empath" | "sensitivity" | "profile";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("empath");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(300);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful assistant that generates empathetic responses to social media comments. Focus on understanding the commenter's intent and responding in a warm, authentic way."
  );
  const [strictJsonOutput, setStrictJsonOutput] = useState(true);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-gray-500">
            Configure your AI behavior and content sensitivity rules
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-4">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("empath")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === "empath"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Empath Settings
          </button>
          <button
            onClick={() => setActiveTab("sensitivity")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === "sensitivity"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Sensitivity Rules
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === "profile"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Profile
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === "empath" && (
            <div className="space-y-6">
              {/* AI Behavior Controls */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-6">AI Behavior Controls</h2>

                <div className="space-y-6">
                  {/* Temperature */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="temperature">Temperature</Label>
                      <span className="text-sm text-gray-500">{temperature}</span>
                    </div>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <p className="text-xs text-gray-500">
                      Controls randomness: Lower is more focused, higher is more creative
                    </p>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      placeholder="300"
                    />
                    <p className="text-xs text-gray-500">
                      Maximum length of generated responses
                    </p>
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">System Prompt</Label>
                    <Textarea
                      id="systemPrompt"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={4}
                      placeholder="Enter your system prompt..."
                    />
                    <p className="text-xs text-gray-500">
                      Instructions that guide the AI's behavior and tone
                    </p>
                  </div>

                  {/* Strict JSON Output */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="strictJson">Strict JSON Output</Label>
                      <p className="text-xs text-gray-500">
                        Ensure responses are valid JSON format
                      </p>
                    </div>
                    <Switch
                      id="strictJson"
                      checked={strictJsonOutput}
                      onCheckedChange={setStrictJsonOutput}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                  <Button variant="default">Save Settings</Button>
                  <Button variant="outline">Test Configuration</Button>
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Preview</h2>
                <p className="text-sm text-gray-500">
                  Test your AI settings by entering a sample comment and seeing the generated response.
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-400 italic">
                    Preview functionality coming soon...
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sensitivity" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Sensitivity Rules</h2>
              <p className="text-gray-600">
                Configure content filters and sensitivity detection rules.
              </p>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Profile</h2>
              <p className="text-gray-600">
                Manage your account profile and preferences.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
