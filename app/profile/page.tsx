"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readIntegrationResponse, api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

type ProfileForm = {
  full_name: string;
  display_name: string;
  phone: string;
  avatar_url: string;
  bio: string;
};

const defaultProfile: ProfileForm = {
  full_name: "",
  display_name: "",
  phone: "",
  avatar_url: "",
  bio: "",
};

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProfileForm>(defaultProfile);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    if (!user) {
      setFormState(defaultProfile);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await api
        .from("profiles")
        .select("full_name, display_name, phone, avatar_url, bio")
        .eq("id", user.id)
        .single();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data) {
        setFormState({
          full_name: data.full_name ?? "",
          display_name: data.display_name ?? "",
          phone: data.phone ?? "",
          avatar_url: data.avatar_url ?? "",
          bio: data.bio ?? "",
        });
      }
    };

    fetchProfile();
  }, [user]);

  const updateField =
    (field: keyof ProfileForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
      setStatus("idle");
    };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setStatus("saving");

    const { error } = await api
      .from("profiles")
      .update({
        full_name: formState.full_name,
        display_name: formState.display_name,
        phone: formState.phone,
        bio: formState.bio,
      })
      .eq("id", user.id);

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }

    setStatus("saved");
  };

  const changeAvatar = async (file?: File) => {
    if (!user) return;
    if (file && file.size > 2 * 1024 * 1024) { setErrorMessage("Choose an image smaller than 2 MB."); return; }
    setAvatarBusy(true);
    setErrorMessage(null);
    try {
      const body = new FormData();
      if (file) body.set("file", file);
      const response = await fetch("/api/profile/avatar", { method: file ? "POST" : "DELETE", body: file ? body : undefined });
      const result = await readIntegrationResponse(response);
      if (!response.ok) throw new Error(result.error || "Unable to update avatar.");
      setFormState((current) => ({ ...current, avatar_url: result.avatar_url || "" }));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Unable to update avatar."); }
    finally { setAvatarBusy(false); }
  };

  return (
    <div className="flex-1 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-3xl items-center px-6 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Manage your personal details and contact info.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={formState.full_name}
                    onChange={updateField("full_name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={formState.display_name}
                    onChange={updateField("display_name")}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formState.phone}
                    onChange={updateField("phone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Profile avatar</Label>
                  {formState.avatar_url && <img src={formState.avatar_url} alt="Your profile avatar" className="h-16 w-16 rounded-full object-cover" />}
                  <Input id="avatar" type="file" accept="image/png,image/jpeg,image/webp" disabled={avatarBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void changeAvatar(file); event.target.value = ""; }} />
                  <p className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2 MB.</p>
                  {formState.avatar_url && <Button type="button" variant="outline" disabled={avatarBusy} onClick={() => changeAvatar()}>Remove avatar</Button>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={formState.bio}
                  onChange={updateField("bio")}
                />
              </div>
              {errorMessage && status !== "error" && <p role="alert" className="text-xs text-destructive">{errorMessage}</p>}
              {status === "error" ? (
                <p className="text-xs text-destructive">
                  {errorMessage || "Unable to save profile changes."}
                </p>
              ) : null}
              {status === "saved" ? (
                <p className="text-xs text-emerald-600">Profile updated.</p>
              ) : null}
              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Saving..." : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
