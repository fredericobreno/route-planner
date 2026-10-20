"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const SignOutButton = () => {
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      const response = await fetch("/api/session", { method: "DELETE" });
      if (!response.ok) throw new Error(`Sign out failed: ${response.status}`);
      window.location.assign("/login");
    } catch (signOutError) {
      console.error(signOutError);
      setError("Não foi possível sair.");
    }
  };

  return (
    <>
      <Button variant="ghost" className="w-full" onClick={handleClick}>
        <LogOut />
        Sair
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default SignOutButton;
