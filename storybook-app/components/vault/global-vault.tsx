"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  ImageIcon,
  Type,
  Upload,
  Trash2,
  Copy,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addItem as addVaultItem, deleteItem as deleteVaultItem, setItems as setVaultItems } from "@/store/vaultSlice";

interface VaultItem {
  id: string;
  type: "text" | "image";
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
}

export function GlobalVault() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.vault.items);

  // Hydrate from localStorage once
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("globalContextItems") : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          dispatch(
            setVaultItems(
              parsed.map((it: any) => ({
                ...it,
                createdAt: it.createdAt ?? new Date().toISOString(),
              }))
            )
          );
        }
      }
    } catch (e) {
      console.warn("[Global Context] Failed to load from localStorage", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Persist to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem("globalContextItems", JSON.stringify(items));
    } catch (e) {
      console.warn("[Global Context] Failed to save to localStorage", e);
    }
  }, [items]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    type: "text" as "text" | "image",
    title: "",
    content: "",
    tags: "",
  });

  const { toast } = useToast();

  // Upload support
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (file?: File | null) => {
    if (!file) return;
    try {
      setIsUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      if (!data?.url) throw new Error("No URL returned");

      setNewItem((prev) => ({ ...prev, type: "image", content: data.url }));
      toast({
        title: "Image Uploaded",
        description: "Image URL added to the form.",
      });
    } catch (e: any) {
      console.error("[Vault] Upload error", e);
      toast({
        title: "Upload Failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "text" && item.type === "text") ||
      (activeTab === "images" && item.type === "image");

    return matchesSearch && matchesTab;
  });

  const handleAddItem = () => {
    console.log("[Vault] Add item", newItem);
    if (!newItem.title || !newItem.content) {
      toast({
        title: "Missing Information",
        description: "Please fill in both title and content.",
        variant: "destructive",
      });
      return;
    }

    const item: VaultItem = {
      id: Date.now().toString(),
      type: newItem.type,
      title: newItem.title,
      content: newItem.content,
      tags: newItem.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      createdAt: new Date(),
    };

    // Normalize createdAt to ISO for store
    dispatch(
      addVaultItem({ ...item, createdAt: item.createdAt.toISOString() })
    );
    setNewItem({ type: "text", title: "", content: "", tags: "" });
    setShowAddForm(false);

    toast({
      title: "Item Added",
      description: `${
        item.type === "text" ? "Text" : "Image"
      } added to vault successfully.`,
    });
  };

  const handleDeleteItem = (id: string) => {
    console.log("[Vault] Delete item", { id });
    dispatch(deleteVaultItem(id));
    toast({
      title: "Item Deleted",
      description: "Item removed from vault.",
    });
  };

  const handleCopyContent = (content: string) => {
    console.log("[Vault] Copy content", { length: content.length });
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Content copied to clipboard.",
    });
  };

  return (
    <div className="space-y-6">
      {/* hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Global Context
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Define reusable instructions, styles, characters, and references to
            apply across the whole story. This will be sent as system context on
            generation.
          </p>
        </div>
        <Button
          onClick={() => {
            console.log("[Vault] Toggle add form", { open: !showAddForm });
            setShowAddForm(!showAddForm);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Content
        </Button>
      </div>

      {/* Add New Item Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Content Type</Label>
                <select
                  id="type"
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800"
                  value={newItem.type}
                  onChange={(e) => {
                    console.log("[Vault] Change type", e.target.value);
                    setNewItem({
                      ...newItem,
                      type: e.target.value as "text" | "image",
                    });
                  }}
                >
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                </select>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter title..."
                  value={newItem.title}
                  onChange={(e) => {
                    console.log("[Vault] Change title", e.target.value);
                    setNewItem({ ...newItem, title: e.target.value });
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="content">
                {newItem.type === "text"
                  ? "Text Content"
                  : "Image URL or Upload"}
              </Label>
              {newItem.type === "text" ? (
                <Textarea
                  id="content"
                  placeholder="Enter your text content..."
                  value={newItem.content}
                  onChange={(e) => {
                    console.log("[Vault] Change content", {
                      length: e.target.value.length,
                    });
                    setNewItem({ ...newItem, content: e.target.value });
                  }}
                  rows={4}
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    id="content"
                    placeholder="Enter image URL or upload file..."
                    value={newItem.content}
                    onChange={(e) => {
                      console.log("[Vault] Change image URL", e.target.value);
                      setNewItem({ ...newItem, content: e.target.value });
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                    onClick={handleOpenFilePicker}
                    disabled={isUploading}
                  >
                    <Upload
                      className={`h-4 w-4 ${
                        isUploading ? "animate-pulse" : ""
                      }`}
                    />
                    {isUploading ? "Uploading..." : "Upload Image"}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="fantasy, opening, character..."
                value={newItem.tags}
                onChange={(e) => {
                  console.log("[Vault] Change tags", e.target.value);
                  setNewItem({ ...newItem, tags: e.target.value });
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddItem}>Add to Vault</Button>
              <Button
                variant="outline"
                onClick={() => {
                  console.log("[Vault] Cancel add form");
                  setShowAddForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search vault content..."
            value={searchQuery}
            onChange={(e) => {
              console.log("[Vault] Search", e.target.value);
              setSearchQuery(e.target.value);
            }}
            className="pl-10"
          />
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            console.log("[Vault] Change tab", { from: activeTab, to: val });
            setActiveTab(val);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vault Items */}
      <ScrollArea className="h-[600px]">
        <div className="grid gap-4">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  {searchQuery ? (
                    <Search className="h-12 w-12 mx-auto" />
                  ) : (
                    <ImageIcon className="h-12 w-12 mx-auto" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? "No results found" : "No content in vault"}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Add some text or images to get started"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {item.type === "text" ? (
                          <Type className="h-4 w-4 text-blue-500" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-green-500" />
                        )}
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                      </div>

                      {item.type === "text" ? (
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
                          {item.content}
                        </p>
                      ) : (
                        <div className="w-32 h-20 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                          <img
                            src={item.content || "/placeholder.svg"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyContent(item.content)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
