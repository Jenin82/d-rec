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
import { supabase } from "@/lib/supabase/client";
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
  const [formState, setFormState] = useState<ProfileForm>(defaultProfile);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, display_name, phone, avatar_url, bio")
        .eq("id", user.id)
        .single();

      if (error) {
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

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formState.full_name,
        display_name: formState.display_name,
        phone: formState.phone,
        avatar_url: formState.avatar_url,
        bio: formState.bio,
      })
      .eq("id", user.id);

    if (error) {
      setStatus("error");
      return;
    }

    setStatus("saved");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,oklch(0.98_0.03_160),transparent_60%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
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
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input
                    id="avatar"
                    value={formState.avatar_url}
                    onChange={updateField("avatar_url")}
                  />
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
              {status === "error" ? (
                <p className="text-xs text-destructive">
                  Unable to save profile changes.
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
